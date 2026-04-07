"""
WhatsApp channel service — handles interactions via Meta WhatsApp Business API (Cloud API).
"""

import logging
import uuid
import httpx
import hashlib
from typing import Optional, Dict, Any, List
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.channel import Channel, ChannelType
from app.models.message import Message
from app.services.routing_service import routing_service
from app.api.websocket import manager

logger = logging.getLogger(__name__)

class WhatsAppService:
    def get_webhook_secret(self, token: str, workspace_id: uuid.UUID) -> str:
        """
        Generates a secure hash of the token + workspace_id to use in the webhook URL.
        This secret is also used as the 'hub.verify_token' for Meta's verification challenge.
        """
        data = f"{token}:{workspace_id}"
        return hashlib.sha256(data.encode()).hexdigest()[:32]

    async def handle_webhook(self, db: AsyncSession, payload: dict, workspace_id: uuid.UUID, secret: str):
        """
        Processes an incoming Meta WhatsApp webhook.
        """
        # 1. Validation: Find the channel for this workspace
        result = await db.execute(
            select(Channel).where(
                Channel.workspace_id == workspace_id,
                Channel.type == ChannelType.WHATSAPP,
                Channel.is_active == True
            )
        )
        channel = result.scalar_one_or_none()
        
        if not channel:
            logger.error(f"[WhatsApp] No active channel found for workspace {workspace_id}")
            return False

        # 2. Verify secret
        token = channel.config.get("access_token") or channel.config.get("api_key")
        if not token:
            logger.error(f"[WhatsApp] No token configured for channel {channel.id}")
            return False
            
        expected_secret = self.get_webhook_secret(token, workspace_id)
        if secret != expected_secret:
            logger.warning(f"[WhatsApp] Invalid secret for workspace {workspace_id}")
            return False

        # 3. Parse Meta Payload
        # Meta structure: entry[] -> changes[] -> value -> { messages: [], contacts: [] }
        entries = payload.get("entry", [])
        for entry in entries:
            changes = entry.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                
                # Check for metadata (phone_number_id) to verify it's for us
                metadata = value.get("metadata", {})
                waba_id = metadata.get("phone_number_id")
                config_waba_id = channel.config.get("phone_number_id")
                
                if config_waba_id and waba_id != config_waba_id:
                    logger.debug(f"[WhatsApp] Skipping message for mismatched phone_id: {waba_id}")
                    continue

                messages = value.get("messages", [])
                contacts = value.get("contacts", [])
                
                # Map contacts to a dictionary for easy lookup
                contact_map = {c.get("wa_id"): c.get("profile", {}).get("name") for c in contacts}

                for msg in messages:
                    await self._process_update(db, channel, msg, contact_map)

        return True

    async def _process_update(self, db: AsyncSession, channel: Channel, msg: dict, contact_map: dict):
        """
        Processes a single message from the Meta payload.
        """
        message_id = msg.get("id")
        from_number = msg.get("from")
        msg_type = msg.get("type", "text")
        
        # 1. Deduplication
        # Check if message already exists in DB
        result = await db.execute(select(Message).where(Message.external_id == message_id))
        if result.scalar_one_or_none():
            logger.debug(f"[WhatsApp] Duplicate message skipped: {message_id}")
            return

        # 2. Extract Content
        body = ""
        metadata = {}
        
        if msg_type == "text":
            body = msg.get("text", {}).get("body", "")
        elif msg_type == "image":
            body = msg.get("image", {}).get("caption") or "[Image]"
            metadata["media_id"] = msg.get("image", {}).get("id")
        elif msg_type == "video":
            body = msg.get("video", {}).get("caption") or "[Video]"
            metadata["media_id"] = msg.get("video", {}).get("id")
        elif msg_type == "audio":
            body = "[Audio]"
            metadata["media_id"] = msg.get("audio", {}).get("id")
        elif msg_type == "document":
            body = msg.get("document", {}).get("filename") or "[Document]"
            metadata["media_id"] = msg.get("document", {}).get("id")
        elif msg_type == "button":
            body = msg.get("button", {}).get("text", "")
        elif msg_type == "interactive":
            # Handle list replies or button replies
            interactive = msg.get("interactive", {})
            if interactive.get("type") == "button_reply":
                body = interactive.get("button_reply", {}).get("title", "")
            elif interactive.get("type") == "list_reply":
                body = interactive.get("list_reply", {}).get("title", "")
        else:
            body = f"[{msg_type.capitalize()} Message]"

        # 3. Identify Contact Name
        push_name = contact_map.get(from_number, "WhatsApp User")

        # 4. Route to Core Handling
        try:
            message, _ = await routing_service.route_incoming_message(
                db=db,
                channel_id=channel.id,
                external_contact_id=from_number,
                contact_name=push_name,
                message_text=body,
                external_message_id=message_id,
                message_type=msg_type,
                metadata=metadata
            )
            
            # 5. Real-Time WebSocket Broadcast
            if message:
                await manager.broadcast_to_workspace(
                    workspace_id=channel.workspace_id,
                    message={
                        "type": "message.new",
                        "workspace_id": str(channel.workspace_id),
                        "channel_id": str(channel.id),
                        "conversation_id": str(message.conversation_id),
                        "message": {
                            "id": str(message.id),
                            "body": message.body,
                            "direction": message.direction,
                            "type": message.type,
                            "created_at": message.created_at.isoformat()
                        }
                    }
                )
                logger.info(f"[WhatsApp] New message processed and broadcasted: {message_id}")

        except Exception as e:
            logger.error(f"[WhatsApp] Error routing message {message_id}: {str(e)}")

    async def send_message(self, db: AsyncSession, channel_id: uuid.UUID, to: str, text: str, message_type: str = "text"):
        """
        Sends a WhatsApp message via Meta Graph API with retry logic.
        """
        result = await db.execute(select(Channel).where(Channel.id == channel_id))
        channel = result.scalar_one_or_none()
        if not channel or not channel.is_active:
            raise ValueError("Channel not found or inactive")

        token = channel.config.get("access_token") or channel.config.get("api_key")
        phone_id = channel.config.get("phone_number_id")
        
        if not token or not phone_id:
            raise ValueError("WhatsApp account not fully configured (missing token or phone_id)")

        url = f"https://graph.facebook.com/v17.0/{phone_id}/messages"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Build Payload
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to
        }
        
        if message_type == "text":
            payload["type"] = "text"
            payload["text"] = {"body": text}
        else:
            # Handle media (simplified: if mediaUrl is provided in text, or text is a media ID)
            # This is a basic implementation; more complex media handling should be added here
            payload["type"] = "text"
            payload["text"] = {"body": text}

        # Send with retry logic
        async with httpx.AsyncClient() as client:
            for attempt in range(3):
                try:
                    response = await client.post(url, json=payload, headers=headers, timeout=20.0)
                    
                    if response.status_code == 200:
                        logger.info(f"[WhatsApp] Outbound message sent to {to}")
                        return True
                    
                    if response.status_code == 429:
                        wait = (attempt + 1) * 2
                        logger.warning(f"[WhatsApp] Rate limited (429). Retrying in {wait}s...")
                        import asyncio
                        await asyncio.sleep(wait)
                        continue
                        
                    logger.error(f"[WhatsApp] Failed to send message: {response.text}")
                    break
                except Exception as e:
                    logger.error(f"[WhatsApp] Attempt {attempt+1} failed: {str(e)}")
                    if attempt == 2: break
                    import asyncio
                    await asyncio.sleep(1)

        return False

    async def verify_connection(self, token: str, phone_number_id: str):
        """
        Verify WhatsApp connection by calling Meta's Graph API.
        """
        # Use v19.0 or latest
        url = f"https://graph.facebook.com/v19.0/{phone_number_id}"
        headers = {"Authorization": f"Bearer {token}"}
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    # Return useful info for the frontend
                    return {
                        "success": True,
                        "id": data.get("id"),
                        "display_phone_number": data.get("display_phone_number"),
                        "verified_name": data.get("verified_name")
                    }
                logger.error(f"WhatsApp verification failed: {response.text}")
                return {"success": False, "detail": response.text}
            except Exception as e:
                logger.error(f"Error verifying WhatsApp connection: {str(e)}")
                return {"success": False, "detail": str(e)}

    # Legacy support / Placeholder
    async def handle_qr_webhook(self, db: AsyncSession, payload: dict):
        # We focus on Meta Cloud API 
        return True

whatsapp_service = WhatsAppService()

