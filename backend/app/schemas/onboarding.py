"""
Onboarding schemas — request/response models for workspace onboarding setup.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class OnboardingSetupRequest(BaseModel):
    workspace_name: str = Field(min_length=1, max_length=255)
    company_description: str | None = Field(default=None, max_length=400)
    industry: str | None = Field(default=None, max_length=100)
    ai_agent_name: str | None = Field(default="XentralDesk Assistant", max_length=255)
    ai_tone: str | None = Field(
        default="professional",
        description="AI response tone: professional, friendly, formal",
    )
    ai_custom_instructions: str | None = Field(default=None, max_length=2000)

    @field_validator("company_description")
    @classmethod
    def validate_description_length(cls, v: str | None) -> str | None:
        if v and len(v) > 400:
            raise ValueError("Company description must not exceed 400 characters")
        return v


class OnboardingSetupResponse(BaseModel):
    workspace: "WorkspaceInfo"
    message: str = "Onboarding complete"


class WorkspaceInfo(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    plan: str
    created_at: datetime

    model_config = {"from_attributes": True}
