"""
API routes for Workspace Settings (Business Hours, SLA).
"""

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.business_hours import BusinessHours
from app.models.user import User
from app.schemas.workspace import BusinessHourResponse

router = APIRouter(prefix="/api/v1/settings", tags=["Settings"])


class BusinessHourUpdate(BaseModel):
    day_of_week: int
    open_time: str | None = None
    close_time: str | None = None
    is_closed: bool


@router.get("/business-hours/{workspace_id}", response_model=List[BusinessHourResponse])
async def get_business_hours(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get business hours for a workspace."""
    result = await db.execute(
        select(BusinessHours).where(BusinessHours.workspace_id == workspace_id)
    )
    return result.scalars().all()


@router.put("/business-hours/{workspace_id}", response_model=List[BusinessHourResponse])
async def update_business_hours(
    workspace_id: uuid.UUID,
    hours_in: List[BusinessHourUpdate],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update business hours for a workspace."""
    # Delete existing
    from sqlalchemy import delete
    await db.execute(delete(BusinessHours).where(BusinessHours.workspace_id == workspace_id))
    
    # Add new
    new_hours = [
        BusinessHours(**h.dict(), workspace_id=workspace_id)
        for h in hours_in
    ]
    db.add_all(new_hours)
    await db.commit()
    return new_hours
