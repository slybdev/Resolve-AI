"""
WebSocket API for real-time chat widget communication.
"""

import json
import logging
import uuid
from typing import Dict, List

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.models.channel import Channel, ChannelType
from app.services.routing_service import routing_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws/widget", tags=["Widget WebSocket"])

class ConnectionManager:
    def __init__(self):
        # active_connections: {session_id: [WebSocket]}
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                self.active_connections.pop(session_id, None)

    async def send_to_session(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                await connection.send_json(message)

manager = ConnectionManager()

@router.websocket("/{workspace_id}")
async def widget_websocket_endpoint(
    websocket: WebSocket,
    workspace_id: uuid.UUID,
    session_id: str = "default",  # Provided by client (localStorage)
    db: AsyncSession = Depends(get_db)
):
    # 1. Verify workspace has widget enabled
    result = await db.execute(
        select(Channel).where(
            Channel.workspace_id == workspace_id,
            Channel.type == ChannelType.WIDGET,
            Channel.is_active == True
        )
    )
    channel = result.scalar_one_or_none()
    if not channel:
        # For a better experience, create a default channel if it doesn't exist
        # This allows the dashboard preview and new widgets to work immediately
        channel = Channel(
            workspace_id=workspace_id,
            name="Website Chat",
            type=ChannelType.WIDGET,
            is_active=True,
            config={
                "primary_color": "#3b82f6",
                "theme": "dark",
                "settings": {
                    "title": "XentralDesk Support",
                    "welcome_message": "Hello! How can we help you today?"
                }
            }
        )
        db.add(channel)
        await db.commit()
        await db.refresh(channel)

    await manager.connect(websocket, session_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Handle different message types
            msg_type = message_data.get("type", "message")
            
            if msg_type == "message":
                text = message_data.get("text")
                contact_name = message_data.get("contact_name", "Visitor")
                external_contact_id = session_id  # Use session as unique identifier
                
                # Route message to XentralDesk core
                await routing_service.route_incoming_message(
                    db=db,
                    channel_id=channel.id,
                    external_contact_id=external_contact_id,
                    message_text=text,
                    message_type=message_data.get("message_type", "text"),
                    duration=message_data.get("duration")
                )
                
                # Commit the transaction to save message and any created contacts/conversations
                await db.commit()
                
                # Send ACK
                await websocket.send_json({
                    "type": "ack",
                    "status": "received",
                    "temp_id": message_data.get("temp_id")
                })
                
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, session_id)
