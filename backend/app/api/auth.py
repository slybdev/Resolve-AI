"""
Auth API routes — /api/v1/auth
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    OAuthRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    UserAdminResponse,
    ActivityItem,
)
from app.services import auth_service
from app.services import invite_service
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.workspace import Workspace

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user with email and password."""
    try:
        user, tokens = await auth_service.register(
            db, email=body.email, password=body.password, full_name=body.full_name
        )
        # If an invite_token was provided, accept it atomically after registration
        if body.invite_token:
            try:
                await invite_service.accept_invite(db, token=body.invite_token, user=user)
            except invite_service.InviteError:
                pass  # Don't fail registration if invite acceptance fails
        return AuthResponse(
            user=UserResponse.model_validate(user),
            tokens=TokenResponse(**tokens),
        )
    except auth_service.AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate with email and password."""
    try:
        user, tokens = await auth_service.login(
            db, email=body.email, password=body.password
        )
        return AuthResponse(
            user=UserResponse.model_validate(user),
            tokens=TokenResponse(**tokens),
        )
    except auth_service.AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


@router.post("/oauth/{provider}", response_model=AuthResponse)
async def oauth_login(
    provider: str, body: OAuthRequest, db: AsyncSession = Depends(get_db)
):
    """Login or register via OAuth provider (google, microsoft).

    The frontend sends the OAuth access_token obtained from the provider.
    In production this would verify the token with the provider's API.
    """
    # In production: validate the token with the provider and extract user info.
    # For now, we accept the token and provider info directly.
    try:
        user, tokens = await auth_service.oauth_login(
            db,
            provider=provider,
            oauth_id=body.access_token[:32],  # placeholder: use provider API in prod
            email=f"{body.access_token[:8]}@oauth.placeholder",
            full_name="OAuth User",
        )
        return AuthResponse(
            user=UserResponse.model_validate(user),
            tokens=TokenResponse(**tokens),
        )
    except auth_service.AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Exchange a refresh token for a new access + refresh token pair."""
    try:
        tokens = await auth_service.refresh(db, refresh_token_str=body.refresh_token)
        return TokenResponse(**tokens)
    except auth_service.AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return current_user


@router.get("/users", response_model=list[UserAdminResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all users (Super Admin only)."""
    if current_user.email != "silasbinitie54@gmail.com":
        raise HTTPException(status_code=403, detail="Forbidden")
    
    users = await auth_service.list_all_users(db)
    
    # We need to return the UserAdminResponse list
    results = []
    for u in users:
        # Check owned workspaces first
        ws = u.owned_workspaces[0] if u.owned_workspaces else None
        
        # If no owned workspace, check memberships (for invited users)
        if not ws and u.memberships:
            ws = u.memberships[0].workspace
            
        # Synthesize timeline
        timeline = []
        timeline.append(ActivityItem(action="Account created", timestamp=u.created_at, icon_type="user"))
        
        for w in u.owned_workspaces:
            timeline.append(ActivityItem(action=f"Created workspace '{w.name}'", timestamp=w.created_at, icon_type="arrow"))
            
        for mem in u.memberships:
            if mem.workspace and (not u.owned_workspaces or mem.workspace_id not in [own.id for own in u.owned_workspaces]):
                timeline.append(ActivityItem(action=f"Joined workspace '{mem.workspace.name}'", timestamp=mem.created_at, icon_type="user"))
        
        timeline.sort(key=lambda x: x.timestamp, reverse=True)
            
        results.append(UserAdminResponse(
            **UserResponse.model_validate(u).model_dump(),
            workspace_name=ws.name if ws else "No Workspace",
            plan=ws.plan.capitalize() if ws else "None",
            total_value=0.0,
            location="Remote",
            activity_timeline=timeline
        ))
    return results


@router.post("/users/{user_id}/message")
async def send_user_message(
    user_id: uuid.UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a direct system message to a user (Super Admin only)."""
    if current_user.email != "silasbinitie54@gmail.com":
        raise HTTPException(status_code=403, detail="Forbidden")
    
    # 1. Find the target user
    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # 2. Find a workspace to put the conversation in (prefer their owned one)
    ws = target_user.owned_workspaces[0] if target_user.owned_workspaces else None
    if not ws and target_user.memberships:
        ws = target_user.memberships[0].workspace
        
    if not ws:
        raise HTTPException(status_code=400, detail="User has no associated workspace")
        
    # 3. Find or Create a Contact for this user in that workspace
    from app.models.contact import Contact
    contact_res = await db.execute(
        select(Contact).where(Contact.workspace_id == ws.id, Contact.email == target_user.email)
    )
    contact = contact_res.scalar_one_or_none()
    
    if not contact:
        contact = Contact(
            workspace_id=ws.id,
            email=target_user.email,
            name=target_user.full_name or "User",
            consent_given=True
        )
        db.add(contact)
        await db.flush()

    # 4. Find or Create a system conversation
    conv_res = await db.execute(
        select(Conversation).where(
            Conversation.workspace_id == ws.id,
            Conversation.contact_id == contact.id,
            Conversation.primary_channel == "system"
        ).order_by(Conversation.created_at.desc())
    )
    conversation = conv_res.scalars().first()

    if not conversation:
        conversation = Conversation(
            workspace_id=ws.id,
            contact_id=contact.id,
            status="open",
            priority="high",
            primary_channel="system",
            identified=True,
            meta_data={
                "is_system": True, 
                "system_tag": "Xentral Desk",
                "admin_sender": current_user.full_name
            }
        )
        db.add(conversation)
        await db.flush()
    else:
        # Re-open if closed
        conversation.status = "open"
        conversation.updated_at = sa.func.now()
    
    # 4. Add the message
    message = Message(
        conversation_id=conversation.id,
        sender_id=current_user.id,
        sender_type="system",
        body=body.get("message", "Hello from Xentral Desk!"),
        metadata_json={"system_tag": "Xentral Desk"}
    )
    db.add(message)
    await db.commit()
    
    # 5. Handle Real-Time Broadcasts
    from app.core.pubsub import pubsub_manager
    
    # Broadcast to the user's workspace dashboard
    await pubsub_manager.publish(f"ws:{ws.id}", {
        "type": "conversation.updated",
        "conversation_id": str(conversation.id),
        "identified": True,
        "customerName": contact.name,
        "customerEmail": contact.email,
        "contact_id": str(contact.id)
    })
    
    # Broadcast the new message event
    await pubsub_manager.publish(f"ws:{ws.id}", {
        "type": "message.new",
        "conversation_id": str(conversation.id),
        "message": {
            "id": str(message.id),
            "sender_type": "system",
            "body": message.body,
            "created_at": message.created_at.isoformat(),
            "message_type": "text"
        }
    })
    
    return {"status": "success", "conversation_id": str(conversation.id)}


@router.post("/users/{user_id}/email")
async def send_user_email(
    user_id: uuid.UUID,
    body: dict,
    current_user: User = Depends(get_current_user),
):
    """Send a direct email to a user (Super Admin only)."""
    if current_user.email != "silasbinitie54@gmail.com":
        raise HTTPException(status_code=403, detail="Forbidden")
        
    # In a real app, this would trigger an email service (SendGrid, SES, etc.)
    # For now, we'll just log it as successful.
    print(f"DEBUG: Sending email to user {user_id} from {current_user.email}")
    print(f"DEBUG: Content: {body.get('message')}")
    
    return {"status": "success", "message": "Email sent successfully"}
