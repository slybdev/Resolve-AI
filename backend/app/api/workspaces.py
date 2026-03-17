"""
Workspace API routes — /api/v1/workspaces
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.schemas.workspace import (
    InviteCreate,
    InviteResponse,
    WorkspaceCreate,
    WorkspaceResponse,
    WorkspaceUpdate,
)
from app.services import invite_service
from app.services.onboarding_service import _generate_unique_slug, _slugify

router = APIRouter(prefix="/api/v1/workspaces", tags=["workspaces"])


@router.post("", response_model=WorkspaceResponse, status_code=201)
async def create_workspace(
    body: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new workspace."""
    slug = body.slug or await _generate_unique_slug(db, _slugify(body.name))

    # Check slug uniqueness if provided
    if body.slug:
        result = await db.execute(
            select(Workspace).where(Workspace.slug == body.slug)
        )
        if result.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Slug already in use")

    workspace = Workspace(
        name=body.name,
        slug=slug,
        owner_id=current_user.id,
    )
    db.add(workspace)
    await db.flush()

    # Add creator as owner member
    member = WorkspaceMember(
        user_id=current_user.id,
        workspace_id=workspace.id,
        role="owner",
    )
    db.add(member)
    await db.flush()

    return WorkspaceResponse.model_validate(workspace)


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a workspace by ID (must be a member)."""
    result = await db.execute(
        select(Workspace).where(Workspace.id == workspace_id)
    )
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Verify membership
    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.user_id == current_user.id,
            WorkspaceMember.workspace_id == workspace_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this workspace")

    return WorkspaceResponse.model_validate(workspace)


@router.put("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: uuid.UUID,
    body: WorkspaceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a workspace (owner only)."""
    result = await db.execute(
        select(Workspace).where(Workspace.id == workspace_id)
    )
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can update")

    if body.name is not None:
        workspace.name = body.name
    if body.slug is not None:
        # Check uniqueness
        result = await db.execute(
            select(Workspace).where(
                Workspace.slug == body.slug, Workspace.id != workspace_id
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Slug already in use")
        workspace.slug = body.slug
    if body.plan is not None:
        workspace.plan = body.plan

    await db.flush()
    await db.refresh(workspace)
    return WorkspaceResponse.model_validate(workspace)


# ── Team invites (nested under workspace) ──


@router.post("/{workspace_id}/invites", response_model=InviteResponse, status_code=201)
async def create_invite(
    workspace_id: uuid.UUID,
    body: InviteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Invite a team member to the workspace."""
    # Verify membership
    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.user_id == current_user.id,
            WorkspaceMember.workspace_id == workspace_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this workspace")

    try:
        invite = await invite_service.create_invite(
            db,
            workspace_id=workspace_id,
            invited_by=current_user.id,
            email=body.email,
            role=body.role,
        )
        return InviteResponse.model_validate(invite)
    except invite_service.InviteError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


@router.post("/invites/accept")
async def accept_invite_endpoint(
    token: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Accept a workspace invite using the invite token."""
    try:
        member = await invite_service.accept_invite(db, token=token, user=current_user)
        return {"message": "Invite accepted", "workspace_id": str(member.workspace_id)}
    except invite_service.InviteError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)
