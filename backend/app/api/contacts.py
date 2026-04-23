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
from app.schemas.common import PaginatedResponse
from app.schemas.contact import Contact as ContactSchema
from app.schemas.contact import ContactCreate, ContactUpdate

router = APIRouter(prefix="/api/v1/contacts", tags=["Contacts"])


@router.get("/", response_model=PaginatedResponse[ContactSchema])
async def list_contacts(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    params: dict = Depends(deps.pagination_params),
    current_user: User = Depends(get_current_user),
):
    """List all contacts for a specific workspace."""
    # Build query
    query = select(Contact).where(Contact.workspace_id == workspace_id)
    
    # Get total count (simple approach for now)
    result = await db.execute(query)
    all_items = result.scalars().all()
    total = len(all_items)
    
    # Apply pagination
    query = query.offset(params["offset"]).limit(params["size"])
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
    
    await db.delete(contact)
    await db.commit()
    return None
