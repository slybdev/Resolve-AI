"""
API routes for Team management.
"""

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.workspace import WorkspaceMemberWithUser
from app.services.team_service import TeamService

router = APIRouter(prefix="/api/v1/team", tags=["Team"])


class RoleUpdate(BaseModel):
    role: str


@router.get("/{workspace_id}/members", response_model=List[WorkspaceMemberWithUser])
async def list_team_members(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all members in the workspace."""
    # Note: In a real app, we should check if current_user is a member of this workspace
    return await TeamService.get_team_members(db, workspace_id)


@router.patch("/{workspace_id}/members/{user_id}", response_model=WorkspaceMemberWithUser)
async def update_member_role(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    role_in: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a team member's role."""
    try:
        return await TeamService.update_member_role(db, workspace_id, user_id, role_in.role)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_team_member(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a member from the team."""
    await TeamService.remove_member(db, workspace_id, user_id)
    return None
