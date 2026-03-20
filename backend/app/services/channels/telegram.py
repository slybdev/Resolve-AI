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
        # Check if it has text or any media
        media_fields = ["photo", "document", "voice", "video", "audio", "sticker"]
        has_media = any(field in tg_message for field in media_fields)
        if "text" not in tg_message and not has_media:
            logger.info("Ignored update with no text and no media")
            return
        logger.info(f"Processing Telegram message (has_media: {has_media})")

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
            message_type = "voice"
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
                logger.info(f"Got Telegram file info for {file_id}")
                    
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
                os.makedirs(upload_dir, mode=0o777, exist_ok=True)
                
                # Generate unique filename keeping extension if possible
                ext = os.path.splitext(tg_file_path)[1]
                filename = f"{uuid.uuid4()}{ext}"
                local_path = os.path.join(upload_dir, filename)
                
                with open(local_path, "wb") as f:
                    f.write(file_resp.content)
                os.chmod(local_path, 0o644)
                
                logger.info(f"Saved Telegram file to {local_path}")
                return f"uploads/{filename}"
                
            except Exception as e:
                logger.error(f"Error downloading Telegram file: {e}")
                return None

    async def send_message(self, db: AsyncSession, channel_id: uuid.UUID, external_contact_id: str, text: str, message_type: str = "text"):
        """
        Sends a message back to Telegram.
        """
        logger.info(f"TelegramService.send_message called: type={message_type}, text={text[:80] if text else 'EMPTY'}...")
        
        result = await db.execute(select(Channel).where(Channel.id == channel_id))
        channel = result.scalar_one_or_none()
        if not channel or not channel.is_active:
            raise ValueError("Channel not found or inactive")

        token = channel.config.get("token")
        if not token:
            raise ValueError("Telegram token not configured")

        # Auto-detect message type from URL if type is "text" but body looks like a media URL
        if message_type == "text" and text:
            lower = text.lower().strip()
            if any(lower.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']):
                message_type = "image"
                logger.info(f"Auto-detected message_type as 'image' from URL extension")
            elif any(lower.endswith(ext) for ext in ['.mp4', '.mov', '.avi', '.mkv']):
                message_type = "video"
                logger.info(f"Auto-detected message_type as 'video' from URL extension")
            elif any(lower.endswith(ext) for ext in ['.ogg', '.oga', '.webm', '.mp3', '.wav', '.m4a']):
                message_type = "voice"
                logger.info(f"Auto-detected message_type as 'voice' from URL extension")

        async with httpx.AsyncClient() as client:
            if message_type == "image":
                url = f"https://api.telegram.org/bot{token}/sendPhoto"
                payload = {"chat_id": external_contact_id, "photo": text}
                response = await client.post(url, json=payload)
            elif message_type == "video":
                url = f"https://api.telegram.org/bot{token}/sendVideo"
                payload = {"chat_id": external_contact_id, "video": text}
                response = await client.post(url, json=payload)
            elif message_type == "voice":
                url = f"https://api.telegram.org/bot{token}/sendVoice"
                payload = {"chat_id": external_contact_id, "voice": text}
                response = await client.post(url, json=payload)
            elif message_type == "file":
                url = f"https://api.telegram.org/bot{token}/sendDocument"
                payload = {"chat_id": external_contact_id, "document": text}
                response = await client.post(url, json=payload)
            else:  # text
                if not text or not text.strip():
                    logger.error("Cannot send empty text message to Telegram, skipping")
                    return False
                url = f"https://api.telegram.org/bot{token}/sendMessage"
                payload = {"chat_id": external_contact_id, "text": text}
                response = await client.post(url, json=payload)

            if response.status_code != 200:
                logger.error(f"Failed to send Telegram {message_type}: {response.text}")
                return False
            logger.info(f"Successfully sent Telegram {message_type} message")
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
