"""
TagService — logic for tagging contacts and companies.
"""

import uuid
from typing import Union

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import Company
from app.models.contact import Contact
from app.models.tag import Tag


class TagService:
    @staticmethod
    async def add_tag_to_entity(
        db: AsyncSession,
        entity: Union[Contact, Company],
        tag_id: uuid.UUID,
        workspace_id: uuid.UUID,
    ) -> Union[Contact, Company]:
        """Add a tag to a contact or company."""
        result = await db.execute(
            select(Tag).where(Tag.id == tag_id, Tag.workspace_id == workspace_id)
        )
        tag = result.scalar_one_or_none()
        
        if not tag:
            raise ValueError("Tag not found or unauthorized")
        
        if tag not in entity.tags:
            entity.tags.append(tag)
            db.add(entity)
            await db.commit()
            await db.refresh(entity)
        
        return entity

    @staticmethod
    async def remove_tag_from_entity(
        db: AsyncSession,
        entity: Union[Contact, Company],
        tag_id: uuid.UUID,
    ) -> Union[Contact, Company]:
        """Remove a tag from a contact or company."""
        entity.tags = [t for t in entity.tags if t.id != tag_id]
        db.add(entity)
        await db.commit()
        await db.refresh(entity)
        return entity
