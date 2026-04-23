import uuid
from typing import Optional, List
from urllib.parse import urlparse
import fnmatch
import logging

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.models.channel import Channel, ChannelType
from app.models.workspace import Workspace
from app.models.ticket import Ticket
from app.core import security
from app.services.identity_service import IdentityService, ComplianceLayer
import datetime

router = APIRouter(prefix="/api/v1/widget", tags=["Widget"])

async def verify_widget_origin(workspace: Workspace, request: Request):
    """
    Validates the Origin header against the workspace's allowed_domains.
    If no domains are listed, all origins are currently allowed (default).
    """
    if not workspace.allowed_domains:
        return
        
    origin = request.headers.get("Origin") or request.headers.get("Referer", "")
    if not origin:
        # If no origin/referer, we might want to block in production
        # For now, we allow it (e.g. direct browser access to config)
        return
        
    try:
        # Parse the domain from the origin or referer
        parsed = urlparse(origin)
        domain = parsed.netloc or parsed.path.split("/")[0] # fallback for some referer formats
        
        if not domain:
            return

        # Allow exact match or port-stripped match
        base_domain = domain.split(":")[0]
        
        allowed = False
        for pattern in workspace.allowed_domains:
            # Clean the pattern: strip protocol and trailing slash/paths
            clean_pattern = pattern
            if "://" in pattern:
                clean_pattern = urlparse(pattern).netloc
            elif "/" in pattern:
                clean_pattern = pattern.split("/")[0]

            # Support exact match or wildcard (e.g. *.example.com)
            if fnmatch.fnmatch(domain, clean_pattern) or fnmatch.fnmatch(base_domain, clean_pattern):
                allowed = True
                break
        
        if not allowed:
            logger.warning(f"Widget Origin Denied: {domain} not in {workspace.allowed_domains}")
            raise HTTPException(status_code=403, detail=f"Origin {domain} not allowed.")
            
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        logger.error(f"Error validating origin {origin}: {e}")
        raise HTTPException(status_code=403, detail="Invalid Origin or Referer header.")

@router.get("/config")
async def get_widget_config(
    workspace_key: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the widget configuration for a specific workspace.
    Lookup is done by the public 'workspace_key'.
    """
    # 1. Resolve Workspace & Validate Origin
    result = await db.execute(select(Workspace).where(Workspace.public_key == workspace_key))
    workspace = result.scalar_one_or_none()
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Invalid workspace key.")
        
    await verify_widget_origin(workspace, request)

    # 2. Resolve Widget Channel Config
    result = await db.execute(
        select(Channel).where(
            Channel.workspace_id == workspace.id,
            Channel.type == ChannelType.WIDGET,
            Channel.is_active == True
        )
    )
    channel = result.scalars().first()
    
    # Defaults if no channel exists yet
    config = {
        "workspace_id": str(workspace.id),
        "workspace_key": workspace.public_key,
        "display_name": workspace.name,
        "logo_url": None,
        "primary_color": "#3b82f6",
        "greeting": "Hi! How can we help?",
        "theme": "light",
        "is_online": True, # Placeholder
        "allowed_domains": workspace.allowed_domains,
        "require_identity_pre_chat": False
    }
    
    if channel and channel.config:
        c = channel.config
        config.update({
            "display_name": c.get("settings", {}).get("title", workspace.name),
            "logo_url": c.get("settings", {}).get("logo_url"),
            "primary_color": c.get("primary_color", "#3b82f6"),
            "greeting": c.get("settings", {}).get("welcome_message", "Hi! How can we help?"),
            "theme": c.get("theme", "light"),
            "require_identity_pre_chat": c.get("require_identity_pre_chat", False),
        })
        
    return config

from app.schemas.widget import WidgetConversationCreate, WidgetConversationResponse, WidgetTokenRefresh, WidgetStateResponse
from app.services.routing_service import routing_service
from app.models.conversation import Conversation
from app.models.message import Message
import datetime

async def get_valid_secret_keys(workspace: Workspace) -> tuple[str, Optional[str]]:
    """Returns the current and valid previous secret key for fallback."""
    current_key = security.decrypt_secret_key(workspace.encrypted_secret_key)
    previous_key = None
    if workspace.encrypted_previous_secret_key and workspace.previous_key_expires_at:
        if datetime.datetime.now(datetime.timezone.utc) < workspace.previous_key_expires_at:
            previous_key = security.decrypt_secret_key(workspace.encrypted_previous_secret_key)
    return current_key, previous_key

@router.post("/conversations", response_model=WidgetConversationResponse)
async def create_widget_conversation(
    payload: WidgetConversationCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Initializes or resumes a widget conversation.
    Returns the conversation ID and a short-lived WS authentication token.
    """
    # 1. Resolve Workspace
    result = await db.execute(select(Workspace).where(Workspace.public_key == payload.workspace_key))
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Invalid workspace key.")
        
    await verify_widget_origin(workspace, request)
    current_key, previous_key = await get_valid_secret_keys(workspace)

    # 2. Resolve Contact Identity
    external_id = payload.visitor_id
    contact_name = None
    
    if payload.user_token:
        # Verify customer-signed token (with fallback)
        user_data = security.verify_widget_token(payload.user_token, current_key, previous_key)
        if not user_data:
             raise HTTPException(status_code=401, detail="Invalid user token.")
        external_id = user_data.get("user_id") or user_data.get("sub")
        contact_name = user_data.get("name") or user_data.get("email")

    if not external_id:
        raise HTTPException(status_code=400, detail="visitor_id or user_token required.")

    # 3. Get/Create Conversation using RoutingService
    result = await db.execute(
        select(Channel).where(
            Channel.workspace_id == workspace.id,
            Channel.type == ChannelType.WIDGET
        )
    )
    channel = result.scalars().first()
    if not channel:
         # Auto-create widget channel if missing
         channel = Channel(workspace_id=workspace.id, type=ChannelType.WIDGET, name="Website Chat", is_active=True)
         db.add(channel)
         await db.flush()

    _, conversation = await routing_service.route_incoming_message(
        db=db,
        channel=channel,
        external_contact_id=external_id,
        contact_name=contact_name,
        message_text="",
        message_type="system"
    )
    
    # Update Session & Identity Tracking
    if payload.visitor_id:
        conversation.visitor_id = payload.visitor_id
    if payload.session_id:
        conversation.session_id = payload.session_id
        
    # Process & Store Metadata (Compliance Layer)
    if payload.metadata:
        processed_meta = ComplianceLayer.filter_metadata(payload.metadata, consent_given=payload.consent_given)
        if not conversation.meta_data:
            conversation.meta_data = {}
        conversation.meta_data.update(processed_meta)
        
        # Track session activity
        identity_svc = IdentityService(db)
        await identity_svc.track_session_activity(
            workspace_id=workspace.id,
            visitor_id=payload.visitor_id,
            session_id=payload.session_id,
            metadata=processed_meta,
            contact_id=conversation.contact_id
        )

    await db.commit()

    # 4. Generate short-lived WS Token
    # Valid for 20 minutes
    expiry_mins = 20
    ws_token = security.create_widget_token(str(conversation.id), current_key, expires_in_minutes=expiry_mins)
    expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=expiry_mins)

    # 5. Fetch Message History
    history_res = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(desc(Message.created_at))
        .limit(50)
    )
    history = history_res.scalars().all()
    # Reverse to get chronological order for the UI
    history.reverse()

    messages_data = [
        {
            "id": str(m.id),
            "sender_type": m.sender_type,
            "body": m.body,
            "message_type": m.message_type,
            "media_url": m.media_url,
            "created_at": m.created_at.isoformat()
        }
        for m in history
    ]

    # 6. Check for associated Ticket
    res = await db.execute(
        select(Ticket.id, Ticket.status)
        .where(Ticket.conversation_id == conversation.id)
        .order_by(desc(Ticket.created_at))
    )
    ticket_data = res.first()
    ticket_id = ticket_data.id if ticket_data else None
    ticket_status = ticket_data.status if ticket_data else None

    return {
        "conversation_id": conversation.id,
        "ws_token": ws_token,
        "expires_at": expires_at,
        "messages": messages_data,
        "ticket_id": ticket_id,
        "ticket_status": ticket_status
    }

@router.post("/conversations/{conversation_id}/refresh", response_model=WidgetConversationResponse)
async def refresh_widget_token(
    conversation_id: uuid.UUID,
    payload: WidgetTokenRefresh,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Substitutes an expiring token with a fresh one.
    Silent refresh protocol.
    """
    # 1. Load Conversation and Workspace
    result = await db.execute(
        select(Conversation, Workspace)
        .join(Workspace, Conversation.workspace_id == Workspace.id)
        .where(Conversation.id == conversation_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    
    conversation, workspace = row
    await verify_widget_origin(workspace, request)
    current_key, previous_key = await get_valid_secret_keys(workspace)

    # 2. Verify current token (with fallback)
    # Lenient on EXPIRY but strict on SIGNATURE
    try:
        from jose import jwt
        # Try current key first
        try:
            token_data = jwt.decode(payload.current_token, current_key, algorithms=["HS256"], options={"verify_exp": False})
        except:
            # Fallback to previous
            if previous_key:
                token_data = jwt.decode(payload.current_token, previous_key, algorithms=["HS256"], options={"verify_exp": False})
            else:
                raise
    except:
        raise HTTPException(status_code=401, detail="Invalid refresh token.")

    if token_data.get("sub") != str(conversation_id):
        raise HTTPException(status_code=401, detail="Token mismatch.")

    # 3. Generate new token (always sign with current_key)
    expiry_mins = 20
    new_token = security.create_widget_token(str(conversation_id), current_key, expires_in_minutes=expiry_mins)
    expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=expiry_mins)

    # 4. Check for associated Ticket
    res = await db.execute(
        select(Ticket.id, Ticket.status)
        .where(Ticket.conversation_id == conversation_id)
        .order_by(desc(Ticket.created_at))
    )
    ticket_data = res.first()
    ticket_id = ticket_data.id if ticket_data else None
    ticket_status = ticket_data.status if ticket_data else None

    return {
        "conversation_id": conversation_id,
        "ws_token": new_token,
        "expires_at": expires_at,
        "ticket_id": ticket_id,
        "ticket_status": ticket_status,
        "routing_mode": await routing_service.calculate_routing_mode(db, conversation),
        "identified": conversation.identified or (conversation.contact and conversation.contact.email is not None)
    }

@router.get("/{workspace_id}/config")
async def get_widget_config_internal(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """Internal dashboard endpoint to fetch widget settings."""
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    if not workspace.public_key:
        from app.core import security
        import datetime
        pub, secret = security.generate_workspace_keys()
        workspace.public_key = pub
        workspace.encrypted_secret_key = security.encrypt_secret_key(secret)
        workspace.secret_key_created_at = datetime.datetime.now(datetime.timezone.utc)
        db.add(workspace)
        await db.commit()
        await db.refresh(workspace)

    result = await db.execute(
        select(Channel).where(
            Channel.workspace_id == workspace_id,
            Channel.type == ChannelType.WIDGET
        )
    )
    channel = result.scalars().first()
    
    config = {
        "workspace_id": str(workspace_id),
        "workspace_key": workspace.public_key,
        "display_name": workspace.name,
        "primary_color": "#3b82f6",
        "theme": "dark",
        "allowed_domains": workspace.allowed_domains,
        "settings": {}
    }

    if channel and channel.config:
        config.update(channel.config)
        # Ensure workspace_key is always present for the dashboard script snippet
        config["workspace_key"] = workspace.public_key
        
    return config

@router.post("/{workspace_id}/config")
async def save_widget_config(
    workspace_id: uuid.UUID,
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    """Internal dashboard endpoint to save widget settings."""
    # Save allowed_domains to the Workspace directly
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one_or_none()
    if workspace:
        workspace.allowed_domains = data.get("allowed_domains", [])
        db.add(workspace)

    result = await db.execute(
        select(Channel).where(
            Channel.workspace_id == workspace_id,
            Channel.type == ChannelType.WIDGET
        )
    )
    channel = result.scalars().first()

    if not channel:
        channel = Channel(
            workspace_id=workspace_id,
            type=ChannelType.WIDGET,
            name="Chat Widget",
            is_active=True
        )
        db.add(channel)

    channel.config = data
    await db.commit()
    return {"status": "success"}

@router.get("/conversations/{conversation_id}/state", response_model=WidgetStateResponse)
async def get_widget_conversation_state(
    conversation_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Restores the offline collection state for page refreshes.
    """
    result = await db.execute(
        select(Conversation, Workspace)
        .join(Workspace, Conversation.workspace_id == Workspace.id)
        .where(Conversation.id == conversation_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    
    conversation, workspace = row
    await verify_widget_origin(workspace, request)
    
    meta = conversation.meta_data or {}
    return {
        "offline_state": meta.get("offline_state"),
        "collected": {
            "name": meta.get("visitor_name"),
            "email": meta.get("visitor_email")
        }
    }


# ── Conversation History (Home Screen) ──

from app.schemas.widget import WidgetConversationHistoryItem, WidgetRatingCreate
from app.models.contact import Contact
from sqlalchemy import func as sa_func

@router.get("/conversations/history")
async def get_widget_conversation_history(
    workspace_key: str,
    visitor_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns past conversations for this visitor to populate the Home Screen.
    Also returns the workspace session_timeout_hours for the frontend 24hr logic.
    """
    # 1. Resolve Workspace
    result = await db.execute(select(Workspace).where(Workspace.public_key == workspace_key))
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Invalid workspace key.")
    
    await verify_widget_origin(workspace, request)

    # 2. Find Contact by visitor_id
    from sqlalchemy import cast, String as SAString
    result = await db.execute(
        select(Contact).where(
            Contact.workspace_id == workspace.id,
            sa_func.json_extract_path_text(Contact.channel_data, "widget_id") == visitor_id
        )
    )
    contact = result.scalars().first()
    
    if not contact:
        return {"conversations": [], "session_timeout_hours": workspace.session_timeout_hours}

    # 3. Fetch conversations for this contact that HAVE at least one message
    result = await db.execute(
        select(Conversation)
        .where(
            Conversation.workspace_id == workspace.id,
            Conversation.contact_id == contact.id,
            Conversation.messages.any() # Filter: Must have messages
        )
        .order_by(desc(Conversation.updated_at))
        .limit(10)
    )
    conversations = result.scalars().all()

    # 4. Build response with last message preview
    history = []
    for conv in conversations:
        # Get last message
        msg_result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conv.id)
            .order_by(desc(Message.created_at))
            .limit(1)
        )
        last_msg = msg_result.scalars().first()
        if not last_msg:
            continue # Extra safety, though any() should have caught it
        
        # Check for active ticket
        ticket_result = await db.execute(
            select(Ticket.id, Ticket.status)
            .where(Ticket.conversation_id == conv.id)
            .order_by(desc(Ticket.created_at))
            .limit(1)
        )
        ticket_row = ticket_result.first()
        has_active_ticket = bool(ticket_row and ticket_row.status not in ("resolved", "closed"))
        
        history.append({
            "conversation_id": str(conv.id),
            "last_message": last_msg.body[:100] if last_msg else None,
            "last_message_at": last_msg.created_at.isoformat() if last_msg else conv.updated_at.isoformat(),
            "status": conv.status,
            "has_active_ticket": has_active_ticket,
            "updated_at": conv.updated_at.isoformat()
        })
    
    return {
        "conversations": history,
        "session_timeout_hours": workspace.session_timeout_hours
    }


@router.post("/conversations/new", response_model=WidgetConversationResponse)
async def create_new_widget_conversation(
    payload: WidgetConversationCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Forces creation of a NEW conversation (closes any existing open one).
    Used by the 'Start a new chat' button on the Home Screen.
    """
    # 1. Resolve Workspace
    result = await db.execute(select(Workspace).where(Workspace.public_key == payload.workspace_key))
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Invalid workspace key.")
    
    await verify_widget_origin(workspace, request)
    current_key, previous_key = await get_valid_secret_keys(workspace)

    # 2. Resolve Contact
    external_id = payload.visitor_id
    contact_name = None
    
    if payload.user_token:
        user_data = security.verify_widget_token(payload.user_token, current_key, previous_key)
        if not user_data:
            raise HTTPException(status_code=401, detail="Invalid user token.")
        external_id = user_data.get("user_id") or user_data.get("sub")
        contact_name = user_data.get("name") or user_data.get("email")

    if not external_id:
        raise HTTPException(status_code=400, detail="visitor_id or user_token required.")

    # 3. Find or Create Contact
    result = await db.execute(
        select(Contact).where(
            Contact.workspace_id == workspace.id,
            sa_func.json_extract_path_text(Contact.channel_data, "widget_id") == external_id
        )
    )
    contact = result.scalars().first()

    # Ensure contact exists or is updated with new form info
    if not contact:
        new_name = payload.contact_name or contact_name or "Visitor"
        contact = Contact(
            name=new_name,
            email=payload.contact_email,
            workspace_id=workspace.id,
            channel_data={"widget_id": external_id}
        )
        db.add(contact)
        await db.flush()
    else:
        # Update existing contact if form gives us info
        updated = False
        if payload.contact_email and contact.email != payload.contact_email:
            contact.email = payload.contact_email
            updated = True
        if payload.contact_name and contact.name != payload.contact_name:
            contact.name = payload.contact_name
            updated = True
        if updated:
            db.add(contact)
            await db.flush()

    # Get or create Widget Channel
    result = await db.execute(
        select(Channel).where(
            Channel.workspace_id == workspace.id,
            Channel.type == ChannelType.WIDGET
        )
    )
    channel = result.scalars().first()
    if not channel:
        channel = Channel(workspace_id=workspace.id, type=ChannelType.WIDGET, name="Website Chat", is_active=True)
        db.add(channel)
        await db.flush()

    # 4. Close existing conversations, but check if we can reuse an existing empty open one first
    reusable_conv = None
    if contact:
        # Find an OPEN conversation with ZERO messages
        result = await db.execute(
            select(Conversation)
            .where(
                Conversation.workspace_id == workspace.id,
                Conversation.contact_id == contact.id,
                Conversation.status == "open",
                ~Conversation.messages.any() # Empty!
            )
            .order_by(desc(Conversation.created_at))
            .limit(1)
        )
        reusable_conv = result.scalar_one_or_none()

        # Close all other open conversations
        result = await db.execute(
            select(Conversation)
            .where(
                Conversation.workspace_id == workspace.id,
                Conversation.contact_id == contact.id,
                Conversation.status == "open",
                Conversation.id != (reusable_conv.id if reusable_conv else None)
            )
        )
        open_convos = result.scalars().all()
        for conv in open_convos:
            conv.status = "closed"
            conv.closed_at = datetime.datetime.now(datetime.timezone.utc)
            db.add(conv)

    # 5. Create fresh conversation or reuse empty one
    is_identified = True if (payload.contact_email or contact.email) else False
    
    if reusable_conv:
        new_conv = reusable_conv
        new_conv.updated_at = datetime.datetime.now(datetime.timezone.utc)
        new_conv.identified = is_identified
        db.add(new_conv)
    else:        
        # Create a brand new conversation
        new_conv = Conversation(
            workspace_id=workspace.id,
            contact_id=contact.id,
            status="open",
            identified=is_identified
        )
        db.add(new_conv)
        await db.flush()

    # Handle Initial Message if provided (ALWAY CHECK FOR THIS)
    if payload.initial_message:
        from app.models.message import Message
        first_msg = Message(
            conversation_id=new_conv.id,
            sender_type="customer",
            body=payload.initial_message,
            channel_id=channel.id if 'channel' in locals() and channel else None
        )
        db.add(first_msg)
        await db.flush()
        
        # Use Message Hooks to trigger AI/Rules
        from app.services.message_hooks import on_message_received
        await on_message_received(db, first_msg)
        
        # Commit DB first so it is available for pulling from dashboard
        await db.commit()
        
        # Broadcast to dashboard so the conversation appears instantly
        from app.core.pubsub import pubsub_manager
        await pubsub_manager.publish(f"ws:{workspace.id}", {
            "type": "message.new",
            "conversation_id": str(new_conv.id),
            "workspace_id": str(workspace.id),
            "message": {
                "id": str(first_msg.id),
                "body": first_msg.body,
                "sender_type": "customer",
                "created_at": first_msg.created_at.isoformat(),
                "client_id": "initial"
            }
        })
        
        # Re-attach to session after commit if needed
        await db.refresh(new_conv)
    
    # Update Session & Identity Tracking
    new_conv.visitor_id = payload.visitor_id
    new_conv.session_id = payload.session_id
    
    # Process & Store Metadata (Compliance Layer)
    if payload.metadata:
        processed_meta = ComplianceLayer.filter_metadata(payload.metadata, consent_given=payload.consent_given)
        new_conv.meta_data = processed_meta
        
        # Track session activity
        identity_svc = IdentityService(db)
        await identity_svc.track_session_activity(
            workspace_id=workspace.id,
            visitor_id=payload.visitor_id,
            session_id=payload.session_id,
            metadata=processed_meta,
            contact_id=contact.id
        )

    await db.flush()
    await db.refresh(new_conv)

    # 6. Fetch all messages (including the initial one) BEFORE commit
    from app.models.message import Message
    result = await db.execute(select(Message).where(Message.conversation_id == new_conv.id).order_by(Message.created_at))
    messages = result.scalars().all()
    msg_list = [
        {
            "id": str(m.id),
            "sender_type": m.sender_type,
            "body": m.body,
            "message_type": m.message_type,
            "media_url": m.media_url,
            "created_at": m.created_at.isoformat()
        } for m in messages
    ]

    await db.commit()

    # 7. Generate WS Token
    expiry_mins = 20
    ws_token = security.create_widget_token(str(new_conv.id), current_key, expires_in_minutes=expiry_mins)
    expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=expiry_mins)

    return {
        "conversation_id": new_conv.id,
        "ws_token": ws_token,
        "expires_at": expires_at,
        "messages": msg_list,
        "ticket_id": None
    }


# ── Rating Submission ──

from fastapi import File, UploadFile
import os

@router.post("/uploads")
async def widget_upload_file(
    workspace_key: str,
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Public upload endpoint for the widget.
    Validates origin via workspace_key.
    """
    # 1. Resolve Workspace & Validate Origin
    result = await db.execute(select(Workspace).where(Workspace.public_key == workspace_key))
    workspace = result.scalar_one_or_none()
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Invalid workspace key.")
        
    await verify_widget_origin(workspace, request)

    # 2. Save File
    from app.core.config import get_settings
    settings = get_settings()
    upload_dir = "/app/uploads"
    
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir, exist_ok=True)
        
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    local_path = os.path.join(upload_dir, filename)
    
    try:
        with open(local_path, "wb") as f:
            f.write(await file.read())
            
        return {
            "url": f"{settings.BASE_URL}/uploads/{filename}",
            "filename": filename,
            "original_name": file.filename
        }
    except Exception as e:
        logger.error(f"Widget upload failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload file.")

@router.post("/rating")
async def submit_widget_rating(
    payload: WidgetRatingCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Submit a customer rating from the widget after a conversation ends.
    Supports rating both human agents and AI.
    """
    from app.models.rating import Rating

    # 1. Validate score
    if payload.score < 1 or payload.score > 5:
        raise HTTPException(status_code=400, detail="Score must be between 1 and 5.")

    # 2. Validate conversation exists and get workspace
    result = await db.execute(
        select(Conversation, Workspace)
        .join(Workspace, Conversation.workspace_id == Workspace.id)
        .where(Conversation.id == payload.conversation_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    
    conversation, workspace = row
    await verify_widget_origin(workspace, request)

    # 3. Prevent duplicate ratings for the same conversation
    existing = await db.execute(
        select(Rating).where(Rating.conversation_id == payload.conversation_id)
    )
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail="Rating already submitted for this conversation.")

    # 4. Sanitize comment (strip HTML tags)
    import re
    clean_comment = None
    if payload.comment:
        clean_comment = re.sub(r'<[^>]+>', '', payload.comment)[:500]  # Strip tags, limit length

    # 5. Create Rating
    rating = Rating(
        conversation_id=payload.conversation_id,
        ticket_id=payload.ticket_id,
        agent_id=payload.agent_id,
        workspace_id=workspace.id,
        rated_entity_type=payload.rated_entity_type,
        score=payload.score,
        comment=clean_comment
    )
    db.add(rating)
    await db.commit()

    return {"status": "success", "rating_id": str(rating.id)}
