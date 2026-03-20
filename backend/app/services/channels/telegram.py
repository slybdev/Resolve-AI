"""
Telegram channel service — handles interactions with Telegram Bot API.
"""

import logging
import uuid
import httpx
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.channel import Channel, ChannelType
from app.services.routing_service import routing_service

logger = logging.getLogger(__name__)

class TelegramService:
    async def handle_webhook(self, db: AsyncSession, token: str, payload: dict):
        """
        Processes an incoming Telegram webhook.
        """
        logger.info(f"TelegramService handling webhook for token: {token[:10]}...")
        # 1. Identify channel by token in config
        # In a real app, we might want a better way to look up channels by token
        # For now, we'll scan or use the token passed in URL (if we stored it that way)
        from sqlalchemy import cast, String
        result = await db.execute(
            select(Channel).where(
                cast(Channel.type, String) == "telegram",
                Channel.is_active == True
            )
        )
        channels = result.scalars().all()
        
        target_channel = None
        for c in channels:
            chan_token = c.config.get("token")
            logger.info(f"Checking channel {c.id}: token suffix ...{str(chan_token)[-5:] if chan_token else 'NONE'}")
            if chan_token == token:
                target_channel = c
                break
        
        if not target_channel:
            logger.error(f"No active Telegram channel found for token suffix: ...{token[-5:]}")
            return False

        logger.info(f"Matched Telegram channel: {target_channel.id} (Workspace: {target_channel.workspace_id})")
        # 2. Extract message or edited_message
        tg_message = payload.get("message")
        if not tg_message:
            return True

        await self._process_update(db, target_channel, tg_message)
        
        await db.commit()
        return True

    async def _process_update(self, db: AsyncSession, channel: Channel, tg_message: dict):
        """
        Internal method to process a single Telegram message update.
        """
        if "text" not in tg_message:
            return

        chat = tg_message.get("chat", {})
        from_user = tg_message.get("from", {})
        
        external_contact_id = str(from_user.get("id"))
        contact_name = from_user.get("first_name", "Telegram User")
        if from_user.get("last_name"):
            contact_name += f" {from_user.get('last_name')}"
            
        message_text = tg_message.get("text")
        external_message_id = str(tg_message.get("message_id"))

        # Route to conversation
        await routing_service.route_incoming_message(
            db=db,
            channel_id=channel.id,
            external_contact_id=external_contact_id,
            contact_name=contact_name,
            message_text=message_text,
            external_message_id=external_message_id
        )
        
        await db.commit()
        return True

    async def send_message(self, db: AsyncSession, channel_id: uuid.UUID, external_contact_id: str, text: str):
        """
        Sends a message back to Telegram.
        """
        result = await db.execute(select(Channel).where(Channel.id == channel_id))
        channel = result.scalar_one_or_none()
        if not channel or not channel.is_active:
            raise ValueError("Channel not found or inactive")

        token = channel.config.get("token")
        if not token:
            raise ValueError("Telegram token not configured")

        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {
            "chat_id": external_contact_id,
            "text": text
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload)
            if response.status_code != 200:
                logger.error(f"Failed to send Telegram message: {response.text}")
                return False
            return True

    async def verify_connection(self, token: str) -> Optional[dict]:
        """
        Verifies if a token is valid via getMe and checks webhook status.
        Returns bot info and webhook status if valid, else None.
        """
        async with httpx.AsyncClient() as client:
            try:
                # 1. Get Bot Info
                me_resp = await client.get(f"https://api.telegram.org/bot{token}/getMe", timeout=5.0)
                if me_resp.status_code != 200 or not me_resp.json().get("ok"):
                    return None
                
                bot_info = me_resp.json().get("result")

                # 2. Get Webhook Info
                wh_resp = await client.get(f"https://api.telegram.org/bot{token}/getWebhookInfo", timeout=5.0)
                webhook_info = {}
                if wh_resp.status_code == 200 and wh_resp.json().get("ok"):
                    webhook_info = wh_resp.json().get("result", {})
                logger.info(f"Telegram Webhook Info: {webhook_info}")
                
                pending = webhook_info.get("pending_update_count", 0)
                error_msg = webhook_info.get("last_error_message")
                if error_msg:
                    logger.error(f"Telegram Webhook Error: {error_msg}")

                return {
                    "status": "connected",
                    "webhook_active": True,
                    "bot_info": bot_info,
                    "pending_updates": pending,
                    "last_error": error_msg,
                    "url": webhook_info.get("url")
                }
            except Exception as e:
                logger.error(f"Error verifying Telegram token or webhook: {e}")
        return None

    async def set_webhook(self, token: str, base_url: str):
        """
        Registers the webhook URL with Telegram.
        """
        # Skip if local environment
        if any(x in base_url for x in ["localhost", "127.0.0.1", "0.0.0.0"]):
            logger.info(f"Skipping Telegram webhook registration for local environment: {base_url}")
            # Ensure any existing webhook is removed so getUpdates works
            async with httpx.AsyncClient() as client:
                try:
                    await client.post(f"https://api.telegram.org/bot{token}/deleteWebhook", timeout=5.0)
                except Exception:
                    pass
            return True

        webhook_url = f"{base_url}/api/v1/webhooks/telegram/{token}"
        url = f"https://api.telegram.org/bot{token}/setWebhook"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json={"url": webhook_url}, timeout=10.0)
                if response.status_code == 200:
                    logger.info(f"Successfully set Telegram webhook to {webhook_url}")
                    return True
                else:
                    logger.error(f"Failed to set Telegram webhook: {response.text}")
            except Exception as e:
                logger.error(f"Error setting Telegram webhook: {e}")
        return False

    async def sync_messages(self, db: AsyncSession, channel: Channel):
        """
        Pulls recent messages using getUpdates.
        """
        token = channel.config.get("token")
        if not token:
            return 0

        # Note: getUpdates doesn't work if a webhook is set.
        # So we temporarily delete the webhook.
        async with httpx.AsyncClient() as client:
            try:
                await client.post(f"https://api.telegram.org/bot{token}/deleteWebhook", timeout=5.0)
            except Exception as e:
                logger.error(f"Error deleting Telegram webhook before sync: {e}")

        url = f"https://api.telegram.org/bot{token}/getUpdates"
        count = 0
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("ok"):
                        updates = data.get("result", [])
                        for update in updates:
                            tg_message = update.get("message")
                            if tg_message:
                                await self._process_update(db, channel, tg_message)
                                count += 1
                        await db.commit()
            except Exception as e:
                logger.error(f"Error syncing Telegram messages: {e}")
                
        # Restore the webhook (set_webhook handles the localhost check)
        from app.core.config import get_settings
        settings = get_settings()
        await self.set_webhook(token, settings.BASE_URL)
        
        return count

telegram_service = TelegramService()
