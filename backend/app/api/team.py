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
from app.schemas.workspace import WorkspaceMemberWithUser, InviteCreate, InviteResponse
from app.services.team_service import TeamService
from app.services import invite_service

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

@router.get("/{workspace_id}/me", response_model=WorkspaceMemberWithUser)
async def get_current_member(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's membership info (including allowed_pages)."""
    from sqlalchemy import select
    from app.models.workspace import WorkspaceMember
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(WorkspaceMember)
        .options(selectinload(WorkspaceMember.user))
        .where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == current_user.id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Not a member of this workspace")
    return member


@router.get("/{workspace_id}/invites", response_model=List[InviteResponse])
async def list_pending_invites(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List pending invites for the workspace."""
    from sqlalchemy import select
    from app.models.invite import Invite
    result = await db.execute(
        select(Invite).where(
            Invite.workspace_id == workspace_id,
            Invite.status == "pending"
        )
    )
    return result.scalars().all()


@router.delete("/{workspace_id}/invites/{invite_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_invite(
    workspace_id: uuid.UUID,
    invite_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoke (delete) a pending invite."""
    from sqlalchemy import select
    from app.models.invite import Invite
    result = await db.execute(
        select(Invite).where(
            Invite.id == invite_id,
            Invite.workspace_id == workspace_id,
        )
    )
    invite = result.scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    await db.delete(invite)
    await db.commit()
    return None


@router.post("/{workspace_id}/invite", response_model=InviteResponse, status_code=201)
async def invite_team_member(
    workspace_id: uuid.UUID,
    body: InviteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Invite a new member to the team with role and page access permissions."""
    try:
        invite = await invite_service.create_invite(
            db,
            workspace_id=workspace_id,
            invited_by=current_user.id,
            email=body.email,
            role=body.role,
            allowed_pages=body.allowed_pages,
        )
        return InviteResponse.model_validate(invite)
    except invite_service.InviteError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
