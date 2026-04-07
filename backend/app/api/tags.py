"""
API routes for Tag management and association.
"""

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.company import Company
from app.models.contact import Contact
from app.models.tag import Tag
from app.models.user import User
from app.schemas.tag import Tag as TagSchema
from app.schemas.tag import TagCreate
from app.services.tag_service import TagService

router = APIRouter(prefix="/api/v1/tags", tags=["Tags"])


@router.get("/", response_model=List[TagSchema])
async def list_tags(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all tags for a specific workspace."""
    result = await db.execute(select(Tag).where(Tag.workspace_id == workspace_id))
    return result.scalars().all()


@router.post("/", response_model=TagSchema, status_code=status.HTTP_201_CREATED)
async def create_tag(
    workspace_id: uuid.UUID,
    tag_in: TagCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new tag in a workspace."""
    tag = Tag(
        **tag_in.dict(),
        workspace_id=workspace_id
    )
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    return tag


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a tag."""
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    await db.delete(tag)
    await db.commit()
    return None


@router.post("/attach", response_model=TagSchema)
async def attach_tag(
    tag_id: uuid.UUID,
    entity_id: uuid.UUID,
    entity_type: str,  # "contact" or "company"
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Attach a tag to a contact or company."""
    if entity_type == "contact":
        result = await db.execute(select(Contact).where(Contact.id == entity_id))
        entity = result.scalar_one_or_none()
    elif entity_type == "company":
        result = await db.execute(select(Company).where(Company.id == entity_id))
        entity = result.scalar_one_or_none()
    else:
        raise HTTPException(status_code=400, detail="Invalid entity type")

    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    try:
        await TagService.add_tag_to_entity(db, entity, tag_id, workspace_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    return result.scalar_one()


@router.post("/detach", status_code=status.HTTP_204_NO_CONTENT)
async def detach_tag(
    tag_id: uuid.UUID,
    entity_id: uuid.UUID,
    entity_type: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Detach a tag from a contact or company."""
    if entity_type == "contact":
        result = await db.execute(select(Contact).where(Contact.id == entity_id))
        entity = result.scalar_one_or_none()
    elif entity_type == "company":
        result = await db.execute(select(Company).where(Company.id == entity_id))
        entity = result.scalar_one_or_none()
    else:
        raise HTTPException(status_code=400, detail="Invalid entity type")

    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    await TagService.remove_tag_from_entity(db, entity, tag_id)
    return None
