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
        
        # Sort messages by created_at to get the last NON-SYSTEM message for preview
        messages_list = list(c.messages)
        content_msgs = [m for m in messages_list if m.sender_type != "system"]
        sorted_msgs = sorted(content_msgs, key=lambda x: x.created_at)
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
            "customerName": c.contact.name if c.contact and c.contact.name else "Anonymous",
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
            "routing_mode": await routing_service.calculate_routing_mode(db, c),
            "identified": c.identified or (c.contact and c.contact.email is not None),
            "customerEmail": c.contact.email if c.contact else None,
            "primary_channel": c.primary_channel,
            "channels_used": c.channels_used or []
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
        "customerName": c.contact.name if c.contact and c.contact.name else "Anonymous",
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
        "routing_mode": routing_mode,
        "identified": c.identified or (c.contact and c.contact.email is not None),
        "customerEmail": c.contact.email if c.contact else None,
        "primary_channel": c.primary_channel,
        "channels_used": c.channels_used or []
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
            "is_read": m.is_read,
            "media_url": m.media_url,
            "media_type": m.media_type
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

    # 2. Add message to database & Send to channel via ChannelManager
    from app.services.channels.channel_manager import channel_manager
    message = await channel_manager.send_message(
        db=db,
        conversation_id=conversation_id,
        body=payload.body,
        sender_id=current_user.id,
        sender_type="agent",
        message_type=payload.message_type or "text",
        media_url=payload.media_url,
        media_type=payload.media_type,
        is_internal=payload.is_internal
    )

    if not message:
        raise HTTPException(status_code=500, detail="Failed to send/store message")

    # Update conversation updated_at
    conversation.updated_at = datetime.now()
    
    # 3. Handle Real-Time Broadcasts
    from app.core.pubsub import pubsub_manager
    
    # Broadcast to Dashboard (Always)
    await pubsub_manager.publish(f"ws:{conversation.workspace_id}", {
        "type": "conversation.updated",
        "conversation_id": str(conversation.id),
        "identified": True,
        "customerName": conversation.contact.name if conversation.contact else "Anonymous",
        "customerEmail": conversation.contact.email if conversation.contact else None,
        "contact_id": str(conversation.contact_id) if conversation.contact_id else None
    })

    # Broadcast to Visitor (if Widget and not internal)
    if not payload.is_internal and conversation.primary_channel in ["widget", "website"]:
        event_data = {
            "type": "message.new",
            "conversation_id": str(conversation_id),
            "message": {
                "id": str(message.id),
                "sender_type": "agent",
                "body": payload.body,
                "created_at": message.created_at.isoformat(),
                "message_type": message.message_type,
                "media_url": message.media_url,
                "media_type": message.media_type
            }
        }
        await pubsub_manager.publish(f"conv:{conversation_id}", event_data)

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

    old_assigned_to = c.assigned_to
    old_routing_mode = getattr(c, 'routing_mode', 'ai')
    
    update_data = conv_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(c, field, value)
    
    # Sync routing_mode and send notification when assignment occurs or takeover happens
    if "assigned_to" in update_data and update_data["assigned_to"]:
        # Send notification if it's a NEW assignment OR we are taking over from AI
        is_new_assignment = str(old_assigned_to) != str(update_data["assigned_to"])
        was_ai_mode = (old_routing_mode == 'ai')
        
        if is_new_assignment or was_ai_mode:
            c.assigned_to = update_data["assigned_to"]
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
            # Broadcast to both widget and dashboard
            await pubsub_manager.publish(f"ws:{c.workspace_id}", event_data)
            await pubsub_manager.publish(f"conv:{c.id}", event_data)
    elif "assigned_to" in update_data and not update_data["assigned_to"]:
        c.assigned_to = None
        c.routing_mode = "ai"
        
        # Broadcast 'Agent left' and rating prompt if someone was assigned
        if old_assigned_to:
            from app.models.message import Message
            from app.core.pubsub import pubsub_manager
            
            user_res = await db.execute(select(User.full_name).where(User.id == old_assigned_to))
            agent_name = user_res.scalar_one_or_none() or "Agent"
            
            # 1. Add System Message: Left
            sys_msg = Message(
                conversation_id=c.id,
                sender_type="system",
                message_type="system",
                body=f"{agent_name} left the chat"
            )
            db.add(sys_msg)
            await db.flush()
            
            # 2. Broadcast 'Left' notification
            left_event = {
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
            await pubsub_manager.publish(f"conv:{c.id}", left_event)

            # 3. Broadcast rating prompt
            rating_event = {
                "type": "rating.prompt",
                "agent_id": str(old_assigned_to),
                "agent_name": agent_name,
                "rated_entity_type": "agent",
                "conversation_id": str(c.id)
            }
            await pubsub_manager.publish(f"conv:{c.id}", rating_event)
    
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
