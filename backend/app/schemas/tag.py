"""
Pydantic schemas for Tag.
"""

import uuid
from typing import Optional

from pydantic import BaseModel, Field


class TagBase(BaseModel):
    name: str = Field(..., max_length=50)
    color: str = Field("#6366f1", max_length=7, pattern=r"^#[0-9a-fA-F]{6}$")


class TagCreate(TagBase):
    pass


class TagUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=50)
    color: Optional[str] = Field(None, max_length=7, pattern=r"^#[0-9a-fA-F]{6}$")


class Tag(TagBase):
    id: uuid.UUID
    workspace_id: uuid.UUID

    class Config:
        from_attributes = True
