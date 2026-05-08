"""
Pydantic schemas for Contact.
"""

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field

from app.schemas.tag import Tag


class ContactBase(BaseModel):
    name: str = Field(..., max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    company_id: Optional[uuid.UUID] = None
    avatar_url: Optional[str] = Field(None, max_length=500)
    title: Optional[str] = Field(None, max_length=255)
    timezone: Optional[str] = Field(None, max_length=100)
    language: Optional[str] = Field(None, max_length=50)
    status: Optional[str] = Field("prospect", max_length=50)
    lifecycle_stage: Optional[str] = Field("lead", max_length=50)
    vip: Optional[bool] = False
    custom_fields: Optional[dict] = None
    metadata_: Optional[dict] = None
    assigned_agent_id: Optional[uuid.UUID] = None


class ContactCreate(ContactBase):
    pass


class ContactUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    company_id: Optional[uuid.UUID] = None


class Contact(ContactBase):
    id: uuid.UUID
    workspace_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    last_seen_at: Optional[datetime] = None
    last_channel_used: Optional[str] = None
    total_conversations: int = 0
    total_tickets: int = 0
    open_tickets_count: int = 0
    avg_response_time: Optional[int] = None
    satisfaction_score: Optional[float] = None
    lifetime_value: float = 0.0
    tags: List[Tag] = []

    class Config:
        from_attributes = True
