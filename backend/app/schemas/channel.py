"""
Channel schemas — request/response models for channel management.
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.channel import ChannelType


class ChannelBase(BaseModel):
    name: str
    type: ChannelType
    config: dict = Field(default_factory=dict)


class ChannelCreate(ChannelBase):
    name: str = Field(min_length=1, max_length=255)


class ChannelUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    config: Optional[dict] = None
    is_active: Optional[bool] = None


class ChannelResponse(ChannelBase):
    id: uuid.UUID
    is_active: bool
    workspace_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChannelStats(BaseModel):
    total_messages: int = 0
    avg_response_time: float = 0.0  # in minutes
    resolution_rate: float = 0.0    # percentage
    ai_automation_rate: float = 0.0 # percentage


class ChannelVerifyResponse(BaseModel):
    success: bool
    detail: Optional[str] = None
    info: Optional[dict] = None
