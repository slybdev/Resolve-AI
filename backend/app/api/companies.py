"""
API routes for Company management.
"""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.dependencies import get_current_user, get_db
from app.models.company import Company
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.company import Company as CompanySchema
from app.schemas.company import CompanyCreate, CompanyUpdate

router = APIRouter(prefix="/api/v1/companies", tags=["Companies"])


@router.get("/", response_model=PaginatedResponse[CompanySchema])
async def list_companies(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    params: dict = Depends(deps.pagination_params),
    current_user: User = Depends(get_current_user),
):
    """List all companies for a specific workspace."""
    # Build query
    query = select(Company).where(Company.workspace_id == workspace_id)
    
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


@router.post("/", response_model=CompanySchema, status_code=status.HTTP_201_CREATED)
async def create_company(
    workspace_id: uuid.UUID,
    company_in: CompanyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new company in a workspace."""
    company = Company(
        **company_in.dict(),
        workspace_id=workspace_id
    )
    db.add(company)
    await db.commit()
    await db.refresh(company)
    return company


@router.get("/{company_id}", response_model=CompanySchema)
async def get_company(
    company_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific company by ID."""
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    return company


@router.patch("/{company_id}", response_model=CompanySchema)
async def update_company(
    company_id: uuid.UUID,
    company_in: CompanyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a company."""
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    update_data = company_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(company, field, value)
    
    db.add(company)
    await db.commit()
    await db.refresh(company)
    return company


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(
    company_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a company."""
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    await db.delete(company)
    await db.commit()
    return None
