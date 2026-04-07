import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field
from app.schemas.auth import UserResponse


class TeamBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    allowed_pages: List[str] = Field(default_factory=list)


class TeamCreate(TeamBase):
    workspace_id: uuid.UUID


class TeamUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    allowed_pages: Optional[List[str]] = None


class TeamMemberBase(BaseModel):
    user_id: uuid.UUID
    role: str = Field("member", pattern="^(member|lead)$")


class TeamMemberCreate(TeamMemberBase):
    team_id: uuid.UUID


class TeamMemberResponse(TeamMemberBase):
    id: uuid.UUID
    team_id: uuid.UUID
    user: Optional[UserResponse] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TeamResponse(TeamBase):
    id: uuid.UUID
    workspace_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    members: List[TeamMemberResponse] = []

    model_config = {"from_attributes": True}
