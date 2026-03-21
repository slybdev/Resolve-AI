"""
Discord channel service — handles interactions via Discord webhooks or bot API.
"""

import logging
import uuid
import httpx
import asyncio
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

        external_contact_id = str(payload.get("channel_id") or author.get("id"))
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
            message_type=message_type,
            duration=attachments[0].get("duration") if attachments else None
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
            
            payload = {"content": text}
            
            # For media messages where text is the URL, Discord's rich previews
            # will handle it automatically, but we can also use embeds for a cleaner look
            if message_type in ["image", "video", "voice", "file"] and text:
                # If we have both caption and URL, format it
                pass # Currently the dashboard sends the URL as 'text'
            
            # Send to the channel (assuming external_contact_id is the Discord Channel ID)
            # If it's a DM and we only have a User ID, we must first create a DM channel.
            url = f"https://discord.com/api/v10/channels/{external_contact_id}/messages"
            logger.info(f"Attempting to send Discord message to: {external_contact_id}")
            
            try:
                response = await client.post(url, headers=headers, json=payload)
                
                # If 404/400, it might be a User ID instead of a Channel ID
                if response.status_code in [400, 404]:
                    try:
                        # Try to create a DM channel with this ID as a recipient_id
                        dm_url = "https://discord.com/api/v10/users/@me/channels"
                        dm_resp = await client.post(dm_url, headers=headers, json={"recipient_id": external_contact_id})
                        if dm_resp.status_code in [200, 201]:
                            dm_channel_id = dm_resp.json().get("id")
                            # Now try sending to the actual DM channel
                            url = f"https://discord.com/api/v10/channels/{dm_channel_id}/messages"
                            response = await client.post(url, headers=headers, json=payload)
                    except Exception:
                        pass # Creation failed, original error will be logged below

                if response.status_code not in [200, 201]:
                    logger.error(f"Failed to send Discord message: {response.text}")
                    return False
                return True
            except Exception as e:
                logger.error(f"Error sending Discord message: {e}")
                return False

    async def verify_connection(self, token: str) -> Optional[dict]:
        """
        Verifies if a Discord Bot Token is valid.
        Also checks if the bot is failing to start in the manager.
        """
        # First, check basic API validity
        url = "https://discord.com/api/v10/users/@me"
        headers = {"Authorization": f"Bot {token}"}
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers, timeout=5.0)
                if response.status_code != 200:
                    logger.error(f"Discord verification failed: {response.status_code}")
                    return None
                
                bot_info = response.json()
                
                # Now check if the manager has reported any errors for this token
                from app.services.channels.discord_manager import discord_bot_manager
                
                # Try to send a test message if the bot is active in the manager
                client_instance = discord_bot_manager.active_clients.get(token)
                msg_delivery_status = "success"
                if client_instance and client_instance.is_ready():
                    test_sent = False
                    try:
                        # 1. Try to DM the owner
                        app_info = await client_instance.application_info()
                        owner = app_info.owner
                        if owner:
                            await owner.send("✅ **XentralDesk: Connection Successful!**\nYour bot is now connected and ready to handle messages.")
                            logger.info(f"Sent Discord verification test message to owner: {owner.name}")
                            test_sent = True
                    except Exception:
                        pass # DM failed (privacy settings or no shared server)

                    if not test_sent:
                        # 2. Try to send to the first available text channel in any server
                        try:
                            for guild in client_instance.guilds:
                                for channel in guild.text_channels:
                                    if channel.permissions_for(guild.me).send_messages:
                                        await channel.send("✅ **XentralDesk: Connection Successful!**\nThis bot is now connected to the dashboard.")
                                        logger.info(f"Sent Discord verification test message to channel: {channel.name} in {guild.name}")
                                        test_sent = True
                                        break
                                if test_sent: break
                        except Exception as chan_err:
                            logger.warning(f"Could not send Discord test message to any channel: {chan_err}")
                    
                    if not test_sent:
                        msg_delivery_status = "failed"
                
                bot_info["msg_delivery"] = msg_delivery_status

                # Give it a tiny bit of time to catch background errors if just started
                for _ in range(5):
                    error = discord_bot_manager.bot_errors.get(token)
                    if error:
                        bot_info["error"] = error
                        break
                    await asyncio.sleep(0.2)

                return bot_info
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
