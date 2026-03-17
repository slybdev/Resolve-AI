"""
Invite service — team invite creation and acceptance.
"""

import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invite import Invite
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember


class InviteError(Exception):
    """Raised when an invite operation fails."""

    def __init__(self, detail: str, status_code: int = 400):
        self.detail = detail
        self.status_code = status_code


async def create_invite(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    invited_by: uuid.UUID,
    email: str,
    role: str = "member",
) -> Invite:
    """Create a team invite for the given workspace."""
    # Verify workspace exists
    result = await db.execute(
        select(Workspace).where(Workspace.id == workspace_id)
    )
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise InviteError("Workspace not found", status_code=404)

    # Check for existing pending invite
    result = await db.execute(
        select(Invite).where(
            Invite.email == email,
            Invite.workspace_id == workspace_id,
            Invite.status == "pending",
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise InviteError("Invite already sent to this email", status_code=409)

    # Check if user is already a member
    result = await db.execute(select(User).where(User.email == email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        result = await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.user_id == existing_user.id,
                WorkspaceMember.workspace_id == workspace_id,
            )
        )
        if result.scalar_one_or_none():
            raise InviteError("User is already a member of this workspace", status_code=409)

    invite = Invite(
        email=email,
        workspace_id=workspace_id,
        invited_by=invited_by,
        token=secrets.token_urlsafe(32),
        role=role,
        status="pending",
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(invite)
    await db.flush()

    return invite


async def accept_invite(
    db: AsyncSession,
    token: str,
    user: User,
) -> WorkspaceMember:
    """Accept an invite and add the user to the workspace."""
    result = await db.execute(
        select(Invite).where(Invite.token == token, Invite.status == "pending")
    )
    invite = result.scalar_one_or_none()

    if not invite:
        raise InviteError("Invalid or expired invite", status_code=404)

    if invite.expires_at < datetime.now(timezone.utc):
        invite.status = "expired"
        await db.flush()
        raise InviteError("Invite has expired", status_code=410)

    if invite.email != user.email:
        raise InviteError("Invite was sent to a different email", status_code=403)

    # Check if already a member
    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.user_id == user.id,
            WorkspaceMember.workspace_id == invite.workspace_id,
        )
    )
    if result.scalar_one_or_none():
        invite.status = "accepted"
        await db.flush()
        raise InviteError("Already a member of this workspace", status_code=409)

    # Create membership
    member = WorkspaceMember(
        user_id=user.id,
        workspace_id=invite.workspace_id,
        role=invite.role,
    )
    db.add(member)

    invite.status = "accepted"
    await db.flush()

    return member
