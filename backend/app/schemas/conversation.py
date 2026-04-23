from typing import Optional, List
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class MessageCreate(BaseModel):
    body: str
    message_type: str = "text"
    is_internal: bool = False
    media_url: Optional[str] = None
    media_type: Optional[str] = None

class MessageRead(BaseModel):
    id: UUID
    sender_type: str
    body: str
    message_type: str = "text"
    created_at: datetime
    sender_id: Optional[UUID] = None
    is_read: bool = False
    media_url: Optional[str] = None
    media_type: Optional[str] = None

    class Config:
        from_attributes = True

class ConversationRead(BaseModel):
    id: UUID
    contact_id: Optional[UUID] = None
    customerName: str
    lastMessage: str
    time: str
    isAI: bool
    status: str
    avatar: str
    channel: str
    priority: str
    unreadCount: int = 0
    assigned_team_id: Optional[UUID] = None
    assigned_to: Optional[UUID] = None
    updated_at: Optional[datetime] = None
    routing_mode: str = "human"
    identified: bool = False
    customerEmail: Optional[str] = None
    primary_channel: Optional[str] = None
    channels_used: Optional[List[str]] = []

    class Config:
        from_attributes = True

class ConversationUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[UUID] = None
