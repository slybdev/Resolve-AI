"""
API routes for API Key management.
"""

import secrets
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.api_key import APIKey
from app.models.user import User
from app.schemas.workspace import APIKeyResponse

router = APIRouter(prefix="/api/v1/api-keys", tags=["API Keys"])


class APIKeyCreate(BaseModel):
    name: str


# Moved to schemas/workspace.py


@router.get("/{workspace_id}", response_model=List[APIKeyResponse])
async def list_api_keys(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List API keys for a workspace."""
    result = await db.execute(
        select(APIKey).where(APIKey.workspace_id == workspace_id)
    )
    return result.scalars().all()


@router.post("/{workspace_id}", response_model=APIKeyResponse)
async def create_api_key(
    workspace_id: uuid.UUID,
    key_in: APIKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new API key."""
    # Generate a random API key
    plain_key = f"sk_{secrets.token_urlsafe(32)}"
    prefix = plain_key[:8]
    
    # In a real app, hash the key properly
    # Using a simple representation for now
    hashed_key = str(hash(plain_key)) 
    
    api_key = APIKey(
        name=key_in.name,
        key_prefix=prefix,
        hashed_key=hashed_key,
        workspace_id=workspace_id
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)
    
    # Return response with plain key (ONLY ONCE)
    resp = APIKeyResponse.model_validate(api_key)
    resp.plain_key = plain_key
    return resp


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    key_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoke/delete an API key."""
    result = await db.execute(select(APIKey).where(APIKey.id == key_id))
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    await db.delete(key)
    await db.commit()
    return None
