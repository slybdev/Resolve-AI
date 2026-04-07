"""
Onboarding service — workspace setup during user onboarding flow.
"""

import re
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember


def _slugify(name: str) -> str:
    """Convert a workspace name to a URL-friendly slug."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    return slug or "workspace"


async def _generate_unique_slug(db: AsyncSession, base_slug: str) -> str:
    """Ensure the slug is unique by appending a suffix if needed."""
    slug = base_slug
    counter = 1
    while True:
        result = await db.execute(
            select(Workspace).where(Workspace.slug == slug)
        )
        if result.scalar_one_or_none() is None:
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1


async def setup_workspace(
    db: AsyncSession,
    user: User,
    workspace_name: str,
    company_description: str | None = None,
    industry: str | None = None,
    ai_agent_name: str | None = None,
    ai_tone: str | None = None,
    ai_custom_instructions: str | None = None,
) -> Workspace:
    """Create a workspace and add the user as the owner member.

    Called during the onboarding flow after registration.
    """
    slug = await _generate_unique_slug(db, _slugify(workspace_name))

    workspace = Workspace(
        name=workspace_name,
        slug=slug,
        owner_id=user.id,
        company_description=company_description,
        industry=industry,
        ai_system_prompt=f"You are {ai_agent_name}. Speak in a {ai_tone} tone.", # Legacy fallback
        ai_tone=ai_tone,
        ai_custom_instructions=ai_custom_instructions,
    )
    db.add(workspace)
    await db.flush()

    # Add user as owner member
    member = WorkspaceMember(
        user_id=user.id,
        workspace_id=workspace.id,
        role="owner",
    )
    db.add(member)
    await db.flush()

    return workspace
