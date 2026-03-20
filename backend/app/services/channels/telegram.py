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
        # 2. Process update
        # Telegram can send 'message' (private/group) or 'channel_post' (channels)
        message = payload.get("message") or payload.get("channel_post")
        if not message:
            logger.info(f"Ignored non-message update: {list(payload.keys())}")
            return True

        await self._process_update(db, target_channel, message)
        
        await db.commit()
        return True

    async def _process_update(self, db: AsyncSession, channel: Channel, tg_message: dict):
        """
        Internal method to process a single Telegram message update.
        """
        if "text" not in tg_message:
            return

        chat = tg_message.get("chat", {})
        # In 'channel_post', from_user is usually missing. Use 'chat' info instead.
        from_user = tg_message.get("from") or {}
        
        from_user = tg_message.get("from") or {} # In 'channel_post', from_user is usually missing. Use 'chat' info instead.

        external_contact_id = str(from_user.get("id") or chat.get("id"))
        external_message_id = str(tg_message.get("message_id"))
        
        first_name = from_user.get("first_name", "Telegram User")
        last_name = from_user.get("last_name", "")

        # --- Attachment Handling ---
        message_text = tg_message.get("text") or tg_message.get("caption") or ""
        message_type = "text"
        attachment_url = None

        # Check for different types of media
        file_id = None
        if "photo" in tg_message:
            # photo is a list of PhotoSize, take the largest one (last)
            file_id = tg_message["photo"][-1]["file_id"]
            message_type = "image"
        elif "document" in tg_message:
            file_id = tg_message["document"]["file_id"]
            message_type = "file"
        elif "voice" in tg_message:
            file_id = tg_message["voice"]["file_id"]
            message_type = "file" # or "voice" if frontend supports it
        elif "video" in tg_message:
            file_id = tg_message["video"]["file_id"]
            message_type = "file" # or "video"

        if file_id:
            token = channel.config.get("token")
            file_path = await self._download_telegram_file(file_id, token)
            if file_path:
                from app.core.config import get_settings
                settings = get_settings()
                attachment_url = f"{settings.BASE_URL}/{file_path}"
                # If there's no text, use the URL as the body (or keep it as caption)
                if not message_text:
                    message_text = attachment_url
                else:
                    message_text = f"{message_text}\n\n{attachment_url}"

        # Route to conversation
        await routing_service.route_incoming_message(
            db=db,
            channel=channel,
            external_contact_id=external_contact_id,
            external_message_id=external_message_id,
            message_text=message_text,
            first_name=first_name,
            last_name=last_name,
            message_type=message_type
        )
        
        # db.commit() is handled by the handle_webhook caller
        return True

    async def _download_telegram_file(self, file_id: str, token: str) -> Optional[str]:
        """
        Downloads a file from Telegram and saves it to local storage.
        Returns the relative path to the file.
        """
        import os
        import uuid
        import httpx
        
        # 1. Get file path from Telegram
        get_file_url = f"https://api.telegram.org/bot{token}/getFile"
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(get_file_url, params={"file_id": file_id}, timeout=10.0)
                if resp.status_code != 200:
                    logger.error(f"Failed to get file info from Telegram: {resp.text}")
                    return None
                    
                file_info = resp.json().get("result", {})
                tg_file_path = file_info.get("file_path")
                if not tg_file_path:
                    return None
                
                # 2. Download the actual file
                download_url = f"https://api.telegram.org/file/bot{token}/{tg_file_path}"
                file_resp = await client.get(download_url, timeout=30.0)
                if file_resp.status_code != 200:
                    logger.error(f"Failed to download file from Telegram: {file_resp.status_code}")
                    return None
                
                # 3. Save to local disk
                upload_dir = "/app/uploads"
                if not os.path.exists(upload_dir):
                    os.makedirs(upload_dir, exist_ok=True)
                
                # Generate unique filename keeping extension if possible
                ext = os.path.splitext(tg_file_path)[1]
                filename = f"{uuid.uuid4()}{ext}"
                local_path = os.path.join(upload_dir, filename)
                
                with open(local_path, "wb") as f:
                    f.write(file_resp.content)
                
                return f"uploads/{filename}"
                
            except Exception as e:
                logger.error(f"Error downloading Telegram file: {e}")
                return None

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

    async def send_message(self, token: str, chat_id: str, text: str, message_type: str = "text"):
        """
        Sends a message to Telegram. Supports different message types.
        """
        import httpx
        
        # Determine the method based on message_type
        method = "sendMessage"
        params = {"chat_id": chat_id}
        
        if message_type == "image":
            method = "sendPhoto"
            params["photo"] = text # text should contain the URL if it's an image
            # If there's a caption, we could handle it, but for now we use the main body as the media source
        elif message_type == "file":
            method = "sendDocument"
            params["document"] = text
        elif message_type == "voice":
            method = "sendVoice"
            params["voice"] = text
        else:
            params["text"] = text

        url = f"https://api.telegram.org/bot{token}/{method}"
        
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(url, json=params)
                if resp.status_code != 200:
                    logger.error(f"Failed to send Telegram message: {resp.text}")
                return resp.json()
            except Exception as e:
                logger.error(f"Error sending Telegram message: {e}")
                return None

telegram_service = TelegramService()
