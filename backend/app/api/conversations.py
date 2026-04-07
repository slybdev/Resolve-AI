"""
API routes for Conversations and Messages.
"""

import uuid
import re
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
from app.models.ticket import Ticket
from app.models.workspace import WorkspaceMember
from app.schemas.conversation import MessageCreate, MessageRead, ConversationRead

router = APIRouter(prefix="/api/v1/conversations", tags=["Conversations"])

@router.get("/", response_model=List[ConversationRead])
async def list_conversations(
    workspace_id: uuid.UUID = Query(...),
    status: Optional[str] = Query(None),
    assigned_to_me: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all conversations for a workspace."""
    # 1. Base Query: Only show conversations with at least one message
    # Base Query: join with Ticket to get assignment status
    query = (
        select(Conversation, Ticket)
        .outerjoin(Ticket, Ticket.conversation_id == Conversation.id)
        .where(Conversation.workspace_id == workspace_id)
        .where(Conversation.messages.any())
        .order_by(desc(Conversation.updated_at))
    )

    if assigned_to_me:
        query = query.where(Ticket.assigned_user_id == current_user.id)
        query = query.where(Ticket.status.in_(['open', 'in_progress']))

    if status:
        query = query.where(Conversation.status == status)
    
    result = await db.execute(query)
    rows = result.all()
    
    from app.services.routing_service import routing_service
    enriched = []
    for row in rows:
        c = row[0]
        t = row[1]
        
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
        
        # Refined last message preview logic
        last_msg_text = "No messages"
        if last_msg:
            msg_type = last_msg.message_type
            body = last_msg.body or ""
            if msg_type == "image" or "uploads/" in body:
                last_msg_text = "Photo 📷"
            elif msg_type == "audio" or msg_type == "voice":
                last_msg_text = "🎙️ Audio"
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
            "assigned_team_id": str(t.assigned_team_id) if t and t.assigned_team_id else None,
            "assigned_to": str(t.assigned_user_id) if t and t.assigned_user_id else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            "routing_mode": await routing_service.calculate_routing_mode(db, c)
        })
    
    return enriched

@router.get("/{conversation_id}", response_model=ConversationRead)
async def get_conversation(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get metadata for a specific conversation."""
    # Fetch conversation and linked ticket
    query = (
        select(Conversation, Ticket)
        .outerjoin(Ticket, Ticket.conversation_id == Conversation.id)
        .where(Conversation.id == conversation_id)
    )
    result = await db.execute(query)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    c = row[0]
    t = row[1]
    
    # ── Permission Check ──
    # 1. Fetch current member roles/perms
    member_res = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == c.workspace_id,
            WorkspaceMember.user_id == current_user.id
        )
    )
    member = member_res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    # Calculate enriched fields
    messages_list = list(c.messages)
    sorted_msgs = sorted(messages_list, key=lambda x: x.created_at)
    last_msg = sorted_msgs[-1] if sorted_msgs else None
    from app.services.routing_service import routing_service
    routing_mode = await routing_service.calculate_routing_mode(db, c)
    
    # Calculate unread count (messages from customer/ai that are not read)
    unread_cnt = len([m for m in c.messages if m.sender_type != "agent" and not m.is_read])
    
    # Determine the channel name
    channel_name = "website"
    for m in c.messages:
        if m.channel and m.channel.type:
            channel_name = m.channel.type.value
            break

    # Get last message for the enriched response
    messages_list = list(c.messages)
    sorted_msgs = sorted(messages_list, key=lambda x: x.created_at)
    last_msg = sorted_msgs[-1] if sorted_msgs else None
    last_msg_text = last_msg.body[:100] if last_msg and last_msg.body else "No messages"
            
    return {
        "id": str(c.id),
        "contact_id": str(c.contact_id) if c.contact_id else None,
        "customerName": c.contact.name if c.contact else "Anonymous",
        "lastMessage": last_msg_text,
        "time": last_msg.created_at.strftime("%H:%M") if last_msg else "Now",
        "isAI": last_msg.sender_type == "ai" if last_msg else False,
        "status": c.status,
        "avatar": f"https://i.pravatar.cc/150?u={c.contact_id}" if c.contact_id else "https://i.pravatar.cc/150?u=anon",
        "channel": channel_name,
        "priority": c.priority,
        "unreadCount": unread_cnt,
        "assigned_team_id": str(t.assigned_team_id) if t and t.assigned_team_id else None,
        "assigned_to": str(t.assigned_user_id) if t and t.assigned_user_id else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        "routing_mode": routing_mode
    }

@router.get("/{conversation_id}/messages", response_model=List[MessageRead])
async def get_conversation_messages(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all messages for a specific conversation and mark as read."""
    # ── Permission Check ──
    conv_res = await db.execute(select(Conversation.workspace_id).where(Conversation.id == conversation_id))
    workspace_id = conv_res.scalar()
    if not workspace_id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    member_res = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == current_user.id
        )
    )
    member = member_res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    # ── Business Logic ──
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

    # ── Permission Check ──
    # 1. Fetch current member roles/perms
    member_res = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == conversation.workspace_id,
            WorkspaceMember.user_id == current_user.id
        )
    )
    member = member_res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    
    # 2. Global Conversation Locking: Check if ticket is assigned to someone else
    ticket_res = await db.execute(select(Ticket).where(Ticket.conversation_id == conversation_id).order_by(desc(Ticket.created_at)))
    ticket = ticket_res.scalars().first()
    
    if ticket and ticket.assigned_user_id and ticket.assigned_user_id != current_user.id:
        # If it's assigned to someone else, but NOT rejected by them
        if ticket.assignment_status != 'rejected':
            raise HTTPException(
                status_code=403, 
                detail=f"This conversation is currently locked by {ticket.assigned_user.full_name if ticket.assigned_user else 'another agent'}."
            )

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
        if channel and (channel.type.value == "widget" or channel.type.value == "website"):
            from app.core.pubsub import pubsub_manager
            event_data = {
                "type": "message.new",
                "conversation_id": str(conversation_id),
                "message": {
                    "id": str(message.id),
                    "sender_type": "agent",
                    "body": payload.body,
                    "created_at": message.created_at.isoformat(),
                    "message_type": message.message_type
                }
            }
            # 1. Broadcast to visitor (Widget)
            await pubsub_manager.publish(f"conv:{conversation_id}", event_data)
            # 2. Broadcast to dashboard (Agents)
            await pubsub_manager.publish(f"ws:{conversation.workspace_id}", event_data)

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
                        # Try to find "Subject: " in the first few lines
                        body_start = last_incoming.body[:500]
                        subject_match = re.search(r"^Subject:\s*(.*)$", body_start, re.MULTILINE | re.IGNORECASE)
                        if subject_match:
                            original_subject = subject_match.group(1).strip()
                            if not original_subject.lower().startswith("re:"):
                                subject = f"Re: {original_subject}"
                            else:
                                subject = original_subject
                        elif last_incoming.message_type == "text" and last_incoming.body:
                             # If no Subject: prefix, use a snippet of the first line
                             first_line = last_incoming.body.split('\n')[0].strip()
                             if len(first_line) > 50:
                                 first_line = first_line[:47] + "..."
                             subject = f"Re: {first_line}"

                    await email_service.send_email(
                        db, channel.id, email_address, subject, payload.body, thread_id=thread_id
                    )

        # WhatsApp
        elif channel and channel.type.value == "whatsapp":
            contact = conversation.contact
            if contact:
                phone_number = contact.channel_data.get("phone_number")
                if not phone_number:
                    # Fallback to whatsapp_id (the JID)
                    phone_number = contact.channel_data.get("whatsapp_id")
                
                if phone_number:
                    from app.services.channels.whatsapp import whatsapp_service
                    await whatsapp_service.send_message(
                        db, channel.id, phone_number, payload.body, payload.message_type or "text"
                    )

    # 4. Satisfy SLA if this is a Support Ticket response
    from app.services.ticket_service import TicketService
    res = await db.execute(
        select(Ticket.id)
        .where(Ticket.conversation_id == conversation_id)
        .order_by(desc(Ticket.created_at))
    )
    ticket_id = res.scalars().first()
    if ticket_id:
        await TicketService.satisfy_first_response(db, ticket_id)

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

from app.schemas.conversation import MessageCreate, MessageRead, ConversationRead, ConversationUpdate

@router.patch("/{conversation_id}", response_model=ConversationRead)
async def update_conversation(
    conversation_id: uuid.UUID,
    conv_in: ConversationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update conversation metadata and sync with ticket."""
    result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Conversation not found")

    update_data = conv_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(c, field, value)
    
    # Sync routing_mode when assignment changes
    if "assigned_to" in update_data:
        if update_data["assigned_to"]:
            if str(c.assigned_to) != str(update_data["assigned_to"]):
                c.routing_mode = "human"
                
                # Fetch agent name
                agent_res = await db.execute(select(User.full_name).where(User.id == update_data["assigned_to"]))
                agent_name = agent_res.scalar_one_or_none() or "An agent"
                
                from app.models.message import Message
                from app.core.pubsub import pubsub_manager
                sys_msg = Message(
                    conversation_id=c.id,
                    sender_type="system",
                    message_type="system",
                    body=f"{agent_name} joined the chat"
                )
                db.add(sys_msg)
                await db.flush()
                
                event_data = {
                    "type": "message.new",
                    "conversation_id": str(c.id),
                    "message": {
                        "id": str(sys_msg.id),
                        "sender_type": "system",
                        "body": sys_msg.body,
                        "created_at": datetime.now().isoformat(),
                        "message_type": "system"
                    }
                }
                await pubsub_manager.publish(f"ws:{c.workspace_id}", event_data)
                await pubsub_manager.publish(f"conv:{c.id}", event_data)
        else:
            c.routing_mode = "ai"
    
    db.add(c)
    await db.commit()
    await db.refresh(c)

    # ── Ticket Synchronization ──
    from app.services.ticket_service import TicketService
    ticket = await TicketService.get_ticket_by_conversation(db, conversation_id)
    if ticket:
        if "status" in update_data and update_data["status"] == "closed":
             from app.schemas.ticket import TicketUpdate as TicketUpdateSchema
             await TicketService.update_ticket(
                 db, 
                 ticket.id, 
                 TicketUpdateSchema(status="resolved"), 
                 user_id=current_user.id
             )
        
        if "assigned_to" in update_data:
             from app.schemas.ticket import TicketUpdate as TicketUpdateSchema
             await TicketService.update_ticket(
                 db, 
                 ticket.id, 
                 TicketUpdateSchema(assigned_user_id=update_data["assigned_to"]), 
                 user_id=current_user.id
             )

    # Return enriched response
    return await get_conversation(conversation_id, db, current_user)

@router.get("/{conversation_id}/suggest-replies", response_model=List[str])
async def get_suggested_replies(
    conversation_id: uuid.UUID,
    workspace_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get 3 AI-suggested replies grounded in the knowledge base.
    """
    from app.services.ai_service import AIService
    return await AIService.suggest_replies(db, workspace_id, conversation_id)
