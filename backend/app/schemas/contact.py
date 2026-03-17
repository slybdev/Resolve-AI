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
    tags: List[Tag] = []

    class Config:
        from_attributes = True
