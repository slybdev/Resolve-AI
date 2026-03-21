"""
Slack channel service — handles interactions via Slack Events API.
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

class SlackService:
    async def handle_webhook(self, db: AsyncSession, payload: dict):
        """
        Processes an incoming Slack event.
        """
        # Slack Events API sends an envelope with "event" data
        event = payload.get("event")
        if not event or event.get("type") != "message":
            return True
            
        # Ignore bot messages
        if event.get("bot_id") or event.get("subtype") == "bot_message":
            return True

        team_id = payload.get("team_id")
        
        # 1. Identify channel
        result = await db.execute(
            select(Channel).where(
                Channel.type == ChannelType.SLACK,
                Channel.is_active == True
            )
        )
        channels = result.scalars().all()
        
        target_channel = None
        for c in channels:
            if c.config.get("team_id") == team_id:
                target_channel = c
                break
        
        if not target_channel:
            logger.error(f"No active Slack channel found for team_id: {team_id}")
            return False

        # 2. Extract message data
        external_contact_id = str(event.get("user"))
        contact_name = "Slack User" # Slack doesn't always send the name in the event
        message_text = event.get("text") or ""
        external_message_id = str(event.get("ts"))
        message_type = "text"
        
        # 2b. Handle Files/Attachments
        files = event.get("files", [])
        if files:
            first_file = files[0]
            mime = first_file.get("mimetype", "")
            # Map mime to XentralDesk types
            if "image" in mime:
                message_type = "photo"
            elif "video" in mime:
                message_type = "video"
            elif "audio" in mime:
                message_type = "audio"
            else:
                message_type = "file"
            
            # Use permalink or url_private as the body for the link
            file_url = first_file.get("url_private") or first_file.get("permalink")
            if not message_text:
                message_text = file_url
            else:
                message_text = f"{message_text}\n\n📎 {file_url}"

        if not message_text and not files:
            return True

        # 3. Route to conversation
        await routing_service.route_incoming_message(
            db=db,
            channel_id=target_channel.id,
            external_contact_id=external_contact_id,
            contact_name=contact_name,
            message_text=message_text,
            external_message_id=external_message_id,
            message_type=message_type
        )
        
        await db.commit()
        return True

    async def send_message(self, db: AsyncSession, channel_id: uuid.UUID, external_contact_id: str, text: str):
        """
        Sends a message back to Slack.
        """
        result = await db.execute(select(Channel).where(Channel.id == channel_id))
        channel = result.scalar_one_or_none()
        if not channel or not channel.is_active:
            raise ValueError("Channel not found or inactive")

        token = channel.config.get("bot_token")
        if not token:
            raise ValueError("Slack bot_token not configured")

        url = "https://slack.com/api/chat.postMessage"
        headers = {"Authorization": f"Bearer {token}"}
        payload = {
            "channel": external_contact_id, # Can be user ID for DM
            "text": text
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload)
            data = response.json()
            if not data.get("ok"):
                error = data.get('error', 'unknown_error')
                logger.error(f"Failed to send Slack message: {error}")
                return False, error
            return True, None

    async def verify_connection(self, token: str) -> Optional[dict]:
        """
        Verifies if a Slack Bot Token is valid via the auth.test endpoint.
        Returns bot/team info if valid, else None.
        """
        url = "https://slack.com/api/auth.test"
        headers = {
            "Authorization": f"Bearer {token}"
        }
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, headers=headers, timeout=5.0)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("ok"):
                        return data
                    else:
                        logger.error(f"Failed to verify Slack token: {data.get('error')}")
                else:
                    logger.error(f"Slack auth.test returned non-200. Status: {response.status_code}")
            except Exception as e:
                logger.error(f"Error verifying Slack token: {e}")
        return None

    async def sync_messages(self, db: AsyncSession, channel: Channel):
        """
        Pulls recent messages from Slack channels the bot is in.
        """
        token = channel.config.get("bot_token")
        if not token:
            logger.error(f"Slack bot_token missing for sync (Channel: {channel.id})")
            return 0

        count = 0
        async with httpx.AsyncClient() as client:
            headers = {"Authorization": f"Bearer {token}"}
            try:
                # 1. Get list of conversations the bot is in
                # GET https://slack.com/api/conversations.list?types=public_channel,private_channel,im,mpim
                list_url = "https://slack.com/api/conversations.list?types=public_channel,private_channel,im,mpim"
                resp = await client.get(list_url, headers=headers)
                list_data = resp.json()
                if not list_data.get("ok"):
                    logger.error(f"Failed to fetch Slack conversations: {list_data.get('error')}")
                    return 0
                
                conversations = list_data.get("channels", [])
                for conv in conversations:
                    conv_id = conv.get("id")
                    
                    # 2. Get history for each conversation
                    # GET https://slack.com/api/conversations.history?channel=C12345&limit=20
                    history_url = f"https://slack.com/api/conversations.history?channel={conv_id}&limit=20"
                    hist_resp = await client.get(history_url, headers=headers)
                    hist_data = hist_resp.json()
                    
                    if not hist_data.get("ok"):
                        continue
                    
                    messages = hist_data.get("messages", [])
                    # Reverse to process oldest first (Slack returns newest first)
                    messages.reverse()
                    
                    for msg in messages:
                        # Skip if bot message
                        if msg.get("bot_id") or msg.get("subtype") == "bot_message":
                            continue
                            
                        message_text = msg.get("text") or ""
                        external_message_id = str(msg.get("ts"))
                        sender_id = str(msg.get("user"))
                        
                        if not sender_id:
                            continue
                            
                        message_type = "text"
                        files = msg.get("files", [])
                        if files:
                            first_file = files[0]
                            mime = first_file.get("mimetype", "")
                            if "image" in mime: message_type = "photo"
                            elif "video" in mime: message_type = "video"
                            elif "audio" in mime: message_type = "audio"
                            else: message_type = "file"
                            
                            file_url = first_file.get("url_private") or first_file.get("permalink")
                            if not message_text:
                                message_text = file_url
                            else:
                                message_text = f"{message_text}\n\n📎 {file_url}"
                                
                        if not message_text and not files:
                            continue

                        # 3. Route
                        await routing_service.route_incoming_message(
                            db=db,
                            channel_id=channel.id,
                            external_contact_id=sender_id,
                            contact_name=f"Slack User: {sender_id}",
                            message_text=message_text,
                            external_message_id=external_message_id,
                            message_type=message_type
                        )
                        count += 1
                
                await db.commit()
            except Exception as e:
                logger.error(f"Error during Slack message sync: {str(e)}")
                
        return count

slack_service = SlackService()
