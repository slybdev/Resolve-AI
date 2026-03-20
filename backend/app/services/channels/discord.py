"""
Discord channel service — handles interactions via Discord webhooks or bot API.
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

class DiscordService:
    async def handle_webhook(self, db: AsyncSession, payload: dict):
        """
        Processes an incoming Discord webhook.
        Expects a payload with guild_id and message content.
        Finds the matching channel and routes the message.
        """
        guild_id = payload.get("guild_id")
        if not guild_id:
            logger.error("No guild_id in Discord payload")
            return False

        result = await db.execute(
            select(Channel).where(
                Channel.type == ChannelType.DISCORD,
                Channel.is_active == True
            )
        )
        channels = result.scalars().all()
        
        target_channel = None
        for c in channels:
            if c.config.get("guild_id") == guild_id:
                target_channel = c
                break
        
        if not target_channel:
            logger.error(f"No active Discord channel found for guild_id: {guild_id}")
            return False

        return await self.handle_incoming_from_channel(db, target_channel, payload)

    async def handle_incoming_from_channel(self, db: AsyncSession, channel: Channel, payload: dict):
        """
        Processes an incoming Discord message for a specific known channel.
        """
        # 2. Extract message data
        author = payload.get("author", {})
        if author.get("bot"):
            return True # Ignore bot's own messages

        external_contact_id = str(author.get("id"))
        username = author.get("username", "Discord User")
        global_name = author.get("global_name") or username
        message_text = payload.get("content")
        external_message_id = str(payload.get("id"))

        if not message_text and not payload.get("attachments"):
            return True

        # Handle attachments if any
        message_type = "text"
        attachments = payload.get("attachments", [])
        if attachments:
            # For simplicity, take the first attachment
            att = attachments[0]
            message_text = att.get("url")
            content_type = att.get("content_type", "")
            if "image" in content_type:
                message_type = "image"
            elif "video" in content_type:
                message_type = "video"
            elif "audio" in content_type:
                message_type = "voice"
            else:
                message_type = "file"

        # 3. Route to conversation
        await routing_service.route_incoming_message(
            db=db,
            channel=channel,
            external_contact_id=external_contact_id,
            external_message_id=external_message_id,
            message_text=message_text or "",
            first_name=global_name,
            message_type=message_type
        )
        
        return True

    async def send_message(self, db: AsyncSession, channel_id: uuid.UUID, external_contact_id: str, text: str, message_type: str = "text"):
        """
        Sends a message back to Discord.
        Prioritizes Bot API if token is present, else falls back to webhook_url for specific channel.
        """
        result = await db.execute(select(Channel).where(Channel.id == channel_id))
        channel = result.scalar_one_or_none()
        if not channel or not channel.is_active:
            raise ValueError("Channel not found or inactive")

        token = channel.config.get("token") or channel.config.get("bot_token")
        # In Discord, external_contact_id is usually the user_id for DMs or channel_id for server messages.
        # For our routing to work simply, we assume external_contact_id is the target chat/channel ID.
        
        if not token:
            # Fallback to legacy webhook_url if configured
            webhook_url = channel.config.get("webhook_url")
            if not webhook_url:
                raise ValueError("Neither Discord token nor webhook_url configured")
            
            payload = {"content": text}
            async with httpx.AsyncClient() as client:
                response = await client.post(webhook_url, json=payload)
                return response.status_code in [200, 204]

        # Use Bot API
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bot {token}"}
            
            # Auto-detect media type if text looks like a URL
            if message_type == "text" and text:
                lower = text.lower().strip()
                if any(lower.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
                    message_type = "image"
                elif any(lower.endswith(ext) for ext in ['.mp4', '.mov', '.webm']):
                    message_type = "video"
                elif any(lower.endswith(ext) for ext in ['.ogg', '.mp3', '.wav']):
                    message_type = "voice"

            # Discord treats most media as attachments or embeds. 
            # For simplicity, we send as message content (Discord rich previews will handle URLs)
            # or we can use embeds for a "premium" look.
            
            payload = {"content": text}
            
            # Send to the channel (assuming external_contact_id is the Discord Channel ID)
            # If it's a DM, we first need to create a DM channel, but usually, 
            # in bot contexts, we already have the channel ID.
            url = f"https://discord.com/api/v10/channels/{external_contact_id}/messages"
            
            try:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code != 200:
                    logger.error(f"Failed to send Discord message: {response.text}")
                    return False
                return True
            except Exception as e:
                logger.error(f"Error sending Discord message: {e}")
                return False

    async def verify_connection(self, token: str) -> Optional[dict]:
        """
        Verifies if a Discord Bot Token is valid.
        """
        url = "https://discord.com/api/v10/users/@me"
        headers = {"Authorization": f"Bot {token}"}
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers, timeout=5.0)
                if response.status_code == 200:
                    return response.json()
                logger.error(f"Discord verification failed: {response.status_code}")
            except Exception as e:
                logger.error(f"Error verifying Discord token: {e}")
        return None

    async def sync_messages(self, db: AsyncSession, channel: Channel):
        """
        Pulls recent messages from configured Discord channels.
        """
        token = channel.config.get("token") or channel.config.get("bot_token")
        channel_ids = channel.config.get("sync_channel_ids", [])
        
        if not token or not channel_ids:
            return 0

        count = 0
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bot {token}"}
            for chan_id in channel_ids:
                try:
                    msg_url = f"https://discord.com/api/v10/channels/{chan_id}/messages?limit=20"
                    resp = await client.get(msg_url, headers=headers)
                    if resp.status_code == 200:
                        for msg in reversed(resp.json()):
                            author = msg.get("author", {})
                            if author.get("bot"): continue
                            
                            await routing_service.route_incoming_message(
                                db=db,
                                channel=channel,
                                external_contact_id=str(author.get("id")),
                                external_message_id=str(msg.get("id")),
                                message_text=msg.get("content") or "",
                                first_name=author.get("global_name") or author.get("username", "User")
                            )
                            count += 1
                except Exception as e:
                    logger.error(f"Error syncing Discord channel {chan_id}: {e}")
            
            await db.commit()
        return count

discord_service = DiscordService()
