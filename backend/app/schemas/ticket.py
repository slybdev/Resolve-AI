import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field
from app.schemas.auth import UserResponse


class TicketTagBase(BaseModel):
    tag_name: str = Field(..., max_length=50)


class TicketTagResponse(TicketTagBase):
    id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class TeamMemberMiniResponse(BaseModel):
    id: uuid.UUID
    user: UserResponse

    model_config = {"from_attributes": True}


class TeamMiniResponse(BaseModel):
    id: uuid.UUID
    name: str
    members: List[TeamMemberMiniResponse] = []

    model_config = {"from_attributes": True}


class TicketUpdateBase(BaseModel):
    update_type: str = Field(..., max_length=50)
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    note: Optional[str] = None


class TicketSLATrackingResponse(BaseModel):
    id: uuid.UUID
    first_response_due: datetime
    resolution_due: datetime
    first_response_at: Optional[datetime] = None
    first_response_breached: bool
    resolution_breached: bool
    
    model_config = {"from_attributes": True}

class TicketUpdateResponse(TicketUpdateBase):
    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    user: Optional[UserResponse] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TicketBase(BaseModel):
    title: str = Field(..., max_length=255)
    summary: Optional[str] = None
    status: str = Field(default="open", max_length=50)
    priority: str = Field(default="medium", max_length=50)


class TicketCreate(TicketBase):
    conversation_id: uuid.UUID
    workspace_id: uuid.UUID
    assigned_team_id: Optional[uuid.UUID] = None
    created_by_id: Optional[uuid.UUID] = None
    created_by_ai: bool = False
    ai_metadata: Optional[dict] = None


class TicketUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_team_id: Optional[uuid.UUID] = None
    assigned_user_id: Optional[uuid.UUID] = None
    ai_metadata: Optional[dict] = None


class TicketResponse(TicketBase):
    id: uuid.UUID
    conversation_id: uuid.UUID
    workspace_id: uuid.UUID
    assigned_team_id: Optional[uuid.UUID] = None
    assigned_user_id: Optional[uuid.UUID] = None
    created_by_id: Optional[uuid.UUID] = None
    created_by_ai: bool
    ai_metadata: Optional[dict] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    tags: List[TicketTagResponse] = []
    updates: List[TicketUpdateResponse] = []
    sla_tracking: Optional[TicketSLATrackingResponse] = None
    assigned_user: Optional[UserResponse] = None
    assigned_team: Optional[TeamMiniResponse] = None
    
    model_config = {"from_attributes": True}


class TicketNoteCreate(BaseModel):
    note: str = Field(..., min_length=1)


class TicketBulkUpdate(BaseModel):
    ticket_ids: List[uuid.UUID]
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_team_id: Optional[uuid.UUID] = None


class TicketEscalate(BaseModel):
    assigned_team_id: uuid.UUID
    note: Optional[str] = None
