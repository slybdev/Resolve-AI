"""
TeamService — logic for managing workspace members and functional teams.
"""

import uuid
from typing import List, Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.models.team import Team, TeamMember
from app.schemas.team import TeamCreate, TeamUpdate, TeamMemberCreate


class TeamService:
    # ── Workspace Members (Legacy/Core) ──

    @staticmethod
    async def get_all_workspace_members(
        db: AsyncSession,
        workspace_id: uuid.UUID,
        team_id: Optional[uuid.UUID] = None,
        current_user_id: Optional[uuid.UUID] = None
    ) -> List[WorkspaceMember]:
        """Get members of a workspace, strictly filtered by functional team."""
        query = (
            select(WorkspaceMember)
            .options(selectinload(WorkspaceMember.user))
            .where(WorkspaceMember.workspace_id == workspace_id)
        )
        
        # Determine the target team(s) to filter by
        target_team_ids = []
        
        if team_id:
            target_team_ids = [team_id]
        elif current_user_id:
            # Fallback: Find all teams the current user belongs to
            user_teams_query = select(TeamMember.team_id).where(TeamMember.user_id == current_user_id)
            result = await db.execute(user_teams_query)
            target_team_ids = [row[0] for row in result.all()]
            
        if target_team_ids:
             # Filter by team: use a subquery to avoid DISTINCT issues with JSON columns
             team_user_ids = select(TeamMember.user_id).where(TeamMember.team_id.in_(target_team_ids))
             query = query.where(WorkspaceMember.user_id.in_(team_user_ids))
             
        result = await db.execute(query)
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

    # ── Functional Teams (BlackVault) ──

    @staticmethod
    async def create_team(
        db: AsyncSession,
        obj_in: TeamCreate
    ) -> Team:
        """Create a new functional team (e.g. Security, Billing)."""
        team = Team(
            name=obj_in.name,
            description=obj_in.description,
            workspace_id=obj_in.workspace_id,
            allowed_pages=obj_in.allowed_pages or []
        )
        db.add(team)
        await db.commit()
        await db.refresh(team)
        return team

    @staticmethod
    async def get_teams(
        db: AsyncSession,
        workspace_id: uuid.UUID
    ) -> List[Team]:
        """List all functional teams in a workspace."""
        result = await db.execute(
            select(Team)
            .options(selectinload(Team.members).selectinload(TeamMember.user))
            .where(Team.workspace_id == workspace_id)
        )
        return result.scalars().all()

    @staticmethod
    async def update_team(
        db: AsyncSession,
        team_id: uuid.UUID,
        obj_in: TeamUpdate
    ) -> Team:
        """Update an existing functional team and cascade page changes to members."""
        result = await db.execute(
            select(Team)
            .options(selectinload(Team.members))
            .where(Team.id == team_id)
        )
        team = result.scalar_one_or_none()
        if not team:
            raise ValueError("Team not found")
        
        update_data = obj_in.model_dump(exclude_unset=True)
        pages_changed = "allowed_pages" in update_data
        
        for field, value in update_data.items():
            setattr(team, field, value)
        
        db.add(team)
        await db.flush()
        
        # Cascade: sync allowed_pages to every member's WorkspaceMember record
        if pages_changed and team.members:
            new_pages = update_data["allowed_pages"] or []
            for tm in team.members:
                ws_member_result = await db.execute(
                    select(WorkspaceMember).where(
                        WorkspaceMember.workspace_id == team.workspace_id,
                        WorkspaceMember.user_id == tm.user_id,
                    )
                )
                ws_member = ws_member_result.scalar_one_or_none()
                if ws_member:
                    ws_member.allowed_pages = new_pages
                    db.add(ws_member)
        
        await db.commit()
        await db.refresh(team)
        return team

    @staticmethod
    async def delete_team(
        db: AsyncSession,
        team_id: uuid.UUID
    ) -> None:
        """Delete a functional team and its member associations."""
        await db.execute(
            delete(Team).where(Team.id == team_id)
        )
        await db.commit()

    @staticmethod
    async def add_member_to_team(
        db: AsyncSession,
        team_id: uuid.UUID,
        user_id: uuid.UUID,
        role: str = "member"
    ) -> TeamMember:
        """Assign a user to a functional team and sync permissions."""
        # 1. Fetch team to get its permissions
        result = await db.execute(select(Team).where(Team.id == team_id))
        team = result.scalar_one_or_none()
        if not team:
            raise ValueError("Team not found")

        # 2. Assign to team
        tm = TeamMember(
            team_id=team_id,
            user_id=user_id,
            role=role
        )
        db.add(tm)
        
        # 3. Cascade permissions to WorkspaceMember
        ws_member_result = await db.execute(
            select(WorkspaceMember).where(
                WorkspaceMember.workspace_id == team.workspace_id,
                WorkspaceMember.user_id == user_id,
            )
        )
        ws_member = ws_member_result.scalar_one_or_none()
        if ws_member:
            ws_member.allowed_pages = team.allowed_pages
            db.add(ws_member)
            
        await db.commit()
        await db.refresh(tm)
        return tm

    @staticmethod
    async def remove_member_from_team(
        db: AsyncSession,
        team_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> None:
        """Remove a user from a functional team."""
        await db.execute(
            delete(TeamMember).where(
                TeamMember.team_id == team_id,
                TeamMember.user_id == user_id
            )
        )
        await db.commit()

    @staticmethod
    async def remove_member(
        db: AsyncSession,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> None:
        """Remove a member from the workspace AND delete their entire account globally."""
        # Import models needed for disassociation
        from app.models.workspace import Workspace
        from app.models.ticket import Ticket
        from app.models.conversation import Conversation
        from app.models.message import Message
        from sqlalchemy import update
        
        # 1. Verify membership and owner status
        ws_result = await db.execute(
            select(Workspace).where(Workspace.id == workspace_id)
        )
        workspace = ws_result.scalar_one_or_none()
        if not workspace:
            raise ValueError("Workspace not found")
            
        if workspace.owner_id == user_id:
            raise ValueError("Cannot delete the Workspace Owner's account")

        # 2. Manual Cascade: Delete association records
        # These are specific to a user's relationship with various teams/workspaces
        await db.execute(delete(TeamMember).where(TeamMember.user_id == user_id))
        await db.execute(delete(WorkspaceMember).where(WorkspaceMember.user_id == user_id))
        
        # 3. Disassociate history: Nullify references in tickets/conversations/messages
        # (Preserves historical record while removing the personal identity)
        await db.execute(
            update(Ticket)
            .where(Ticket.assigned_user_id == user_id)
            .values(assigned_user_id=None, assignment_status="none")
        )
        await db.execute(
            update(Ticket)
            .where(Ticket.created_by_id == user_id)
            .values(created_by_id=None)
        )
        await db.execute(
            update(Conversation)
            .where(Conversation.assigned_to == str(user_id))
            .values(assigned_to=None)
        )
        await db.execute(
            update(Message)
            .where(Message.sender_id == user_id)
            .values(sender_id=None)
        )

        # 4. Final Purge: Delete the global User record
        await db.execute(
            delete(User).where(User.id == user_id)
        )
        await db.commit()
