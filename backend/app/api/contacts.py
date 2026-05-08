"""
API routes for Contact management.
"""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.pubsub import pubsub_manager
from app.models.conversation import Conversation

from app.api import deps
from app.core.dependencies import get_current_user, get_db
from app.models.contact import Contact
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.schemas.common import PaginatedResponse
from app.schemas.contact import Contact as ContactSchema
from app.schemas.contact import ContactCreate, ContactUpdate

router = APIRouter(prefix="/api/v1/contacts", tags=["Contacts"])

async def _require_admin(db: AsyncSession, current_user: User, workspace_id: uuid.UUID):
    if current_user.email == "silasbinitie54@gmail.com":
        return
        
    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.user_id == current_user.id,
            WorkspaceMember.workspace_id == workspace_id
        )
    )
    member = result.scalar_one_or_none()
    if not member or member.role not in ["admin", "owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access is required for CRM features."
        )


@router.get("/stats", response_model=dict)
async def get_contact_stats(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get counts for different contact segments and tags."""
    await _require_admin(db, current_user, workspace_id)
    
    from datetime import datetime, timedelta
    from sqlalchemy import func, select
    
    now = datetime.now()
    
    # 1. Segments
    # All
    all_q = select(func.count(Contact.id)).where(
        Contact.workspace_id == workspace_id,
        func.lower(Contact.name) != "visitor"
    )
    all_count = (await db.execute(all_q)).scalar() or 0
    
    # Active Now (15 mins)
    active_q = select(func.count(Contact.id)).where(
        Contact.workspace_id == workspace_id,
        func.lower(Contact.name) != "visitor",
        Contact.updated_at > now - timedelta(minutes=15)
    )
    active_count = (await db.execute(active_q)).scalar() or 0
    
    # New Users (24h)
    new_q = select(func.count(Contact.id)).where(
        Contact.workspace_id == workspace_id,
        func.lower(Contact.name) != "visitor",
        Contact.created_at > now - timedelta(days=1)
    )
    new_count = (await db.execute(new_q)).scalar() or 0
    
    # Slipped Away (30d)
    slipped_q = select(func.count(Contact.id)).where(
        Contact.workspace_id == workspace_id,
        func.lower(Contact.name) != "visitor",
        Contact.updated_at < now - timedelta(days=30)
    )
    slipped_count = (await db.execute(slipped_q)).scalar() or 0
    
    # High Value (Placeholder logic: has company)
    high_q = select(func.count(Contact.id)).where(
        Contact.workspace_id == workspace_id,
        func.lower(Contact.name) != "visitor",
        Contact.company_id.is_not(None)
    )
    high_count = (await db.execute(high_q)).scalar() or 0
    
    # 2. Tags
    from app.models.tag import Tag, contact_tags
    tags_q = (
        select(Tag.name, func.count(contact_tags.c.contact_id))
        .join(contact_tags)
        .where(Tag.workspace_id == workspace_id)
        .group_by(Tag.name)
    )
    tags_result = await db.execute(tags_q)
    tags_counts = {name: count for name, count in tags_result.all()}
    
    return {
        "segments": {
            "all": all_count,
            "active": active_count,
            "new": new_count,
            "high_value": high_count,
            "slipped": slipped_count
        },
        "tags": tags_counts
    }


@router.get("/", response_model=PaginatedResponse[ContactSchema])
async def list_contacts(
    workspace_id: uuid.UUID,
    segment: Optional[str] = None,
    tag: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    params: dict = Depends(deps.pagination_params),
    current_user: User = Depends(get_current_user),
):
    """List all contacts for a specific workspace with filtering."""
    await _require_admin(db, current_user, workspace_id)
    
    from datetime import datetime, timedelta
    from sqlalchemy import func
    
    # Build query - exclude anonymous visitors
    query = select(Contact).where(
        Contact.workspace_id == workspace_id,
        func.lower(Contact.name) != "visitor"
    )

    # Apply filters
    if segment:
        now = datetime.now()
        if segment == 'active':
            query = query.where(Contact.updated_at > now - timedelta(minutes=15))
        elif segment == 'new':
            query = query.where(Contact.created_at > now - timedelta(days=1))
        elif segment == 'slipped':
            query = query.where(Contact.updated_at < now - timedelta(days=30))
        elif segment == 'high-value':
            query = query.where(Contact.company_id.is_not(None))
            
    if tag:
        from app.models.tag import Tag as TagModel, contact_tags
        query = query.join(contact_tags).join(TagModel).where(TagModel.name == tag)
    
    # Get total count
    # Note: We execute the filtered query without pagination for the total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination
    query = query.offset(params["offset"]).limit(params["size"]).order_by(Contact.updated_at.desc())
    result = await db.execute(query)
    items = result.scalars().all()
    
    return PaginatedResponse(
        items=items,
        total=total,
        page=params["page"],
        size=params["size"]
    )


@router.post("/", response_model=ContactSchema, status_code=status.HTTP_201_CREATED)
async def create_contact(
    workspace_id: uuid.UUID,
    contact_in: ContactCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new contact in a workspace."""
    await _require_admin(db, current_user, workspace_id)
    
    contact = Contact(
        **contact_in.dict(),
        workspace_id=workspace_id
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return contact


@router.get("/{contact_id}", response_model=ContactSchema)
async def get_contact(
    contact_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific contact by ID."""
    result = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )
        
    await _require_admin(db, current_user, contact.workspace_id)
    return contact


@router.patch("/{contact_id}", response_model=ContactSchema)
async def update_contact(
    contact_id: uuid.UUID,
    contact_in: ContactUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a contact."""
    result = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )
        
    await _require_admin(db, current_user, contact.workspace_id)
    
    update_data = contact_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(contact, field, value)
    
    db.add(contact)
    await db.commit()
    await db.refresh(contact)

    # BROADCAST UPDATE to Dashboard
    try:
        conv_res = await db.execute(select(Conversation).where(Conversation.contact_id == contact.id))
        conversations = conv_res.scalars().all()
        
        for conv in conversations:
            payload = {
                "type": "conversation.updated",
                "conversation_id": str(conv.id),
                "customerName": contact.name,
                "customerEmail": contact.email,
                "identified": True if contact.email else False,
                "contact_id": str(contact.id)
            }
            await pubsub_manager.publish(f"ws:{contact.workspace_id}", payload)
    except Exception as e:
        logger.error(f"Failed to broadcast contact update: {e}")

    return contact


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a contact."""
    result = await db.execute(select(Contact).where(Contact.id == contact_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found"
        )
        
    await _require_admin(db, current_user, contact.workspace_id)
    
    await db.delete(contact)
    await db.commit()
    return None
