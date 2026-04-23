import logging
import traceback
from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.ai import AIQueryRequest, AIQueryResponse, AIConfigurationOut, AIConfigurationUpdate
from app.services.ai_service import AIService

router = APIRouter(prefix="/api/v1/ai", tags=["ai"])
logger = logging.getLogger(__name__)

@router.get("/config/{workspace_id}", response_model=AIConfigurationOut)
async def get_ai_config(
    workspace_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch AI configuration for a workspace."""
    from app.models.ai_configuration import AIConfiguration
    from sqlalchemy import select
    
    result = await db.execute(select(AIConfiguration).where(AIConfiguration.workspace_id == workspace_id))
    config = result.scalar_one_or_none()
    
    if not config:
        # Create default config if missing
        config = AIConfiguration(workspace_id=workspace_id, company_name="My Company")
        db.add(config)
        await db.commit()
        await db.refresh(config)
        
    return config

@router.patch("/config/{workspace_id}", response_model=AIConfigurationOut)
async def update_ai_config(
    workspace_id: UUID,
    update_data: AIConfigurationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update AI configuration for a workspace."""
    from app.models.ai_configuration import AIConfiguration
    from sqlalchemy import select
    
    result = await db.execute(select(AIConfiguration).where(AIConfiguration.workspace_id == workspace_id))
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(status_code=404, detail="AI Configuration not found.")
        
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(config, key, value)
        
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config
