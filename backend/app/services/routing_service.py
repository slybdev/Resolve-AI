"""
Routing Service — maps incoming channel messages to XentralDesk conversations.
"""

import uuid
import logging
from typing import Optional

from sqlalchemy import select, func, or_, cast, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.channel import Channel
from app.models.contact import Contact
from app.models.conversation import Conversation
from app.models.message import Message

logger = logging.getLogger(__name__)


from app.services.routing_logic_services import business_hours_service, presence_service

class RoutingService:
    async def calculate_routing_mode(self, db: AsyncSession, conversation: Conversation) -> str:
        """
        Determines the current routing mode based on 4-rule logic:
        1. Human (if assigned and 'Claimed' or manually engaged)
        2. Business Hours (Offline mode)
        3. AI (Default First Line)
        """
        from app.models.workspace import Workspace
        from app.models.ticket import Ticket
        from app.models.message import Message

        workspace = await db.get(Workspace, conversation.workspace_id)
        if workspace:
            await db.refresh(workspace)
        is_ai_enabled = workspace.is_ai_enabled if workspace else False

        # 1. Assigned Human Agent & Engagement Check
        if conversation.assigned_to:
            # If agent is assigned, always default to Human mode
            # This ensures the AI stays silent regardless of real-time presence
            return "human"

        # 2. Business Hours check
        if not await business_hours_service.is_open(db, conversation.workspace_id):
            return "offline_collection"
            
        # 3. Default to AI
        return "ai"

    async def route_incoming_message(
        self,
        db: AsyncSession,
        channel: Optional[Channel] = None,
        channel_id: Optional[uuid.UUID] = None,
        external_contact_id: str = "",
        external_message_id: Optional[str] = None,
        message_text: str = "",
        first_name: str = "User",
        last_name: str = "",
        message_type: str = "text",
        duration: Optional[float] = None,
        contact_name: Optional[str] = None
    ) -> tuple[Optional[Message], Conversation]:
        """
        Routes an incoming message to a conversation and determines the routing mode.
        """
        # (Resolving channel, contact, and conversation - keeping current logic)
        if not channel and channel_id:
            result = await db.execute(select(Channel).where(Channel.id == channel_id))
            channel = result.scalar_one_or_none()
            
        if not channel:
            logger.error("No channel provided to route_incoming_message")
            raise ValueError("No channel provided")

        workspace_id = channel.workspace_id
        channel_type = channel.type.value
        search_key = f"{channel_type}_id"

        result = await db.execute(
            select(Contact).where(
                Contact.workspace_id == workspace_id,
                func.json_extract_path_text(Contact.channel_data, search_key) == external_contact_id
            )
        )
        contact = result.scalars().first()

        if not contact:
            new_name = contact_name or f"{first_name} {last_name}".strip() or f"{channel_type.capitalize()} User"
            contact = Contact(
                name=new_name,
                workspace_id=workspace_id,
                channel_data={search_key: external_contact_id}
            )
            db.add(contact)
            await db.flush()

        result = await db.execute(
            select(Conversation).where(
                Conversation.workspace_id == workspace_id,
                Conversation.contact_id == contact.id,
                Conversation.status == "open"
            )
        )
        conversation = result.scalars().first()

        if conversation:
            await db.refresh(conversation) # CRITICAL: Ensure we have the latest assigned_to status from DB
            conversation.updated_at = func.now()
        else:
            conversation = Conversation(
                workspace_id=workspace_id,
                contact_id=contact.id,
                status="open"
            )
            db.add(conversation)
            await db.flush()
            await db.refresh(conversation)

        # --- Dynamic Mode Update ---
        # Current routing state determines how the message is handled
        old_mode = conversation.routing_mode
        conversation.routing_mode = await self.calculate_routing_mode(db, conversation)
        
        if old_mode != conversation.routing_mode:
            logger.info(f"Routing mode shifted: {old_mode} -> {conversation.routing_mode} (Conv: {conversation.id})")

        # Create Message
        if not message_text and message_type == "system":
            return None, conversation

        body = message_text
        if message_type == "voice" and duration is not None:
            body = f"{message_text}|{duration}"

        message = Message(
            conversation_id=conversation.id,
            sender_type="customer",
            body=body,
            channel_id=channel.id,
            external_id=external_message_id or None,
            message_type=message_type
        )
        # Fix: Explicitly associate the conversation object to prevent re-fetching/lazy-loading in hooks
        message.conversation = conversation
        
        db.add(conversation)
        db.add(message)
        await db.flush()

        # Trigger Hooks
        from app.services.message_hooks import on_message_received
        try:
            await on_message_received(db, message)
            await db.commit()
        except Exception as e:
            logger.error(f"Message hooks failed to process event: {e}")

        return message, conversation


routing_service = RoutingService()
