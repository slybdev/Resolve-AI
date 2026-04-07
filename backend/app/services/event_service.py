import logging
import json
from typing import Optional, Dict, Any
from app.core.pubsub import pubsub_manager
from app.models.message import Message
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

class EventService:
    """
    Handles higher-level event broadcasting across Redis Pub/Sub channels.
    """
    
    async def broadcast_message(self, db: AsyncSession, message: Message):
        """
        Triggered by message_hooks.
        Broadcasts to both conversation-specific (Widget) and workspace-wide (Dashboard) channels.
        """
        # 1. Message Payload
        payload = {
            "type": "message.new",
            "conversation_id": str(message.conversation_id),
            "message": {
                "id": str(message.id),
                "sender_type": message.sender_type,
                "body": message.body,
                "created_at": message.created_at.isoformat() if message.created_at else None,
                "message_type": message.message_type
            }
        }
        
        # 2. Redis Fanning
        # Channel for Widget (Visitor)
        conv_channel = f"conv:{message.conversation_id}"
        await pubsub_manager.publish(conv_channel, payload)
        
        # Channel for Dashboard (Agents)
        ws_channel = f"ws:{message.conversation.workspace_id}"
        await pubsub_manager.publish(ws_channel, payload)
        
        logger.debug(f"EventService: Broadcasted message {message.id} to channels {conv_channel} and {ws_channel}")

    async def broadcast_typing(self, workspace_id: str, conversation_id: str, is_typing: bool, sender_type: str = "customer"):
        """Broadcasts typing indicators."""
        payload = {
            "type": "typing",
            "conversation_id": conversation_id,
            "sender_type": sender_type,
            "is_typing": is_typing
        }
        
        # Dashboard needs to know
        await pubsub_manager.publish(f"ws:{workspace_id}", payload)
        
        # Widget needs to know (if it's the agent typing)
        if sender_type == "agent":
            await pubsub_manager.publish(f"conv:{conversation_id}", payload)

event_service = EventService()
