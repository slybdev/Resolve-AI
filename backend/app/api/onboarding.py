"""
Onboarding API routes — /api/v1/onboarding
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.onboarding import (
    OnboardingSetupRequest,
    OnboardingSetupResponse,
    WorkspaceInfo,
)
from app.services import onboarding_service

router = APIRouter(prefix="/api/v1/onboarding", tags=["onboarding"])


@router.post("/setup", response_model=OnboardingSetupResponse, status_code=201)
async def onboarding_setup(
    body: OnboardingSetupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Set up a new workspace during onboarding."""
    workspace = await onboarding_service.setup_workspace(
        db,
        user=current_user,
        workspace_name=body.workspace_name,
        industry=body.industry,
        ai_agent_name=body.ai_agent_name,
        ai_tone=body.ai_tone,
    )
    return OnboardingSetupResponse(
        workspace=WorkspaceInfo.model_validate(workspace),
    )
