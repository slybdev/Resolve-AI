"""
Workspace schemas — request/response models for workspace CRUD.
"""

import uuid
from datetime import datetime

from typing import List, Optional

from pydantic import BaseModel, Field


# ── Requests ──


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str | None = Field(
        default=None,
        max_length=255,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
        description="URL-friendly slug; auto-generated from name if omitted",
    )


class WorkspaceUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    slug: str | None = Field(
        default=None,
        max_length=255,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
    )
    plan: str | None = Field(default=None, max_length=50)
    ai_system_prompt: str | None = Field(default=None, max_length=1000)
    ai_tone: str | None = Field(default=None, max_length=50)


# ── Responses ──


class WorkspaceMemberResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    workspace_id: uuid.UUID
    role: str
    allowed_pages: Optional[List[str]] = []
    created_at: datetime

    model_config = {"from_attributes": True}


from app.schemas.auth import UserResponse


class WorkspaceMemberWithUser(WorkspaceMemberResponse):
    user: UserResponse | None = None


class WorkspaceResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    plan: str
    owner_id: uuid.UUID
    ai_system_prompt: Optional[str] = None
    ai_tone: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Invite schemas ──


class InviteCreate(BaseModel):
    email: str = Field(max_length=255)
    role: str = Field(default="member", max_length=50)
    allowed_pages: List[str] = Field(default_factory=list)


class InviteAccept(BaseModel):
    token: str


class InviteResponse(BaseModel):
    id: uuid.UUID
    email: str
    workspace_id: uuid.UUID
    role: str
    status: str
    token: str
    allowed_pages: Optional[List[str]] = []
    expires_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class BusinessHourResponse(BaseModel):
    id: uuid.UUID
    day_of_week: int
    open_time: str | None = None
    close_time: str | None = None
    is_closed: bool
    workspace_id: uuid.UUID

    model_config = {"from_attributes": True}


class APIKeyResponse(BaseModel):
    id: uuid.UUID
    name: str
    key_prefix: str
    is_active: bool
    # Plain text key only returned once on creation
    plain_key: str | None = None
    workspace_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}
