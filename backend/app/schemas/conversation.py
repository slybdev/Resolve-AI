from typing import Optional, List
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class MessageCreate(BaseModel):
    body: str
    message_type: str = "text"
    is_internal: bool = False

class MessageRead(BaseModel):
    id: UUID
    sender_type: str
    body: str
    message_type: str = "text"
    created_at: datetime
    sender_id: Optional[UUID] = None
    is_read: bool = False

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
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
