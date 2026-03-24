"""
TeamService — logic for managing workspace members and roles.
"""

import uuid
from typing import List

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.user import User
from app.models.workspace import WorkspaceMember


class TeamService:
    @staticmethod
    async def get_team_members(
        db: AsyncSession,
        workspace_id: uuid.UUID
    ) -> List[WorkspaceMember]:
        """Get all members of a workspace."""
        result = await db.execute(
            select(WorkspaceMember)
            .options(selectinload(WorkspaceMember.user))
            .where(WorkspaceMember.workspace_id == workspace_id)
        )
        return result.scalars().all()

    @staticmethod
    async def update_member_role(
        db: AsyncSession,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
        new_role: str
    ) -> WorkspaceMember:
        """Update a member's role in a workspace."""
        result = await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id
            )
        )
        member = result.scalar_one_or_none()
        if not member:
            raise ValueError("Member not found in workspace")
        
        member.role = new_role
        db.add(member)
        await db.commit()
        await db.refresh(member)
        return member

    @staticmethod
    async def remove_member(
        db: AsyncSession,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> None:
        """Remove a member from a workspace."""
        await db.execute(
            delete(WorkspaceMember).where(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.user_id == user_id
            )
        )
        await db.commit()
