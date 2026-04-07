"""
Pydantic schemas for Company.
"""

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, HttpUrl

from app.schemas.tag import Tag


class CompanyBase(BaseModel):
    name: str = Field(..., max_length=255)
    website: Optional[str] = Field(None, max_length=255)  # Using str for simpler validation or custom logic
    industry: Optional[str] = Field(None, max_length=100)


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    website: Optional[str] = Field(None, max_length=255)
    industry: Optional[str] = Field(None, max_length=100)


class Company(CompanyBase):
    id: uuid.UUID
    workspace_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    tags: List[Tag] = []

    class Config:
        from_attributes = True
