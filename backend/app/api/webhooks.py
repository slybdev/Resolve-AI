"""
API routes for Webhook ingestion from various channels.
"""

import logging
import uuid
from fastapi import APIRouter, Header, HTTPException, Request, Depends, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.core.config import get_settings

from app.services.channels.instagram import instagram_service
from app.services.channels.facebook import facebook_service
from app.models.channel import Channel, ChannelType
from sqlalchemy import select

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks"])

@router.get("/whatsapp/{workspace_id}/{secret}")
async def whatsapp_webhook_verify_secure(
    workspace_id: uuid.UUID,
    secret: str,
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    db: AsyncSession = Depends(get_db)
):
    """Verify WhatsApp webhook (Secure Multi-tenant)."""
    # 1. Find channel to get its token
    result = await db.execute(
        select(Channel).where(
            Channel.workspace_id == workspace_id,
            Channel.type == ChannelType.WHATSAPP,
            Channel.is_active == True
        )
    )
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    from app.services.channels.whatsapp import whatsapp_service
    token = channel.config.get("access_token") or channel.config.get("api_key")
    expected_secret = whatsapp_service.get_webhook_secret(token, workspace_id)

    if hub_mode == "subscribe" and hub_verify_token == secret == expected_secret:
        logger.info(f"WhatsApp secure webhook verified for workspace: {workspace_id}")
        return int(hub_challenge)
    
    logger.warning(f"WhatsApp secure verification failed for workspace: {workspace_id}")
    raise HTTPException(status_code=403, detail="Verification token mismatch")

@router.post("/whatsapp/{workspace_id}/{secret}")
async def whatsapp_webhook_secure(
    workspace_id: uuid.UUID,
    secret: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Ingest webhooks from WhatsApp (Secure hashed URL)."""
    payload = await request.json()
    logger.info(f"Received WhatsApp secure webhook for workspace: {workspace_id}")
    
    from app.services.channels.whatsapp import whatsapp_service
    success = await whatsapp_service.handle_webhook(db, payload, workspace_id, secret)
    
    if not success:
        return {"status": "error", "message": "Validation failed or channel not found"}
        
    await db.commit()
    return {"status": "ok"}


@router.get("/instagram")
async def instagram_webhook_verify(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token")
):
    """Verify Instagram webhook (Meta)."""
    settings = get_settings()
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        # We reuse the same verify token for simplicity, or we could add a new one
        logger.info("Instagram webhook verified successfully")
        return int(hub_challenge)
    
    logger.warning("Instagram webhook verification failed")
    raise HTTPException(status_code=403, detail="Verification token mismatch")

@router.post("/instagram")
async def instagram_webhook(
    background_tasks: BackgroundTasks,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Ingest webhooks from Instagram (Meta)."""
    payload = await request.json()
    logger.info(f"Received Instagram webhook: {payload}")
    
    background_tasks.add_task(instagram_service.handle_webhook, db, payload)
        
    return {"status": "ok"}

# --- Facebook Messenger Webhooks ---

@router.get("/facebook")
async def facebook_webhook_verify(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: int = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token")
):
    """Verify Facebook Messenger webhook (Meta)."""
    settings = get_settings()
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN: # Reusing WhatsApp token for simplicity
        logger.info("Facebook webhook verified successfully")
        return hub_challenge
    logger.warning("Facebook webhook verification failed")
    raise HTTPException(status_code=403, detail="Verification token mismatch")

@router.post("/facebook")
async def facebook_webhook(
    background_tasks: BackgroundTasks,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Ingest webhooks from Facebook Messenger (Meta)."""
    payload = await request.json()
    logger.info(f"Received Facebook webhook: {payload}")
    
    background_tasks.add_task(facebook_service.handle_webhook, db, payload)
    
    return {"status": "ok"}

@router.post("/telegram/{token}")
async def telegram_webhook(
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Ingest webhooks from Telegram (Legacy token URL)."""
    payload = await request.json()
    logger.info(f"Received Telegram webhook (Legacy): {list(payload.keys())}")
    
    from app.services.channels.telegram import telegram_service
    success = await telegram_service.handle_webhook(db, token, payload)
    
    if not success:
        return {"status": "error", "message": "Channel not found"}
        
    await db.commit()
    return {"status": "ok"}

@router.post("/telegram/{workspace_id}/{secret}")
async def telegram_webhook_secure(
    workspace_id: uuid.UUID,
    secret: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Ingest webhooks from Telegram (Secure hashed URL)."""
    payload = await request.json()
    logger.info(f"Received Telegram webhook (Secure): {workspace_id}")
    
    from app.services.channels.telegram import telegram_service
    success = await telegram_service.handle_webhook(
        db, 
        token="", # Token not needed for secure lookup
        payload=payload, 
        workspace_id=workspace_id, 
        secret=secret
    )
    
    if not success:
        return {"status": "error", "message": "Validation failed"}
        
    await db.commit()
    return {"status": "ok"}


@router.post("/discord/{token}")
async def discord_webhook_token(
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Ingest webhooks from Discord using a specific channel token."""
    payload = await request.json()
    logger.info(f"Received Discord webhook with token: {payload}")
    
    from app.services.channels.discord import discord_service
    # Step 1: Find channel by token
    result = await db.execute(
        select(Channel).where(
            Channel.type == ChannelType.DISCORD,
            Channel.is_active == True
        )
    )
    channels = result.scalars().all()
    target_channel = None
    for c in channels:
        if c.config.get("token") == token or c.config.get("bot_token") == token:
            target_channel = c
            break
            
    if not target_channel:
        # Fallback to guild_id if token doesn't match a config but it's a valid guild
        success = await discord_service.handle_webhook(db, payload)
        if not success:
            return {"status": "error", "message": "Channel not found"}
    else:
        # We have the channel, use it directly
        success = await discord_service.handle_incoming_from_channel(db, target_channel, payload)
        if not success:
            return {"status": "error", "message": "Processing failed"}

    await db.commit()
    return {"status": "ok"}

@router.post("/discord")
async def discord_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Ingest webhooks from Discord (Legacy/General)."""
    payload = await request.json()
    logger.info(f"Received Discord webhook: {payload}")
    
    from app.services.channels.discord import discord_service
    success = await discord_service.handle_webhook(db, payload)
    
    if not success:
        return {"status": "error", "message": "Channel not found"}
        
    await db.commit()
    return {"status": "ok"}

@router.post("/slack")
async def slack_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Ingest webhooks from Slack (Events API)."""
    payload = await request.json()
    logger.info(f"Received Slack webhook: {payload}")
    
    # Handle Slack URL verification challenge
    if payload.get("type") == "url_verification":
        return {"challenge": payload.get("challenge")}
        
    from app.services.channels.slack import slack_service
    success = await slack_service.handle_webhook(db, payload)
    
    if not success:
        return {"status": "error", "message": "Channel not found"}
        
    return {"status": "ok"}
