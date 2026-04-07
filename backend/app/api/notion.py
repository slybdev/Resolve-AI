"""
Notion OAuth API routes.

Endpoints:
  GET  /authorize → redirect to Notion OAuth
  GET  /callback  → exchange code for token, create/update source
  POST /sync/{source_id} → trigger manual sync
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, get_current_user
from app.integrations.notion.oauth import NotionOAuth
from app.models.knowledge import KnowledgeSource
from app.services.knowledge_service import KnowledgeService
from app.models.user import User

router = APIRouter(prefix="/api/v1/notion", tags=["notion"])


@router.get("/authorize")
async def authorize_notion(
    workspace_id: uuid.UUID = Query(...),
    current_user: User = Depends(get_current_user),
):
    """Redirect user to Notion for authorization."""
    auth_url = NotionOAuth.get_authorization_url(state=str(workspace_id))
    return RedirectResponse(auth_url)


@router.get("/callback")
async def notion_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    """Handle Notion OAuth callback."""
    workspace_id = uuid.UUID(state)

    try:
        token_data = await NotionOAuth.exchange_code_for_token(code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to exchange token: {str(e)}")

    access_token = token_data["access_token"]
    workspace_name = token_data.get("workspace_name", "Notion Workspace")

    # Check if a Notion source already exists for this workspace
    stmt = select(KnowledgeSource).where(
        KnowledgeSource.workspace_id == workspace_id,
        KnowledgeSource.type == "notion",
    )
    result = await db.execute(stmt)
    source = result.scalar_one_or_none()

    if not source:
        source = KnowledgeSource(
            workspace_id=workspace_id,
            name=f"Notion: {workspace_name}",
            type="notion",
            config={"access_token": access_token, "workspace_name": workspace_name},
            status="healthy",
            sync_status="idle",
        )
        db.add(source)
    else:
        source.config = {"access_token": access_token, "workspace_name": workspace_name}
        source.status = "healthy"
        source.sync_status = "idle"

    await db.commit()
    await db.refresh(source)

    return RedirectResponse(f"http://localhost:3000/dashboard/workspaces/{workspace_id}/knowledge")


@router.post("/sync/{source_id}")
async def sync_notion(
    source_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually trigger a Notion source sync."""
    try:
        await KnowledgeService.sync_source(db, request.app.state.arq_pool, source_id)
        return {"message": "Sync started successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
