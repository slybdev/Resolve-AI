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

        await db.commit()
        return True

    async def handle_qr_webhook(self, db: AsyncSession, payload: dict):
        """
        Processes an incoming message relayed from the Node.js WhatsApp QR Bridge.
        """
        remote_jid = payload.get("remoteJid") # e.g. "123456789@s.whatsapp.net"
        push_name = payload.get("pushName", "WhatsApp User")
        msg = payload.get("message", {})
        
        message_text = msg.get("text")
        message_type = msg.get("type", "text")
        external_message_id = msg.get("id")

        if not remote_jid or not message_text:
            return True

        # Find the active WhatsApp channel (assuming only one for now, or match by workspace)
        # In a real multi-tenant app, we'd need a way to map the session to a workspace.
        # For now, we'll pick the first active WhatsApp channel.
        result = await db.execute(
            select(Channel).where(
                Channel.type == ChannelType.WHATSAPP,
                Channel.is_active == True
            )
        )
        target_channel = result.scalars().first()
        
        if not target_channel:
            logger.error("No active WhatsApp channel found for QR relay")
            return False

        # Route to conversation
        await routing_service.route_incoming_message(
            db=db,
            channel_id=target_channel.id,
            external_contact_id=remote_jid,
            contact_name=push_name,
            message_text=message_text,
            external_message_id=external_message_id,
            message_type=message_type
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
        Sends a WhatsApp message via the Node.js Bridge.
        """
        result = await db.execute(select(Channel).where(Channel.id == channel_id))
        channel = result.scalar_one_or_none()
        if not channel or not channel.is_active:
            raise ValueError("Channel not found or inactive")

        # Use the local Node.js service URL
        # Note: In docker, it's 'whatsapp-service:3001'
        url = "http://whatsapp-service:3001/send"
        payload = {
            "to": phone_number,
            "text": text,
            "type": "text"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, timeout=10.0)
                if response.status_code not in [200, 201]:
                    logger.error(f"Failed to send WhatsApp message via bridge: {response.text}")
                    # Fallback to Meta API if config exists? (Optional)
                    return False
                return True
            except Exception as e:
                logger.error(f"Error calling WhatsApp bridge: {str(e)}")
                return False

whatsapp_service = WhatsAppService()
