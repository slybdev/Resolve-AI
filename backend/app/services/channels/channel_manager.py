"""
Channel Manager — Unified interface for sending messages across different channels.
"""

import uuid
import logging
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.conversation import Conversation
from app.models.message import Message
from app.models.channel import Channel, ChannelType

# Import channel services
from app.services.channels.whatsapp import whatsapp_service
from app.services.channels.telegram import telegram_service
from app.services.channels.discord import discord_service
from app.services.channels.slack import slack_service
from app.services.channels.email import email_service
from app.services.channels.facebook import facebook_service
from app.services.channels.instagram import instagram_service

logger = logging.getLogger(__name__)

class ChannelManager:
    async def send_message(
        self,
        db: AsyncSession,
        conversation_id: uuid.UUID,
        body: str,
        sender_id: Optional[uuid.UUID] = None,
        sender_type: str = "agent",
        message_type: str = "text",
        media_url: Optional[str] = None,
        media_type: Optional[str] = None,
        is_internal: bool = False,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Message]:
        """
        Sends a message through the appropriate channel and stores it in the database.
        """
        # 1. Fetch conversation and its primary channel
        result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
        conversation = result.scalar_one_or_none()
        if not conversation:
            logger.error(f"Conversation {conversation_id} not found")
            return None

        # 2. If internal note, just save to DB and return
        if is_internal:
            message = Message(
                conversation_id=conversation_id,
                sender_id=sender_id,
                sender_type=sender_type,
                body=body,
                message_type="note",
                is_read=True
            )
            db.add(message)
            await db.flush()
            return message

        # 3. Identify Channel
        # We need the channel_id for the message record. 
        # Usually, a conversation is linked to a contact which has channel data.
        # For now, we'll try to find the last message's channel or the primary channel configuration.
        
        # Determine target channel type
        target_channel_type = conversation.primary_channel
        
        # 4. Find the active Channel object for this workspace and type
        # In some cases, we might have multiple channels of the same type, 
        # but usually there's one "active" one for the workspace.
        channel_result = await db.execute(
            select(Channel).where(
                Channel.workspace_id == conversation.workspace_id,
                Channel.type == target_channel_type,
                Channel.is_active == True
            )
        )
        channel = channel_result.scalar_one_or_none()
        
        # Fallback: if no specific channel found, but it's 'widget', we proceed (widget doesn't strictly need a Channel row always)
        if not channel and target_channel_type not in ["widget", "website"]:
            logger.warning(f"No active channel found for {target_channel_type} in workspace {conversation.workspace_id}")
            # return None # Or proceed to save to DB anyway?
        
        # 5. Create Message Record (Pending Send)
        message = Message(
            conversation_id=conversation_id,
            sender_id=sender_id,
            sender_type=sender_type,
            body=body,
            message_type=message_type,
            media_url=media_url,
            media_type=media_type,
            channel_id=channel.id if channel else None,
            metadata_json=metadata
        )
        db.add(message)
        await db.flush()

        # 6. Route to specific channel service
        send_success = False
        
        if target_channel_type in ["widget", "website"]:
            # Widget uses WebSockets, handled in the API layer or via a pubsub broadcast
            # We'll return the message and let the caller handle the real-time push for now
            # or we could centralize it here.
            send_success = True
            
        elif target_channel_type == "whatsapp":
            if channel and conversation.contact and conversation.contact.channel_data.get("whatsapp_id"):
                to = conversation.contact.channel_data.get("whatsapp_id")
                send_success = await whatsapp_service.send_message(db, channel.id, to, body, message_type, media_url)
                
        elif target_channel_type == "telegram":
            if channel and conversation.contact and conversation.contact.channel_data.get("telegram_id"):
                to = conversation.contact.channel_data.get("telegram_id")
                send_success = await telegram_service.send_message(db, channel.id, to, body, message_type, media_url)
                
        elif target_channel_type == "discord":
            if channel and conversation.contact and conversation.contact.channel_data.get("discord_id"):
                to = conversation.contact.channel_data.get("discord_id")
                send_success = await discord_service.send_message(db, channel.id, to, body, message_type, media_url)
                
        elif target_channel_type == "slack":
            if channel and conversation.contact and conversation.contact.channel_data.get("slack_id"):
                to = conversation.contact.channel_data.get("slack_id")
                send_success = await slack_service.send_message(db, channel.id, to, body, media_url)
                
        elif target_channel_type == "email":
            if channel and conversation.contact and conversation.contact.channel_data.get("email_id"):
                to = conversation.contact.channel_data.get("email_id")
                # Get last incoming message for thread ID if possible
                # (Logic from api/conversations.py)
                subject = "Re: Support Request" # Placeholder
                send_success = await email_service.send_email(db, channel.id, to, subject, body)
                
        elif target_channel_type == "facebook":
             if channel and conversation.contact and conversation.contact.channel_data.get("facebook_id"):
                to = conversation.contact.channel_data.get("facebook_id")
                send_success = await facebook_service.send_message(db, channel.id, to, body, message_type, media_url)
                
        elif target_channel_type == "instagram":
             if channel and conversation.contact and conversation.contact.channel_data.get("instagram_id"):
                to = conversation.contact.channel_data.get("instagram_id")
                send_success = await instagram_service.send_message(db, channel.id, to, body, message_type, media_url)

        if not send_success and target_channel_type not in ["widget", "website"]:
            logger.error(f"Failed to send message via {target_channel_type}")

        return message

channel_manager = ChannelManager()
