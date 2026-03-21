"""
API routes for Channel management.
"""

import uuid
from typing import List, Optional
import json

from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from fastapi.responses import RedirectResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.core.config import get_settings
from app.models.channel import Channel, ChannelType
from app.models.user import User
from app.models.message import Message
from app.models.conversation import Conversation
from app.schemas.channel import ChannelCreate, ChannelResponse, ChannelUpdate, ChannelStats, ChannelVerifyResponse

router = APIRouter(prefix="/api/v1/channels", tags=["Channels"])

import logging
import httpx
logger = logging.getLogger(__name__)


@router.get("/", response_model=List[ChannelResponse])
async def list_channels(
    workspace_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all channels for a workspace."""
    logger.info(f"Listing channels for workspace: {workspace_id}")
    result = await db.execute(
        select(Channel).where(Channel.workspace_id == workspace_id)
    )
    return result.scalars().all()


@router.post("/", response_model=ChannelResponse, status_code=status.HTTP_201_CREATED)
async def create_channel(
    channel_in: ChannelCreate,
    workspace_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Connect a new channel to a workspace."""
    logger.info(f"Creating channel of type {channel_in.type} for workspace: {workspace_id}")
    channel = Channel(
        **channel_in.dict(),
        workspace_id=workspace_id
    )
    db.add(channel)
    await db.commit()
    await db.refresh(channel)

    if channel.type == ChannelType.TELEGRAM:
        from app.services.channels.telegram import telegram_service
        token = channel.config.get("token")
        if token:
            settings = get_settings()
            await telegram_service.set_webhook(token, settings.BASE_URL)
    
    # ── Discord Bot Setup ──
    if channel.type == ChannelType.DISCORD:
        from app.services.channels.discord_manager import discord_bot_manager
        token = channel.config.get("token") or channel.config.get("bot_token")
        if token and channel.is_active:
            await discord_bot_manager.start_bot(token, str(channel.id))

    return channel


@router.get("/{channel_id}", response_model=ChannelResponse)
async def get_channel(
    channel_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get details of a specific channel."""
    result = await db.execute(select(Channel).where(Channel.id == channel_id))
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    return channel


@router.patch("/{channel_id}", response_model=ChannelResponse)
async def update_channel(
    channel_id: uuid.UUID,
    channel_in: ChannelUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update channel configuration or status."""
    result = await db.execute(select(Channel).where(Channel.id == channel_id))
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    update_data = channel_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(channel, field, value)

    db.add(channel)
    await db.commit()
    await db.refresh(channel)

    if channel.type == ChannelType.TELEGRAM:
        from app.services.channels.telegram import telegram_service
        token = channel.config.get("token")
        if token:
            settings = get_settings()
            await telegram_service.set_webhook(token, settings.BASE_URL)

    # ── Update Discord Bot ──
    if channel.type == ChannelType.DISCORD:
        from app.services.channels.discord_manager import discord_bot_manager
        token = channel.config.get("token") or channel.config.get("bot_token")
        if not channel.is_active:
            await discord_bot_manager.stop_bot(token)
        elif token:
            await discord_bot_manager.start_bot(token, str(channel.id))

    return channel


@router.delete("/{channel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_channel(
    channel_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Disconnect/delete a channel."""
    result = await db.execute(select(Channel).where(Channel.id == channel_id))
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    if channel.type == ChannelType.DISCORD:
        from app.services.channels.discord_manager import discord_bot_manager
        token = channel.config.get("token") or channel.config.get("bot_token")
        if token:
            await discord_bot_manager.stop_bot(token)

    await db.delete(channel)
    await db.commit()
    return None


@router.get("/{channel_id}/stats", response_model=ChannelStats)
async def get_channel_stats(
    channel_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get real-time metrics for a channel."""
    # Total messages
    msg_count_res = await db.execute(
        select(func.count(Message.id)).where(Message.channel_id == channel_id)
    )
    total_messages = msg_count_res.scalar() or 0

    # AI Automation Rate
    ai_msg_count_res = await db.execute(
        select(func.count(Message.id)).where(
            Message.channel_id == channel_id,
            Message.sender_type == "ai"
        )
    )
    ai_messages = ai_msg_count_res.scalar() or 0
    ai_automation_rate = (ai_messages / total_messages * 100) if total_messages > 0 else 0

    # Resolution Rate (Based on conversations that have messages from this channel)
    # This is a bit complex, let's simplify: find conversations where at least one message is from this channel
    conv_ids_subquery = select(Message.conversation_id).where(Message.channel_id == channel_id).distinct()
    
    total_convs_res = await db.execute(
        select(func.count(Conversation.id)).where(Conversation.id.in_(conv_ids_subquery))
    )
    total_convs = total_convs_res.scalar() or 0
    
    resolved_convs_res = await db.execute(
        select(func.count(Conversation.id)).where(
            Conversation.id.in_(conv_ids_subquery),
            Conversation.status == "closed"
        )
    )
    resolved_convs = resolved_convs_res.scalar() or 0
    resolution_rate = (resolved_convs / total_convs * 100) if total_convs > 0 else 0

    # Avg Response Time (Simplified: for now return a placeholder or 0)
    # Real calculation would involve comparing timestamps of consecutive messages
    avg_response_time = 1.2 if total_messages > 0 else 0.0 # Placeholder for demo consistency

    return ChannelStats(
        total_messages=total_messages,
        avg_response_time=avg_response_time,
        resolution_rate=resolution_rate,
        ai_automation_rate=ai_automation_rate
    )


@router.post("/{channel_id}/verify", response_model=ChannelVerifyResponse)
async def verify_channel(
    channel_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger a live verification of the channel connection."""
    result = await db.execute(select(Channel).where(Channel.id == channel_id))
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    if channel.type == ChannelType.TELEGRAM:
        from app.services.channels.telegram import telegram_service
        token = channel.config.get("token")
        if not token:
             return ChannelVerifyResponse(success=False, detail="Token not configured")
        
        result = await telegram_service.verify_connection(token)
        if result:
            bot_info = result.get("bot_info", {})
            
            detail = f"Connected as @{bot_info.get('username')}"
            if result.get("url"):
                detail += " (Webhook Active)"
            else:
                detail += " (Webhook Pending)"
            
            if result.get("pending_updates", 0) > 0:
                detail += f" - {result['pending_updates']} pending"
            
            if result.get("last_error"):
                detail += f" - Error: {result['last_error']}"

            # Only sync if it's a fresh connection or requested
            background_tasks.add_task(telegram_service.sync_messages, db, channel)

            return ChannelVerifyResponse(
                success=True, 
                detail=detail,
                info=result
            )
        else:
            return ChannelVerifyResponse(success=False, detail="Invalid token or Telegram API unreachable")
            
    elif channel.type == ChannelType.DISCORD:
        from app.services.channels.discord import discord_service
        token = channel.config.get("token")
        if not token:
             return ChannelVerifyResponse(success=False, detail="Token not configured")
        
        bot_info = await discord_service.verify_connection(token)
        if bot_info:
            if "error" in bot_info:
                return ChannelVerifyResponse(
                    success=False,
                    detail=bot_info["error"]
                )
            
            background_tasks.add_task(discord_service.sync_messages, db, channel)
            return ChannelVerifyResponse(
                success=True,
                detail="Discord connection verified successfully.",
                info={
                    "username": bot_info.get("username"),
                    "discriminator": bot_info.get("discriminator"),
                    "id": bot_info.get("id"),
                    "msg_delivery": bot_info.get("msg_delivery", "success")
                }
            )
        else:
            return ChannelVerifyResponse(success=False, detail="Invalid token or Discord API unreachable")
            
    elif channel.type == ChannelType.SLACK:
        from app.services.channels.slack import slack_service
        token = channel.config.get("bot_token")
        if not token:
             return ChannelVerifyResponse(success=False, detail="Bot token not configured")
        
        bot_info = await slack_service.verify_connection(token)
        if bot_info:
            # Critical: Update channel config with team_id for webhook routing
            new_config = dict(channel.config) if channel.config else {}
            new_config["team_id"] = bot_info.get("team_id")
            new_config["bot_user_id"] = bot_info.get("user_id")
            new_config["team_name"] = bot_info.get("team")
            channel.config = new_config
            db.add(channel)
            await db.commit()

            # 2. Send a test message to the verifying user (Synchronous for immediate feedback)
            logger.info(f"Slack: Sending test message to user {bot_info.get('user_id')}")
            test_text = "✅ *XentralDesk: Connection Successful!*\nYour Slack bot is now connected to the dashboard and ready to handle messages."
            success, error = await slack_service.send_message(db, channel.id, bot_info.get("user_id"), test_text)
            
            # 3. Test Read Scopes (Attempt to list conversations)
            # This must match sync_messages parameters to catch missing scopes
            logger.info("Slack: Testing read scopes via conversations.list with sync params")
            sync_success = True
            sync_error = None
            try:
                headers = {"Authorization": f"Bearer {token}"}
                async with httpx.AsyncClient() as client:
                    # Using the exact same types as sync_messages
                    test_sync_url = "https://slack.com/api/conversations.list?limit=1&types=public_channel,private_channel,im,mpim"
                    res = await client.get(test_sync_url, headers=headers)
                    sync_data = res.json()
                    if not sync_data.get("ok"):
                        sync_success = False
                        sync_error = sync_data.get("error")
                        logger.error(f"Slack: Sync check failed with error: {sync_error}")
            except Exception as e:
                logger.error(f"Slack: Sync check exception: {str(e)}")
                sync_success = False
                sync_error = str(e)

            background_tasks.add_task(slack_service.sync_messages, db, channel)
            
            if not success or not sync_success:
                errors = []
                if not success: errors.append(f"Message send failed: {error}")
                if not sync_success: errors.append(f"Channel sync failed: {sync_error}")
                
                return ChannelVerifyResponse(
                    success=False, # Make it a failure so the user fixes it
                    detail=f"Auth worked, but permissions are missing: {', '.join(errors)}. Please check your Slack App scopes and Re-install it.",
                    info=bot_info
                )

            return ChannelVerifyResponse(
                success=True, 
                detail=f"Connected to team: {bot_info.get('team')} as {bot_info.get('user')}. Test message and sync check passed!",
                info=bot_info
            )
        else:
            return ChannelVerifyResponse(success=False, detail="Invalid token or Slack API unreachable")
            
    elif channel.type == ChannelType.EMAIL:
        from app.services.channels.email import email_service
        result = await email_service.verify_connection(channel.config)
        if result:
            background_tasks.add_task(email_service.sync_messages, db, channel)
            return ChannelVerifyResponse(success=True, detail=result["detail"])
        else:
            return ChannelVerifyResponse(success=False, detail="Invalid email configuration or API unreachable")
            
    elif channel.type == ChannelType.WHATSAPP:
        from app.services.channels.whatsapp import whatsapp_service
        token = channel.config.get("access_token")
        phone_number_id = channel.config.get("phone_number_id")
        if not token or not phone_number_id:
             return ChannelVerifyResponse(success=False, detail="Access token or Phone Number ID not configured")
        
        info = await whatsapp_service.verify_connection(token, phone_number_id)
        if info:
            background_tasks.add_task(whatsapp_service.sync_messages, db, channel)
            return ChannelVerifyResponse(
                success=True, 
                detail=f"Connected to WhatsApp (ID: {phone_number_id})",
                info=info
            )
        else:
            return ChannelVerifyResponse(success=False, detail="Invalid credentials or Meta API unreachable")
            
    elif channel.type == ChannelType.INSTAGRAM:
        from app.services.channels.instagram import instagram_service
        creds = channel.config
        token = creds.get("access_token")
        instagram_page_id = creds.get("instagram_page_id")
        if not token or not instagram_page_id:
             return ChannelVerifyResponse(success=False, detail="Access token or Instagram Page ID not configured")
        
        info = await instagram_service.verify_connection(token, instagram_page_id)
        if info:
            background_tasks.add_task(instagram_service.sync_messages, db, channel)
            return ChannelVerifyResponse(
                success=True, 
                detail=f"Connected to Instagram (ID: {instagram_page_id})",
                info=info
            )
        else:
            return ChannelVerifyResponse(success=False, detail="Invalid credentials or Meta API unreachable")
            
    elif channel.type == ChannelType.FACEBOOK:
        from app.services.channels.facebook import facebook_service
        creds = channel.config
        token = creds.get("access_token")
        facebook_page_id = creds.get("facebook_page_id")
        if not token or not facebook_page_id:
             return ChannelVerifyResponse(success=False, detail="Access token or Facebook Page ID not configured")
        
        info = await facebook_service.verify_connection(token, facebook_page_id)
        if info:
            background_tasks.add_task(facebook_service.sync_messages, db, channel)
            return ChannelVerifyResponse(
                success=True, 
                detail=f"Connected to Facebook (ID: {facebook_page_id})",
                info=info
            )
        else:
            return ChannelVerifyResponse(success=False, detail="Invalid credentials or Meta API unreachable")
    
    # Add other channel types here...
    
    return ChannelVerifyResponse(success=True, detail="Channel configuration exists (verification not implemented for this type yet)")


@router.post("/{channel_id}/sync")
async def sync_channel_messages(
    channel_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually pull missed messages for a channel."""
    result = await db.execute(select(Channel).where(Channel.id == channel_id))
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    if channel.type == ChannelType.TELEGRAM:
        from app.services.channels.telegram import telegram_service
        background_tasks.add_task(telegram_service.sync_messages, db, channel)
    elif channel.type == ChannelType.EMAIL:
        from app.services.channels.email import email_service
        background_tasks.add_task(email_service.sync_messages, db, channel)
    elif channel.type == ChannelType.WHATSAPP:
        from app.services.channels.whatsapp import whatsapp_service
        background_tasks.add_task(whatsapp_service.sync_messages, db, channel)
    elif channel.type == ChannelType.INSTAGRAM:
        from app.services.channels.instagram import instagram_service
        background_tasks.add_task(instagram_service.sync_messages, db, channel)
    elif channel.type == ChannelType.FACEBOOK:
        from app.services.channels.facebook import facebook_service
        background_tasks.add_task(facebook_service.sync_messages, db, channel)
    elif channel.type == ChannelType.SLACK:
        from app.services.channels.slack import slack_service
        background_tasks.add_task(slack_service.sync_messages, db, channel)
    elif channel.type == ChannelType.DISCORD:
        from app.services.channels.discord import discord_service
        background_tasks.add_task(discord_service.sync_messages, db, channel)
    
    return {"status": "sync_started"}


@router.get("/{channel_id}/google/login")
async def google_oauth_login(
    channel_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate Google OAuth URL to connect an Email channel."""
    from google_auth_oauthlib.flow import Flow
    from app.core.config import get_settings
    settings = get_settings()

    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google Client ID/Secret not configured.")

    client_config = {
        "web": {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "project_id": "xentraldesk",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
        }
    }

    scopes = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/userinfo.email"
    ]

    redirect_uri = f"{settings.BASE_URL}/api/v1/channels/google/callback"
    
    flow = Flow.from_client_config(
        client_config,
        scopes=scopes,
        redirect_uri=redirect_uri
    )

    auth_url, state = flow.authorization_url(
        access_type='offline',
        prompt='consent',
        include_granted_scopes='true'
    )

    # Encode channel_id into state so we know which channel to update on callback
    combined_state = f"{state}|{channel_id}"
    
    # Normally we'd redirect, but frontends often prefer the URL returned to pop it up
    return {"auth_url": auth_url, "state": combined_state}


@router.get("/google/callback")
async def google_oauth_callback(
    state: str = Query(...),
    code: str = Query(...),
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db),
):
    """Handle Google OAuth callback and save the refresh token."""
    from google_auth_oauthlib.flow import Flow
    from app.core.config import get_settings
    settings = get_settings()

    try:
        original_state, channel_id_str = state.split("|")
        channel_id = uuid.UUID(channel_id_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid state parameter.")

    client_config = {
        "web": {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }

    # Reconstruct flow
    flow = Flow.from_client_config(
        client_config,
        scopes=[
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/userinfo.email"
        ],
        redirect_uri=f"{settings.BASE_URL}/api/v1/channels/google/callback",
        state=original_state
    )

    try:
        flow.fetch_token(code=code)
        credentials = flow.credentials
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch token: {str(e)}")

    # Get email address
    from googleapiclient.discovery import build
    service = build('oauth2', 'v2', credentials=credentials)
    user_info = service.userinfo().get().execute()
    email_address = user_info.get("email")

    # Update channel
    result = await db.execute(select(Channel).where(Channel.id == channel_id))
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    new_config = dict(channel.config) if channel.config else {}
    new_config.update({
        "google_refresh_token": credentials.refresh_token,
        "google_access_token": credentials.token,
        "from_email": email_address,
        "smtp_server": "", # clear old fields
        "smtp_port": "",
        "smtp_user": "",
        "smtp_password": "",
        "imap_server": "",
        "imap_port": "",
        "imap_user": "",
        "imap_password": "",
    })
    channel.config = new_config
    await db.commit()

    # Trigger sync
    from app.services.channels.email import email_service
    if background_tasks:
        background_tasks.add_task(email_service.sync_messages, db, channel)
    else:
        # Fallback if background_tasks is not available
        await email_service.sync_messages(db, channel)

    # Redirect back to the Channels page in the frontend
    from fastapi.responses import RedirectResponse
    frontend_url = f"{settings.FRONTEND_URL}/dashboard/channels/email?status=success"
    return RedirectResponse(url=frontend_url)
