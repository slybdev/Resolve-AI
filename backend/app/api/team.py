"""
API routes for Team management.
"""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
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


from app.schemas.team import TeamCreate, TeamResponse, TeamMemberResponse, TeamUpdate

@router.get("/{workspace_id}/members", response_model=List[WorkspaceMemberWithUser])
async def list_workspace_members(
    workspace_id: uuid.UUID,
    team_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List workspace members (strictly filtered by functional team)."""
    return await TeamService.get_all_workspace_members(
        db, workspace_id, team_id, current_user.id
    )


# ── Functional Teams (BlackVault) ──

@router.post("/{workspace_id}/functional", response_model=TeamResponse)
async def create_functional_team(
    workspace_id: uuid.UUID,
    team_in: TeamCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a functional team (Security, Billing, etc)."""
    return await TeamService.create_team(db, team_in)


@router.get("/{workspace_id}/functional", response_model=List[TeamResponse])
async def list_functional_teams(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all functional teams in the workspace."""
    return await TeamService.get_teams(db, workspace_id)


@router.patch("/{workspace_id}/functional/{team_id}", response_model=TeamResponse)
async def update_functional_team(
    workspace_id: uuid.UUID,
    team_id: uuid.UUID,
    team_in: TeamUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a functional team."""
    try:
        return await TeamService.update_team(db, team_id, team_in)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{workspace_id}/functional/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_functional_team(
    workspace_id: uuid.UUID,
    team_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a functional team."""
    await TeamService.delete_team(db, team_id)
    return None


@router.post("/{workspace_id}/functional/{team_id}/members/{user_id}", response_model=TeamMemberResponse)
async def add_member_to_functional_team(
    workspace_id: uuid.UUID,
    team_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Assign a user to a functional team."""
    return await TeamService.add_member_to_team(db, team_id, user_id)


@router.delete("/{workspace_id}/functional/{team_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member_from_functional_team(
    workspace_id: uuid.UUID,
    team_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a user from a functional team."""
    await TeamService.remove_member_from_team(db, team_id, user_id)
    return None


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
            team_id=body.team_id,
        )
        return InviteResponse.model_validate(invite)
    except invite_service.InviteError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
