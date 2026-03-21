"""
Routing Service — maps incoming channel messages to XentralDesk conversations.
"""

import uuid
import logging
from typing import Optional

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.channel import Channel
from app.models.contact import Contact
from app.models.conversation import Conversation
from app.models.message import Message

logger = logging.getLogger(__name__)


class RoutingService:
    async def route_incoming_message(
        self,
        db: AsyncSession,
        channel: Optional[Channel] = None,
        channel_id: Optional[uuid.UUID] = None,
        external_contact_id: str = "",
        external_message_id: str = "",
        message_text: str = "",
        first_name: str = "User",
        last_name: str = "",
        message_type: str = "text",
        duration: Optional[float] = None,
        contact_name: Optional[str] = None
    ) -> Message:
        """
        Routes an incoming message to a conversation.
        """
        # Resolve channel if only ID is provided
        if not channel and channel_id:
            result = await db.execute(select(Channel).where(Channel.id == channel_id))
            channel = result.scalar_one_or_none()
            
        if not channel:
            logger.error("No channel provided to route_incoming_message")
            raise ValueError("No channel provided")

        workspace_id = channel.workspace_id
        channel_type = channel.type.value
        search_key = f"{channel_type}_id"

        # 1. Find or Create Contact
        search_path = f"$.{search_key}"
        is_numeric = external_contact_id.isdigit()
        
        conditions = [
            func.json_extract(Contact.channel_data, search_path) == external_contact_id,
            func.json_extract(Contact.channel_data, search_path) == f'"{external_contact_id}"'
        ]
        if is_numeric:
            conditions.append(func.json_extract(Contact.channel_data, search_path) == int(external_contact_id))
            conditions.append(func.json_unquote(func.json_extract(Contact.channel_data, search_path)) == external_contact_id)

        result = await db.execute(
            select(Contact).where(
                Contact.workspace_id == workspace_id,
                or_(*conditions)
            )
        )
        contact = result.scalar_one_or_none()

        if not contact:
            contact = Contact(
                name=f"{first_name} {last_name}".strip() or f"{channel_type.capitalize()} User",
                workspace_id=workspace_id,
                channel_data={search_key: external_contact_id}
            )
            db.add(contact)
            await db.flush()

        # 2. Find or Create Conversation
        result = await db.execute(
            select(Conversation).where(
                Conversation.workspace_id == workspace_id,
                Conversation.contact_id == contact.id,
                Conversation.status == "open"
            )
        )
        conversation = result.scalar_one_or_none()

        if conversation:
            conversation.updated_at = func.now()
        else:
            conversation = Conversation(
                workspace_id=workspace_id,
                contact_id=contact.id,
                status="open"
            )
            db.add(conversation)
            await db.flush()

        # 4. Create Message
        body = message_text
        if message_type == "voice" and duration is not None:
            body = f"{message_text}|{duration}"

        message = Message(
            conversation_id=conversation.id,
            sender_type="customer",
            body=body,
            channel_id=channel.id,
            external_id=external_message_id,
            message_type=message_type
        )
        db.add(message)
        await db.flush()
        return message


routing_service = RoutingService()
