"""
Workspace schemas — request/response models for workspace CRUD.
"""

import uuid
from datetime import datetime

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


# ── Responses ──


class WorkspaceMemberResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    workspace_id: uuid.UUID
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkspaceResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    plan: str
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Invite schemas ──


class InviteCreate(BaseModel):
    email: str = Field(max_length=255)
    role: str = Field(default="member", max_length=50)


class InviteAccept(BaseModel):
    token: str


class InviteResponse(BaseModel):
    id: uuid.UUID
    email: str
    workspace_id: uuid.UUID
    role: str
    status: str
    expires_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}
