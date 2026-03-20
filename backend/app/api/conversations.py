"""
API routes for Conversations and Messages.
"""

import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.user import User
from app.schemas.conversation import MessageCreate, MessageRead, ConversationRead

router = APIRouter(prefix="/api/v1/conversations", tags=["Conversations"])

@router.get("/", response_model=List[ConversationRead])
async def list_conversations(
    workspace_id: uuid.UUID = Query(...),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all conversations for a workspace."""
    query = select(Conversation).where(Conversation.workspace_id == workspace_id)
    if status:
        query = query.where(Conversation.status == status)
    
    query = query.order_by(desc(Conversation.updated_at))
    result = await db.execute(query)
    conversations = result.scalars().all()
    
    enriched = []
    for c in conversations:
        # Sort messages by created_at to get the TRULY last message
        sorted_msgs = sorted(c.messages, key=lambda x: x.created_at)
        last_msg = sorted_msgs[-1] if sorted_msgs else None
        
        # Calculate unread count (messages from customer/ai that are not read)
        unread_cnt = len([m for m in sorted_msgs if m.sender_type != "agent" and not m.is_read])
        
        # Determine the channel name
        channel_name = "website"
        for m in sorted_msgs:
            if m.channel and m.channel.type:
                channel_name = m.channel.type.value
                break
        
        enriched.append({
            "id": str(c.id),
            "contact_id": str(c.contact_id) if c.contact_id else None,
            "customerName": c.contact.name if c.contact else "Anonymous",
            "lastMessage": last_msg.body if last_msg else "No messages",
            "time": last_msg.created_at.strftime("%H:%M") if last_msg else (c.updated_at.strftime("%H:%M") if c.updated_at else "Now"),
            "isAI": last_msg.sender_type == "ai" if last_msg else False,
            "status": c.status,
            "avatar": f"https://i.pravatar.cc/150?u={c.contact_id}" if c.contact_id else "https://i.pravatar.cc/150?u=anon",
            "channel": channel_name,
            "priority": c.priority,
            "unreadCount": unread_cnt,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None
        })
    
    return enriched

@router.get("/{conversation_id}/messages", response_model=List[MessageRead])
async def get_conversation_messages(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all messages for a specific conversation."""
    result = await db.execute(
        select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()
    
    return [
        {
            "id": str(m.id),
            "sender_type": m.sender_type,
            "body": m.body,
            "message_type": m.message_type,
            "created_at": m.created_at.isoformat(),
            "sender_id": str(m.sender_id) if m.sender_id else None
        }
        for m in messages
    ]

@router.post("/{conversation_id}/messages", status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: uuid.UUID,
    payload: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a reply from an agent (dashboard)."""
    # 1. Verify conversation exists
    result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # 2. Create Message
    message = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        sender_type="agent",
        body=payload.body,
        message_type="text" if not payload.is_internal else "note"
    )
    db.add(message)
    
    # Find the last incoming message to identify the channel (before commit)
    last_incoming = None
    if not payload.is_internal:
        last_in_res = await db.execute(
            select(Message).where(
                Message.conversation_id == conversation_id,
                Message.sender_type == "customer"
            ).order_by(desc(Message.created_at))
        )
        last_incoming = last_in_res.scalars().first()

    await db.commit()
    await db.refresh(message)  # Populate server-side fields
    
    # 3. If not internal, send to channel
    if not payload.is_internal and last_incoming and last_incoming.channel_id:
        from app.models.channel import Channel
        res_chan = await db.execute(select(Channel).where(Channel.id == last_incoming.channel_id))
        channel = res_chan.scalar_one_or_none()
        
        if channel and channel.type.value == "widget":
            from app.api.websocket import manager
            await db.refresh(conversation) 
            contact = conversation.contact
            if contact:
                ext_id = contact.channel_data.get("widget_id")
                if ext_id:
                    from app.api.websocket import manager
                    await manager.send_to_session(ext_id, {
                        "id": str(message.id),
                        "type": "message",
                        "body": payload.body,
                        "sender_type": "agent",
                        "created_at": message.created_at.isoformat()
                    })

        elif channel and channel.type.value == "telegram":
            from app.services.channels.telegram import telegram_service
            token = channel.config.get("token")
            contact = conversation.contact
            if token and contact:
                # Use the telegram_id from channel_data
                chat_id = contact.channel_data.get("telegram_id")
                if chat_id:
                    await telegram_service.send_message(token, chat_id, payload.body)

    return {"status": "sent"}

@router.post("/{conversation_id}/read")
async def mark_conversation_as_read(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all messages in a conversation as read."""
    from sqlalchemy import update
    await db.execute(
        update(Message)
        .where(Message.conversation_id == conversation_id)
        .where(Message.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
    return {"status": "success"}
