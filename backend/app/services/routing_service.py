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
        channel_id: uuid.UUID,
        external_contact_id: str,
        contact_name: str,
        message_text: str,
        external_message_id: Optional[str] = None,
    ) -> Message:
        """
        Routes an incoming message from an external channel to a XentralDesk conversation.
        1. Identifies the channel and workspace.
        2. Finds or creates a contact based on external ID.
        3. Finds or creates an active conversation.
        4. Saves the message.
        """
        # 1. Get Channel
        result = await db.execute(select(Channel).where(Channel.id == channel_id))
        channel = result.scalar_one_or_none()
        if not channel:
            raise ValueError(f"Channel {channel_id} not found")

        workspace_id = channel.workspace_id
        channel_type = channel.type.value
        search_key = f"{channel_type}_id"

        # 2. Find or Create Contact
        # Check if we have a contact with this external ID for this workspace
        # MySQL JSON lookup: handles raw string, quoted string, and numeric IDs (for Telegram)
        from sqlalchemy import func, or_, cast, String
        search_path = f"$.{search_key}"
        
        # Determine if external_contact_id is numeric (like Telegram IDs)
        is_numeric = external_contact_id.isdigit()
        
        conditions = [
            func.json_extract(Contact.channel_data, search_path) == external_contact_id,
            func.json_extract(Contact.channel_data, search_path) == f'"{external_contact_id}"'
        ]
        
        if is_numeric:
            # Also try numeric match
            conditions.append(func.json_extract(Contact.channel_data, search_path) == int(external_contact_id))
            # And cast match
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
                name=contact_name,
                workspace_id=workspace_id,
                channel_data={search_key: external_contact_id}
            )
            db.add(contact)
            await db.flush() # Get contact ID

        # 3. Find or Create active Conversation
        result = await db.execute(
            select(Conversation).where(
                Conversation.contact_id == contact.id,
                Conversation.workspace_id == workspace_id,
                Conversation.status == "open"
            ).order_by(Conversation.created_at.desc())
        )
        conversation = result.scalar_one_or_none()

        if conversation:
            # Touch! Update updated_at so it moves to top of list
            from sqlalchemy import func
            conversation.updated_at = func.now()

        if not conversation:
            conversation = Conversation(
                workspace_id=workspace_id,
                contact_id=contact.id,
                status="open"
            )
            db.add(conversation)
            await db.flush() # Get conversation ID

        # 4. Create Message
        message = Message(
            conversation_id=conversation.id,
            sender_type="customer",
            body=message_text,
            channel_id=channel.id,
            external_id=external_message_id,
            message_type="text"
        )
        db.add(message)
        
        # We don't commit here - the caller (webhook handler) should manage the transaction
        await db.flush()
        return message


routing_service = RoutingService()
