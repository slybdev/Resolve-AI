"""
Routing Service — maps incoming channel messages to XentralDesk conversations.
"""

import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.channel import Channel
from app.models.contact import Contact
from app.models.conversation import Conversation
from app.models.message import Message


class RoutingService:
    async def route_incoming_message(
        self,
        db: AsyncSession,
        channel: Channel,
        external_contact_id: str,
        external_message_id: str,
        message_text: str,
        first_name: str = "User",
        last_name: str = "",
        message_type: str = "text"
    ) -> Message:
        """
        Routes an incoming message to a conversation.
        """
        workspace_id = channel.workspace_id
        channel_type = channel.type.value
        search_key = f"{channel_type}_id"

        # 1. Find or Create Contact
        from sqlalchemy import func, or_
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
            from sqlalchemy import func as sql_func
            conversation.updated_at = sql_func.now()
        else:
            conversation = Conversation(
                workspace_id=workspace_id,
                contact_id=contact.id,
                status="open"
            )
            db.add(conversation)
            await db.flush()

        # 4. Create Message
        message = Message(
            conversation_id=conversation.id,
            sender_type="customer",
            body=message_text,
            channel_id=channel.id,
            external_id=external_message_id,
            message_type=message_type
        )
        db.add(message)
        await db.flush()
        return message


routing_service = RoutingService()
