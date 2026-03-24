"""
Semantic search API route.

Uses pgvector cosine distance to find relevant document chunks.
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_user
from app.services.knowledge_service import KnowledgeService
from app.models.user import User

router = APIRouter(prefix="/api/v1/search", tags=["search"])


@router.post("/knowledge")
async def knowledge_search(
    workspace_id: uuid.UUID = Query(...),
    query: str = Query(...),
    top_k: int = Query(5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Perform semantic search across ready documents in a workspace."""
    try:
        results = await KnowledgeService.vector_search(db, workspace_id, current_user.id, query, top_k)

        formatted_results = []
        for chunk, doc in results:
            formatted_results.append({
                "document_title": doc.title,
                "document_id": str(doc.id),
                "document_type": doc.type,
                "document_status": doc.status,
                "content": chunk.content,
                "chunk_index": chunk.chunk_index,
            })

        return {"query": query, "results": formatted_results}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
