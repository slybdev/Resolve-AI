"""
WhatsApp channel service — handles interactions via WhatsApp Business API (Twilio or Meta).
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

class WhatsAppService:
    async def handle_webhook(self, db: AsyncSession, payload: dict):
        """
        Processes an incoming WhatsApp message (e.g., from Twilio or Meta Webhook).
        For this implementation, we assume a Meta-like payload.
        """
        # Meta WhatsApp Webhook structure:
        # { "entry": [ { "changes": [ { "value": { "messages": [ { "from": "phone_num", "text": {"body": "..."}, "id": "msg_id" } ] } } ] } ] }
        entry = payload.get("entry", [])
        if not entry:
            return True
            
        changes = entry[0].get("changes", [])
        if not changes:
            return True
            
        value = changes[0].get("value", {})
        messages = value.get("messages", [])
        if not messages:
            return True
            
        msg = messages[0]
        external_contact_id = msg.get("from") # Phone number
        message_text = msg.get("text", {}).get("body")
        external_message_id = msg.get("id")

        if not message_text:
            return True

        # 1. Identify channel by phone_number_id or similar in config
        metadata = value.get("metadata", {})
        phone_number_id = metadata.get("phone_number_id")

        result = await db.execute(
            select(Channel).where(
                Channel.type == ChannelType.WHATSAPP,
                Channel.is_active == True
            )
        )
        channels = result.scalars().all()
        
        target_channel = None
        for c in channels:
            if c.config.get("phone_number_id") == phone_number_id:
                target_channel = c
                break
        
        if not target_channel:
            logger.error(f"No active WhatsApp channel found for phone_number_id: {phone_number_id}")
            return False

        # 2. Route to conversation
        await routing_service.route_incoming_message(
            db=db,
            channel_id=target_channel.id,
            external_contact_id=external_contact_id,
            contact_name=f"WA: {external_contact_id}",
            message_text=message_text,
            external_message_id=external_message_id
        )
        
        await db.commit()
        return True

    async def verify_connection(self, token: str, phone_number_id: str):
        """
        Verify WhatsApp connection by calling Meta's Graph API.
        """
        url = f"https://graph.facebook.com/v19.0/{phone_number_id}"
        headers = {"Authorization": f"Bearer {token}"}
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    return response.json()
                logger.error(f"WhatsApp verification failed: {response.text}")
                return None
            except Exception as e:
                logger.error(f"Error verifying WhatsApp connection: {str(e)}")
                return None

    async def sync_messages(self, db: AsyncSession, channel: Channel):
        """
        Placeholder for manual message sync. 
        WhatsApp typically relies on webhooks, but we could implement 
        polling for certain Business API configurations if needed.
        """
        logger.info(f"Manual sync requested for WhatsApp channel: {channel.id}")
        return 0

    async def send_message(self, db: AsyncSession, channel_id: uuid.UUID, phone_number: str, text: str):
        """
        Sends a WhatsApp message back via Meta API.
        """
        result = await db.execute(select(Channel).where(Channel.id == channel_id))
        channel = result.scalar_one_or_none()
        if not channel or not channel.is_active:
            raise ValueError("Channel not found or inactive")

        token = channel.config.get("access_token")
        phone_number_id = channel.config.get("phone_number_id")
        if not token or not phone_number_id:
            raise ValueError("WhatsApp credentials not configured")

        url = f"https://graph.facebook.com/v19.0/{phone_number_id}/messages"
        headers = {"Authorization": f"Bearer {token}"}
        payload = {
            "messaging_product": "whatsapp",
            "to": phone_number,
            "type": "text",
            "text": {"body": text}
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code not in [200, 201]:
                logger.error(f"Failed to send WhatsApp message: {response.text}")
                return False
            return True

whatsapp_service = WhatsAppService()
