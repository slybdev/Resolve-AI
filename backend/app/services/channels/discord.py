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
        Discord usually sends interactions or guild messages.
        For a simple bot integration, we might receive message events.
        """
        # 1. Identify channel (Discord usually passes guild_id or similar)
        # For simplicity, we'll look for an active Discord channel in the workspace.
        # In a real setup, we'd use a unique ID from the payload.
        
        # Example payload structure from Discord (simplified):
        # { "content": "hello", "author": { "id": "123", "username": "user" }, "guild_id": "999" }
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

        # 2. Extract message data
        author = payload.get("author", {})
        if author.get("bot"):
            return True # Ignore bot's own messages

        external_contact_id = str(author.get("id"))
        contact_name = author.get("username", "Discord User")
        message_text = payload.get("content")
        external_message_id = str(payload.get("id"))

        if not message_text:
            return True

        # 3. Route to conversation
        await routing_service.route_incoming_message(
            db=db,
            channel_id=target_channel.id,
            external_contact_id=external_contact_id,
            contact_name=contact_name,
            message_text=message_text,
            external_message_id=external_message_id
        )
        
        await db.commit()
        return True

    async def send_message(self, db: AsyncSession, channel_id: uuid.UUID, channel_config: dict, text: str):
        """
        Sends a message back to Discord.
        Discord supports webhooks (for simple tasks) or Bot API.
        """
        webhook_url = channel_config.get("webhook_url")
        if not webhook_url:
            raise ValueError("Discord webhook_url not configured")

        payload = {"content": text}

        async with httpx.AsyncClient() as client:
            response = await client.post(webhook_url, json=payload)
            if response.status_code not in [200, 204]:
                logger.error(f"Failed to send Discord message: {response.text}")
                return False
            return True

    async def verify_connection(self, token: str) -> Optional[dict]:
        """
        Verifies if a Discord Bot Token is valid via the users/@me endpoint.
        Returns bot info if valid, else None.
        """
        url = "https://discord.com/api/v10/users/@me"
        headers = {
            "Authorization": f"Bot {token}"
        }
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers, timeout=5.0)
                if response.status_code == 200:
                    data = response.json()
                    # data will contain bot details like username, discriminator, id
                    return data
                else:
                    logger.error(f"Failed to verify Discord token. Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                logger.error(f"Error verifying Discord token: {e}")
        return None

    async def sync_messages(self, db: AsyncSession, channel: Channel):
        """
        Pulls recent messages from configured Discord channels.
        In Discord, we typically sync from specific channel IDs if provided in config.
        """
        token = channel.config.get("bot_token")
        channel_ids = channel.config.get("sync_channel_ids", []) # List of channel IDs to sync from
        
        if not token:
            logger.error(f"Discord bot_token missing for sync (Channel: {channel.id})")
            return 0
            
        if not channel_ids:
            logger.info(f"No sync_channel_ids configured for Discord sync (Channel: {channel.id})")
            return 0

        count = 0
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bot {token}"}
            try:
                for chan_id in channel_ids:
                    # GET /channels/{channel.id}/messages?limit=20
                    msg_url = f"https://discord.com/api/v10/channels/{chan_id}/messages?limit=20"
                    resp = await client.get(msg_url, headers=headers)
                    if resp.status_code != 200:
                        logger.error(f"Failed to fetch Discord history for {chan_id}: {resp.text}")
                        continue
                    
                    messages = resp.json()
                    # Reverse to oldest first
                    messages.reverse()
                    
                    for msg in messages:
                        author = msg.get("author", {})
                        if author.get("bot"):
                            continue
                            
                        message_text = msg.get("content")
                        external_message_id = str(msg.get("id"))
                        sender_id = str(author.get("id"))
                        sender_name = author.get("username", "Discord User")
                        
                        if not message_text:
                            continue

                        # Route
                        await routing_service.route_incoming_message(
                            db=db,
                            channel_id=channel.id,
                            external_contact_id=sender_id,
                            contact_name=sender_name,
                            message_text=message_text,
                            external_message_id=external_message_id
                        )
                        count += 1
                
                await db.commit()
            except Exception as e:
                logger.error(f"Error during Discord message sync: {str(e)}")
                
        return count

discord_service = DiscordService()
