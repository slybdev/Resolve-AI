import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.channel import Channel, ChannelType
from app.models.user import User
from app.models.workspace import Workspace
from app.core.config import get_settings

@pytest.mark.asyncio
async def test_facebook_webhook_verification(client: AsyncClient):
    """Test Facebook hub-style verification (GET)."""
    settings = get_settings()
    params = {
        "hub.mode": "subscribe",
        "hub.challenge": "987654321",
        "hub.verify_token": settings.WHATSAPP_VERIFY_TOKEN
    }
    response = await client.get("/api/v1/webhooks/facebook", params=params)
    assert response.status_code == 200
    assert response.json() == 987654321

@pytest.mark.asyncio
async def test_facebook_webhook_ingestion(client: AsyncClient, db_session: AsyncSession):
    """Test Facebook message ingestion (POST)."""
    # 1. Setup User and Workspace
    user = User(
        email="fb_tester@example.com",
        hashed_password="hashed_password",
        full_name="FB Tester",
        is_active=True
    )
    db_session.add(user)
    await db_session.flush()

    workspace = Workspace(
        name="FB Workspace",
        slug=f"fb-workspace-{uuid.uuid4().hex[:6]}",
        owner_id=user.id
    )
    db_session.add(workspace)
    await db_session.flush()

    # 2. Create a Facebook channel
    channel = Channel(
        name="Test Facebook",
        type=ChannelType.FACEBOOK,
        workspace_id=workspace.id,
        config={"facebook_page_id": "fb_page_123", "access_token": "token_fb_abc"},
        is_active=True
    )
    db_session.add(channel)
    await db_session.commit()

    # 3. Simulate Facebook Webhook Payload
    payload = {
        "object": "page",
        "entry": [
            {
                "id": "fb_page_123",
                "time": 1648000000,
                "messaging": [
                    {
                        "sender": {"id": "fb_user_456"},
                        "recipient": {"id": "fb_page_123"},
                        "timestamp": 1648000001,
                        "message": {
                            "mid": "fb_msg_1",
                            "text": "Hello from Facebook Messenger!"
                        }
                    }
                ]
            }
        ]
    }

    response = await client.post("/api/v1/webhooks/facebook", json=payload)
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

    # 4. Verify database state
    from app.models.contact import Contact
    from app.models.conversation import Conversation
    from app.models.message import Message

    # Check contact
    result = await db_session.execute(select(Contact).where(Contact.workspace_id == workspace.id))
    contact = result.scalar_one_or_none()
    assert contact is not None
    assert contact.channel_data.get("facebook_id") == "fb_user_456"

    # Check conversation
    result = await db_session.execute(select(Conversation).where(Conversation.contact_id == contact.id))
    conv = result.scalar_one_or_none()
    assert conv is not None

    # Check message
    result = await db_session.execute(select(Message).where(Message.conversation_id == conv.id))
    msg = result.scalar_one_or_none()
    assert msg is not None
    assert msg.body == "Hello from Facebook Messenger!"
    assert msg.sender_type == "customer"
