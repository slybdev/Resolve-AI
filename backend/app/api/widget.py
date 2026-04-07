import uuid
from typing import Optional, List
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.models.channel import Channel, ChannelType
from app.models.workspace import Workspace
from app.models.ticket import Ticket
from app.core import security

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
        return
        
    try:
        domain = urlparse(origin).netloc
        # Allow exact match or base domain match (stripping port)
        base_domain = domain.split(":")[0]
        if domain not in workspace.allowed_domains and base_domain not in workspace.allowed_domains:
            raise HTTPException(status_code=403, detail=f"Origin {domain} not allowed.")
    except Exception as e:
        if isinstance(e, HTTPException): raise e
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
        "allowed_domains": workspace.allowed_domains
    }
    
    if channel and channel.config:
        c = channel.config
        config.update({
            "display_name": c.get("settings", {}).get("title", workspace.name),
            "logo_url": c.get("settings", {}).get("logo_url"),
            "primary_color": c.get("primary_color", "#3b82f6"),
            "greeting": c.get("settings", {}).get("welcome_message", "Hi! How can we help?"),
            "theme": c.get("theme", "light"),
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
            "created_at": m.created_at.isoformat()
        }
        for m in history
    ]

    # 6. Check for associated Ticket
    result = await db.execute(
        select(Ticket.id)
        .where(Ticket.conversation_id == conversation.id)
        .order_by(desc(Ticket.created_at))
    )
    ticket_id = result.scalars().first()

    return {
        "conversation_id": conversation.id,
        "ws_token": ws_token,
        "expires_at": expires_at,
        "messages": messages_data,
        "ticket_id": ticket_id
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
    result = await db.execute(
        select(Ticket.id)
        .where(Ticket.conversation_id == conversation_id)
        .order_by(desc(Ticket.created_at))
    )
    ticket_id = result.scalars().first()

    return {
        "conversation_id": conversation_id,
        "ws_token": new_token,
        "expires_at": expires_at,
        "ticket_id": ticket_id
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
