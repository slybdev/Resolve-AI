"""
Instagram channel service — handles interactions via Instagram Messaging API (Meta).
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

class InstagramService:
    async def handle_webhook(self, db: AsyncSession, payload: dict):
        """
        Processes an incoming Instagram message.
        Meta Instagram Webhook structure is similar to WhatsApp but uses "messaging" field.
        """
        entry = payload.get("entry", [])
        if not entry:
            return True
            
        for e in entry:
            messaging = e.get("messaging", [])
            for msg_event in messaging:
                sender_id = msg_event.get("sender", {}).get("id")
                recipient_id = msg_event.get("recipient", {}).get("id")
                message = msg_event.get("message", {})
                
                if not message or "text" not in message:
                    continue
                    
                message_text = message.get("text")
                external_message_id = message.get("mid")

                # 1. Identify channel by instagram_page_id in config
                result = await db.execute(
                    select(Channel).where(
                        Channel.type == ChannelType.INSTAGRAM,
                        Channel.is_active == True
                    )
                )
                channels = result.scalars().all()
                
                target_channel = None
                for c in channels:
                    if c.config.get("instagram_page_id") == recipient_id:
                        target_channel = c
                        break
                
                if not target_channel:
                    logger.error(f"No active Instagram channel found for page_id: {recipient_id}")
                    continue

                # 2. Route to conversation
                _, _ = await routing_service.route_incoming_message(
                    db=db,
                    channel_id=target_channel.id,
                    external_contact_id=sender_id,
                    contact_name=f"IG User: {sender_id}",
                    message_text=message_text,
                    external_message_id=external_message_id
                )
        
        await db.commit()
        return True

    async def verify_connection(self, token: str, instagram_page_id: str):
        """
        Verify Instagram connection by calling Meta's Graph API.
        """
        # For Instagram, we typically verify the Page access token and the IG User ID
        url = f"https://graph.facebook.com/v19.0/{instagram_page_id}?fields=name,username&access_token={token}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url)
                if response.status_code == 200:
                    return response.json()
                logger.error(f"Instagram verification failed: {response.text}")
                return None
            except Exception as e:
                logger.error(f"Error verifying Instagram connection: {str(e)}")
                return None

    async def sync_messages(self, db: AsyncSession, channel: Channel):
        """
        Pulls recent conversations and messages via Meta's Graph API for Instagram.
        """
        token = channel.config.get("access_token")
        instagram_page_id = channel.config.get("instagram_page_id")
        if not token or not instagram_page_id:
            logger.error(f"Credentials missing for Instagram sync (Channel: {channel.id})")
            return 0

        # Endpoint for conversations
        # GET /v19.0/me/conversations?platform=instagram
        url = f"https://graph.facebook.com/v19.0/me/conversations?platform=instagram&access_token={token}"
        
        count = 0
        async with httpx.AsyncClient() as client:
            try:
                # 1. Get conversations
                resp = await client.get(url)
                if resp.status_code != 200:
                    logger.error(f"Failed to fetch Instagram conversations: {resp.text}")
                    return 0
                
                conversations = resp.json().get("data", [])
                for conv in conversations:
                    conv_id = conv.get("id")
                    
                    # 2. Get messages for each conversation
                    # GET /v19.0/{conversation_id}?fields=messages{message,from,created_time}
                    msg_url = f"https://graph.facebook.com/v19.0/{conv_id}?fields=messages{{message,from,created_time,id}}&access_token={token}"
                    msg_resp = await client.get(msg_url)
                    if msg_resp.status_code != 200:
                        continue
                    
                    messages_data = msg_resp.json().get("messages", {}).get("data", [])
                    # Sort by created_time to process in order
                    messages_data.sort(key=lambda x: x.get("created_time", ""))
                    
                    for msg in messages_data:
                        sender = msg.get("from", {})
                        sender_id = sender.get("id")
                        sender_name = sender.get("username") or sender.get("name") or f"IG User: {sender_id}"
                        
                        # Skip if message is from the page itself
                        if sender_id == instagram_page_id:
                            continue
                            
                        message_text = msg.get("message")
                        external_message_id = msg.get("id")
                        
                        if not message_text:
                            continue

                        # 3. Route to conversation
                        _, _ = await routing_service.route_incoming_message(
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
                logger.error(f"Error during Instagram message sync: {str(e)}")
                
        return count

    async def send_message(self, db: AsyncSession, channel_id: uuid.UUID, recipient_id: str, text: str):
        """
        Sends an Instagram message back via Meta API.
        """
        result = await db.execute(select(Channel).where(Channel.id == channel_id))
        channel = result.scalar_one_or_none()
        if not channel or not channel.is_active:
            raise ValueError("Channel not found or inactive")

        token = channel.config.get("access_token")
        if not token:
            raise ValueError("Instagram credentials not configured")

        url = f"https://graph.facebook.com/v19.0/me/messages?access_token={token}"
        payload = {
            "recipient": {"id": recipient_id},
            "message": {"text": text}
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload)
            if response.status_code not in [200, 201]:
                logger.error(f"Failed to send Instagram message: {response.text}")
                return False
            return True

instagram_service = InstagramService()
