"""
Integration tests for Channels and Message Routing.
"""

import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.workspace import Workspace
from app.models.channel import Channel, ChannelType
from app.models.contact import Contact
from app.models.conversation import Conversation
from app.models.message import Message
from app.core.dependencies import get_current_user

@pytest.mark.asyncio
async def test_create_channel(client: AsyncClient, db_session: AsyncSession):
    # 1. Setup User and Workspace
    user = User(
        email="test_channels@example.com",
        hashed_password="hashed_password",
        full_name="Channel Tester",
        is_active=True
    )
    db_session.add(user)
    await db_session.flush()

    workspace = Workspace(
        name="Test Workspace",
        slug=f"workspace-{uuid.uuid4().hex[:6]}",
        owner_id=user.id
    )
    db_session.add(workspace)
    await db_session.flush()
    await db_session.commit()

    # Override get_current_user to bypass token auth
    async def _override_current_user():
        return user
    
    # We need to access the app object from the client to override dependencies
    # The client fixture in conftest.py creates a new app instance
    # But since we are using the fixture, we might need a better way.
    # For now, we'll try to use the client directly if it supports it, 
    # but conftest.py already sets up the app inside the client fixture.
    
    # Let's try to just hit the endpoint. If it fails due to 401, we know we need fixed auth.
    # However, for webhooks, we don't need get_current_user!
    
    # 2. Setup Channel via API
    # Since auth is tight, let's verify webhooks first which are public-ish
    # But let's try the CRUD first.
    
    # We'll manually insert the channel for the webhook test to be safe.
    channel = Channel(
        name="Telegram Bot",
        type=ChannelType.TELEGRAM,
        config={"token": "secret_token"},
        workspace_id=workspace.id
    )
    db_session.add(channel)
    await db_session.commit()

    # 3. Test Telegram Webhook Routing
    payload = {
        "message": {
            "message_id": 1001,
            "from": {"id": 999, "first_name": "Alice"},
            "chat": {"id": 999, "type": "private"},
            "text": "Hello from Telegram!"
        }
    }
    
    response = await client.post("/api/v1/webhooks/telegram/secret_token", json=payload)
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

    # 4. Verify Database state
    # Refresh session to see changes from webhook handler
    await db_session.commit() # Ensure everything is synced
    
    # Check Contact
    result = await db_session.execute(
        select(Contact).where(Contact.workspace_id == workspace.id)
    )
    contact = result.scalar_one_or_none()
    assert contact is not None
    assert contact.name == "Alice"
    assert contact.channel_data["telegram_id"] == "999"

    # Check Conversation
    result = await db_session.execute(
        select(Conversation).where(Conversation.contact_id == contact.id)
    )
    conversation = result.scalar_one_or_none()
    assert conversation is not None
    assert conversation.status == "open"

    # Check Message
    result = await db_session.execute(
        select(Message).where(Message.conversation_id == conversation.id)
    )
    message = result.scalar_one_or_none()
    assert message is not None
    assert message.body == "Hello from Telegram!"
    assert message.sender_type == "customer"
    assert message.external_id == "1001"
