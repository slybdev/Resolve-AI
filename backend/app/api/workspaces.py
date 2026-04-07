"""
Workspace API routes — /api/v1/workspaces
"""

import uuid
from typing import List

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


@router.get("", response_model=List[WorkspaceResponse])
async def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all workspaces the current user belongs to."""
    result = await db.execute(
        select(Workspace)
        .join(WorkspaceMember)
        .where(WorkspaceMember.user_id == current_user.id)
    )
    return result.scalars().all()


from app.core import security
import datetime

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

    # Generate Pro Widget Keys
    public_key, secret_key = security.generate_workspace_keys()
    
    workspace = Workspace(
        name=body.name,
        slug=slug,
        owner_id=current_user.id,
        public_key=public_key,
        encrypted_secret_key=security.encrypt_secret_key(secret_key),
        secret_key_created_at=datetime.datetime.now(datetime.timezone.utc)
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

@router.post("/{workspace_id}/rotate-secret-key")
async def rotate_workspace_secret_key(
    workspace_id: uuid.UUID,
    force: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Rotates the workspace's secret key.
    force=False: Graceful rotation. Old key stays valid for 1 hour.
    force=True: Immediate invalidation.
    """
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Verify authorization (Owner only)
    if workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the owner can rotate keys")

    _, new_secret_key = security.generate_workspace_keys()
    
    if not force and workspace.encrypted_secret_key:
        # Move current key to previous slot with 1h grace period
        workspace.encrypted_previous_secret_key = workspace.encrypted_secret_key
        workspace.previous_key_expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)
    else:
        # Immediate wipe
        workspace.encrypted_previous_secret_key = None
        workspace.previous_key_expires_at = None

    workspace.encrypted_secret_key = security.encrypt_secret_key(new_secret_key)
    workspace.secret_key_created_at = datetime.datetime.now(datetime.timezone.utc)
    
    await db.commit()
    
    return {
        "message": "Secret key rotated successfully",
        "new_secret_key": new_secret_key,
        "is_forced": force
    }


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


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
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

    # Update Basic Fields
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

    # Update AI Branding & Identity
    if body.company_description is not None:
        workspace.company_description = body.company_description
    if body.industry is not None:
        workspace.industry = body.industry
    
    # Update AI Persona
    if body.ai_system_prompt is not None:
        workspace.ai_system_prompt = body.ai_system_prompt
    if body.ai_agent_name is not None:
        workspace.ai_agent_name = body.ai_agent_name
    if body.ai_custom_instructions is not None:
        workspace.ai_custom_instructions = body.ai_custom_instructions
    if body.ai_tone is not None:
        workspace.ai_tone = body.ai_tone
    
    # Update AI Automation & Settings
    if body.ai_settings is not None:
        workspace.ai_settings = body.ai_settings
    if body.is_ai_enabled is not None:
        workspace.is_ai_enabled = body.is_ai_enabled

    await db.commit()
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
            allowed_pages=body.allowed_pages if hasattr(body, 'allowed_pages') else [],
        )
        return InviteResponse.model_validate(invite)
    except invite_service.InviteError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


@router.get("/invites/{token}", response_model=InviteResponse)
async def get_invite_endpoint(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Get an invite by token (public endpoint so users can see invite before signup/login)."""
    try:
        invite = await invite_service.get_invite(db, token=token)
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
