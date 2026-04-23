import json
import logging
import uuid
import asyncio
import datetime
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_user
from app.models.workspace import Workspace
from app.models.conversation import Conversation
from app.models.channel import Channel, ChannelType
from app.core import security
from app.core.pubsub import pubsub_manager
from app.services.event_service import event_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])

async def get_token_from_query(token: str = Query(...)):
    return token

@router.websocket("/ws/widget/{conversation_id}")
async def widget_websocket_endpoint(
    websocket: WebSocket,
    conversation_id: uuid.UUID,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Pro Chat Widget WebSocket.
    Path: /ws/widget/{conversation_id}?token={ws_token}
    """
    # 1. Resolve Conversation & Workspace
    result = await db.execute(
        select(Conversation, Workspace)
        .join(Workspace, Conversation.workspace_id == Workspace.id)
        .where(Conversation.id == conversation_id)
    )
    row = result.first()
    if not row:
        logger.warning(f"WS REJECT: Conversation {conversation_id} not found.")
        await websocket.close(code=1008) # Policy Violation
        return
    
    conversation, workspace = row
    
    # 2. Find Widget Channel
    result = await db.execute(
        select(Channel).where(
            Channel.workspace_id == workspace.id,
            Channel.type == ChannelType.WIDGET
        )
    )
    channel = result.scalars().first()
    
    secret_key = security.decrypt_secret_key(workspace.encrypted_secret_key)
    prev_key = None
    if workspace.encrypted_previous_secret_key and workspace.previous_key_expires_at:
        if datetime.datetime.now(datetime.timezone.utc) < workspace.previous_key_expires_at:
            prev_key = security.decrypt_secret_key(workspace.encrypted_previous_secret_key)

    # 2. Authenticate Token
    payload = security.verify_widget_token(token, secret_key, prev_key)
    if not payload:
        logger.warning(f"WS REJECT: Invalid or expired token for conversation {conversation_id}")
        await websocket.close(code=1008)
        return
    
    if payload.get("sub") != str(conversation_id):
        logger.warning(f"WS REJECT: Token sub mismatch for conversation {conversation_id}")
        await websocket.close(code=1008)
        return

    # 3. Accept Connection
    await websocket.accept()
    
    # 4. Subscribe to Redis Channel
    redis_channel = f"conv:{conversation_id}"
    pubsub = await pubsub_manager.subscribe(redis_channel)
    
    async def listen_to_redis():
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    # Send to client
                    await websocket.send_json(data)
        except Exception as e:
            logger.error(f"WS REDIS ERROR: {e}")
        finally:
            await pubsub.unsubscribe(redis_channel)

    # Start redis listener task
    listener_task = asyncio.create_task(listen_to_redis())

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            msg_type = message.get("type")
            
            if msg_type == "message.send":
                from app.models.message import Message
                
                content = message.get("content")
                client_id = message.get("client_id")
                media_url = message.get("media_url")
                msg_type_incoming = message.get("message_type") or "text"
                
                if not content and not media_url:
                    continue

                # 1. Persist Message
                new_msg = Message(
                    conversation_id=conversation_id,
                    sender_type="customer",
                    body=content or (f"[{msg_type_incoming.capitalize()}]" if media_url else ""),
                    message_type=msg_type_incoming,
                    media_url=media_url,
                    media_type=msg_type_incoming if msg_type_incoming != "text" else None,
                    channel_id=channel.id if channel else None,
                    external_id=client_id or str(uuid.uuid4())
                )
                db.add(new_msg)
                await db.commit()
                await db.refresh(new_msg)

                # 2. Update Conversation timestamp
                conversation.updated_at = datetime.datetime.now()
                await db.commit()

                # 3. Notify Dashboard (Agents)
                payload = {
                    "type": "message.new",
                    "conversation_id": str(conversation_id),
                    "workspace_id": str(workspace.id),
                    "message": {
                        "id": str(new_msg.id),
                        "body": new_msg.body,
                        "sender_type": "customer",
                        "message_type": new_msg.message_type,
                        "media_url": new_msg.media_url,
                        "created_at": new_msg.created_at.isoformat(),
                        "client_id": client_id
                    }
                }
                # Broadcast to agents
                await pubsub_manager.publish(f"ws:{workspace.id}", payload)
                # Broadcast back to the conversation room (for de-duplication and other tabs)
                await pubsub_manager.publish(f"conv:{conversation_id}", payload)

                # 4. Acknowledge to Widget (Self) - converts 'sending' to 'sent'
                from app.models.ticket import Ticket
                result = await db.execute(select(Ticket.id, Ticket.status).where(Ticket.conversation_id == conversation_id))
                ticket_data = result.first()
                ticket_id = ticket_data.id if ticket_data else None
                ticket_status = ticket_data.status if ticket_data else None

                await websocket.send_json({
                    "type": "message.ack",
                    "client_id": client_id,
                    "server_id": str(new_msg.id),
                    "ticket_id": str(ticket_id) if ticket_id else None,
                    "ticket_status": ticket_status
                })

                # 5. Trigger AI/Automations
                # CRITICAL: Refresh conversation from DB to get the latest assigned_to
                # (it may have been changed by the dashboard since WS connection opened)
                from app.services.routing_service import routing_service
                from app.services.message_hooks import on_message_received
                await db.refresh(conversation)
                conversation.routing_mode = await routing_service.calculate_routing_mode(db, conversation)
                db.add(conversation)
                await db.commit()
                
                # Attach the LIVE conversation object to the message so AI handler
                # doesn't re-fetch a stale copy from the session cache
                new_msg.conversation = conversation
                logger.debug(f"DEBUG: Triggering on_message_received hooks for msg {new_msg.id}")
                await on_message_received(db, new_msg)
                logger.debug(f"DEBUG: Hook execution finished for msg {new_msg.id}")
                await db.commit()

            elif msg_type == "typing":
                await event_service.broadcast_typing(
                    workspace_id=str(workspace.id),
                    conversation_id=str(conversation_id),
                    is_typing=message.get("is_typing", False),
                    sender_type="customer"
                )
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        logger.info(f"WS DISCONNECT: Widget user left conversation {conversation_id}")
    finally:
        listener_task.cancel()
        await pubsub_manager.publish(redis_channel, {"type": "system", "message": "visitor_disconnected"})

@router.websocket("/ws/dashboard/{workspace_id}")
async def dashboard_websocket_endpoint(
    websocket: WebSocket,
    workspace_id: uuid.UUID,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Dashboard real-time WebSocket for Agents.
    Path: /ws/dashboard/{workspace_id}?token={ws_token}
    """
    # 1. Authenticate Agent (via dashboard WS token)
    payload = security.verify_dashboard_ws_token(token)
    if not payload:
        await websocket.close(code=1008) # Policy Violation
        return
        
    # 2. Check Workspace ID match (Security check)
    if payload.get("wid") != str(workspace_id):
        await websocket.close(code=1008)
        return

    user_id = payload.get("sub")
    
    # Track presence if we have a valid user
    from app.services.routing_logic_services import presence_service
    await presence_service.heartbeat(user_id)

    # 3. Accept
    await websocket.accept()
    
    # 3. Subscribe to Workspace Channel
    redis_channel = f"ws:{workspace_id}"
    pubsub = await pubsub_manager.subscribe(redis_channel)
    
    async def listen_to_redis():
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    await websocket.send_json(data)
        except Exception as e:
            logger.error(f"WS DASHBOARD REDIS ERROR: {e}")
        finally:
            await pubsub.unsubscribe(redis_channel)

    listener_task = asyncio.create_task(listen_to_redis())

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            msg_type = message.get("type")
            
            if msg_type == "typing":
                # Agent typing
                conv_id = message.get("conversation_id")
                if conv_id:
                    await event_service.broadcast_typing(
                        workspace_id=str(workspace_id),
                        conversation_id=str(conv_id),
                        is_typing=message.get("is_typing", False),
                        sender_type="agent"
                    )
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        logger.info(f"WS DISCONNECT: Agent disconnected from workspace {workspace_id}")
    finally:
        listener_task.cancel()

# Maintain backwards compatibility for existing paths (optional, but good for migration)
from app.api.websocket import widget_websocket_endpoint as widget_ws
# These would be mapped in app/main.py
