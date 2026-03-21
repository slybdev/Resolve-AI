"""
API routes for Conversations and Messages.
"""

import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, desc, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.channel import Channel
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
        messages_list = list(c.messages)
        sorted_msgs = sorted(messages_list, key=lambda x: x.created_at)
        last_msg = sorted_msgs[-1] if sorted_msgs else None
        
        # Calculate unread count (messages from customer/ai that are not read)
        unread_cnt = len([m for m in messages_list if m.sender_type != "agent" and not m.is_read])
        
        # Determine the channel name
        channel_name = "website"
        for m in messages_list:
            if m.channel and m.channel.type:
                channel_name = m.channel.type.value
                break
        
        # Refined last message preview logic with icons and duration
        last_msg_text = "No messages"
        if last_msg:
            msg_type = last_msg.message_type
            body = last_msg.body or ""
            
            if msg_type == "image" or "uploads/" in body:
                last_msg_text = "Photo 📷"
            elif msg_type == "audio" or msg_type == "voice":
                duration_part = ""
                # Parse duration metadata if present (stored as url|duration)
                if "|" in body:
                    try:
                        _, dur_val = body.split("|", 1)
                        total_seconds = int(float(dur_val))
                        minutes = total_seconds // 60
                        seconds = total_seconds % 60
                        duration_part = f"{minutes}:{seconds:02} "
                    except:
                        pass
                last_msg_text = f"{duration_part}🎙️ Audio"
            elif msg_type == "video":
                last_msg_text = "Video 🎥"
            elif msg_type == "file":
                last_msg_text = "File 📄"
            elif msg_type == "sticker":
                last_msg_text = "Sticker ✨"
            elif msg_type == "text":
                last_msg_text = body[:100] if body else "No messages"
            else:
                last_msg_text = body[:100] if body else "No messages"

        enriched.append({
            "id": str(c.id),
            "contact_id": str(c.contact_id) if c.contact_id else None,
            "customerName": c.contact.name if c.contact else "Anonymous",
            "lastMessage": last_msg_text,
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
    """Get all messages for a specific conversation and mark as read."""
    # 1. Mark as read immediately when viewed
    await db.execute(
        update(Message)
        .where(Message.conversation_id == conversation_id)
        .where(Message.sender_type != "agent")
        .where(Message.is_read == False)
        .values(is_read=True)
    )
    await db.commit()

    # 2. Fetch messages
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
            "sender_id": str(m.sender_id) if m.sender_id else None,
            "is_read": m.is_read
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
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"send_message called: body={payload.body[:50] if payload.body else 'EMPTY'}... message_type={payload.message_type}")
    
    # 1. Verify conversation exists
    result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # 2. Add message to database
    # Find the last incoming message to identify the channel
    last_in_res = await db.execute(
        select(Message).where(
            Message.conversation_id == conversation_id,
            Message.sender_type == "customer"
        ).order_by(desc(Message.created_at))
    )
    last_incoming = last_in_res.scalars().first()
    channel_id = last_incoming.channel_id if last_incoming else None

    message = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        sender_type="agent",
        body=payload.body,
        message_type=payload.message_type if (not payload.is_internal and payload.message_type) else "text" if not payload.is_internal else "note",
        channel_id=channel_id
    )
    db.add(message)
    await db.flush()

    # Update conversation updated_at
    conversation.updated_at = datetime.now()
    
    # 3. If not internal, send to channel
    if not payload.is_internal:
        channel = await db.get(Channel, channel_id) if channel_id else None
        
        # For Chat Widget, send to active WebSocket session
        if channel and channel.type.value == "widget":
            contact = conversation.contact
            if contact:
                # widget_id is stored in channel_data for the contact
                ext_contact_id = contact.channel_data.get("widget_id")
                if ext_contact_id:
                    from app.api.websocket import manager
                    await manager.send_to_session(ext_contact_id, {
                        "id": str(message.id),
                        "type": "message",
                        "body": payload.body,
                        "sender_type": "agent",
                        "created_at": message.created_at.isoformat()
                    })

        # Telegram
        elif channel and channel.type.value == "telegram":
            contact = conversation.contact
            if contact:
                chat_id = contact.channel_data.get("telegram_id")
                if chat_id:
                    from app.services.channels.telegram import telegram_service
                    await telegram_service.send_message(db, channel.id, chat_id, payload.body, payload.message_type)
        
        # Discord
        elif channel and channel.type.value == "discord":
            contact = conversation.contact
            if contact:
                # Use the discord_id (Channel ID) from channel_data
                discord_channel_id = contact.channel_data.get("discord_id")
                if discord_channel_id:
                    from app.services.channels.discord import discord_service
                    await discord_service.send_message(db, channel.id, discord_channel_id, payload.body, payload.message_type)
        
        # Slack
        elif channel and channel.type.value == "slack":
            contact = conversation.contact
            if contact:
                slack_user_id = contact.channel_data.get("slack_id")
                if slack_user_id:
                    from app.services.channels.slack import slack_service
                    await slack_service.send_message(db, channel.id, slack_user_id, payload.body)
                    
        # Email
        elif channel and channel.type.value == "email":
            contact = conversation.contact
            if contact:
                email_address = contact.channel_data.get("email_id")
                if email_address:
                    from app.services.channels.email import email_service
                    
                    thread_id = last_incoming.external_id if last_incoming else None
                    subject = "Re: Support Request"
                    if last_incoming and last_incoming.body:
                        first_line = last_incoming.body.split('\n')[0]
                        if first_line.startswith("Subject: "):
                            original_subject = first_line.replace("Subject: ", "").strip()
                            if not original_subject.lower().startswith("re:"):
                                subject = f"Re: {original_subject}"
                            else:
                                subject = original_subject

                    await email_service.send_email(
                        db, channel.id, email_address, subject, payload.body, thread_id=thread_id
                    )

    return {"status": "sent"}

@router.post("/{conversation_id}/read")
async def mark_conversation_as_read(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all messages in a conversation as read."""
    await db.execute(
        update(Message)
        .where(Message.conversation_id == conversation_id)
        .where(Message.sender_type != "agent")
        .where(Message.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
    return {"status": "success"}
