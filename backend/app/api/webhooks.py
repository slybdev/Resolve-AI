"""
API routes for Webhook ingestion from various channels.
"""

from fastapi import APIRouter, Header, HTTPException, Request, Depends, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.core.config import get_settings
import logging

from app.services.channels.instagram import instagram_service
from app.services.channels.facebook import facebook_service
from app.models.channel import Channel, ChannelType
from sqlalchemy import select

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks"])

@router.get("/whatsapp")
async def whatsapp_webhook_verify(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token")
):
    """Verify WhatsApp webhook (Meta)."""
    settings = get_settings()
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        logger.info("WhatsApp webhook verified successfully")
        return int(hub_challenge)
    
    logger.warning("WhatsApp webhook verification failed")
    raise HTTPException(status_code=403, detail="Verification token mismatch")

@router.post("/whatsapp")
async def whatsapp_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Ingest webhooks from WhatsApp (Meta)."""
    payload = await request.json()
    logger.info(f"Received WhatsApp webhook: {payload}")
    
    from app.services.channels.whatsapp import whatsapp_service
    success = await whatsapp_service.handle_webhook(db, payload)
    
    if not success:
        return {"status": "error", "message": "Channel not found or processing failed"}
        
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
    """Ingest webhooks from Telegram."""
    payload = await request.json()
    logger.info(f"Received Telegram webhook payload: {payload}")
    
    from app.services.channels.telegram import telegram_service
    success = await telegram_service.handle_webhook(db, token, payload)
    
    if not success:
        return {"status": "error", "message": "Channel not found"}
        
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
