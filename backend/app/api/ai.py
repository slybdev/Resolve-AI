import logging
import traceback
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.ai import AIQueryRequest, AIQueryResponse
from app.services.ai_service import AIService

router = APIRouter(prefix="/api/v1/ai", tags=["ai"])
logger = logging.getLogger(__name__)

@router.post("/query", response_model=AIQueryResponse)
async def ai_query(
    request: AIQueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Perform a RAG query against the user's knowledge base.
    Strictly isolated by user_id and workspace_id.
    """
    try:
        result = await AIService.query(
            db=db,
            user_id=current_user.id,
            workspace_id=request.workspace_id,
            query_text=request.query,
            conversation_id=request.conversation_id,
            folder_id=request.folder_id
        )
        return result
    except Exception as e:
        logger.error(f"AI Query failed: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail="An error occurred while processing your AI query."
        )
