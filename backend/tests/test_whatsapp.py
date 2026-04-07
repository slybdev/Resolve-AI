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

@pytest.mark.asyncio
async def test_whatsapp_webhook_verification(client: AsyncClient):
    # Test Meta webhook verification challenge
    params = {
        "hub.mode": "subscribe",
        "hub.challenge": "123456789",
        "hub.verify_token": "xentraldesk_verify_token"
    }
    response = await client.get("/api/v1/webhooks/whatsapp", params=params)
    assert response.status_code == 200
    assert response.json() == 123456789

@pytest.mark.asyncio
async def test_whatsapp_webhook_ingestion(client: AsyncClient, db_session: AsyncSession):
    # 1. Setup User and Workspace
    user = User(
        email="wa_tester@example.com",
        hashed_password="hashed_password",
        full_name="WA Tester",
        is_active=True
    )
    db_session.add(user)
    await db_session.flush()

    workspace = Workspace(
        name="WA Workspace",
        slug=f"wa-workspace-{uuid.uuid4().hex[:6]}",
        owner_id=user.id
    )
    db_session.add(workspace)
    await db_session.flush()

    # 2. Setup WhatsApp Channel
    channel = Channel(
        name="My WhatsApp",
        type=ChannelType.WHATSAPP,
        config={"phone_number_id": "12345", "access_token": "valid_token"},
        workspace_id=workspace.id
    )
    db_session.add(channel)
    await db_session.commit()

    # 3. Test Webhook Ingestion
    payload = {
        "entry": [{
            "changes": [{
                "value": {
                    "metadata": {"phone_number_id": "12345"},
                    "messages": [{
                        "from": "1234567890",
                        "id": "wa_msg_001",
                        "text": {"body": "Hello from WhatsApp!"}
                    }]
                }
            }]
        }]
    }
    
    response = await client.post("/api/v1/webhooks/whatsapp", json=payload)
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

    # 4. Verify Database state
    # We need to refresh or fetch again to see changes from the background task/handler
    result = await db_session.execute(
        select(Message).where(Message.external_id == "wa_msg_001")
    )
    message = result.scalar_one_or_none()
    assert message is not None
    assert message.body == "Hello from WhatsApp!"
    assert message.sender_type == "customer"
