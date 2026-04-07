"""
SegmentService — logic for customer segmentation and advanced filtering.
"""

import uuid
from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.contact import Contact


class SegmentService:
    @staticmethod
    async def get_contacts_by_company(
        db: AsyncSession,
        workspace_id: uuid.UUID,
        company_id: uuid.UUID
    ) -> List[Contact]:
        """Get all contacts belonging to a specific company."""
        result = await db.execute(
            select(Contact)
            .where(
                Contact.workspace_id == workspace_id,
                Contact.company_id == company_id
            )
            .options(joinedload(Contact.tags))
        )
        return result.scalars().all()

    @staticmethod
    async def get_contacts_by_tag(
        db: AsyncSession,
        workspace_id: uuid.UUID,
        tag_id: uuid.UUID
    ) -> List[Contact]:
        """Get all contacts with a specific tag."""
        # This requires the secondary relationship to be working
        result = await db.execute(
            select(Contact)
            .join(Contact.tags)
            .where(
                Contact.workspace_id == workspace_id,
                Contact.tags.any(id=tag_id)
            )
            .options(joinedload(Contact.tags))
        )
        return result.scalars().all()
    
    @staticmethod
    async def search_contacts(
        db: AsyncSession,
        workspace_id: uuid.UUID,
        query: str
    ) -> List[Contact]:
        """Search contacts by name or email."""
        result = await db.execute(
            select(Contact)
            .where(
                Contact.workspace_id == workspace_id,
                (Contact.name.ilike(f"%{query}%")) | (Contact.email.ilike(f"%{query}%"))
            )
            .options(joinedload(Contact.tags))
        )
        return result.scalars().all()
