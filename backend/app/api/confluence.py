"""
Confluence API routes.

Endpoints:
  POST /connect           → validate credentials, create KnowledgeSource
  GET  /spaces/{source_id} → list available spaces for selection
  POST /sync/{source_id}  → trigger manual sync
"""

import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db, get_current_user
from app.integrations.confluence.client import ConfluenceClient
from app.models.knowledge import KnowledgeSource
from app.services.knowledge_service import KnowledgeService
from app.models.user import User
from app.core.encryption import encrypt_string, decrypt_string

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/confluence", tags=["confluence"])


# ── Request schemas ──

class ConfluenceConnectRequest(BaseModel):
    workspace_id: str
    base_url: str       # e.g. https://company.atlassian.net
    email: str
    api_token: str
    name: str = ""      # optional custom name


class ConfluenceUpdateSpacesRequest(BaseModel):
    selected_spaces: list[str]  # list of space keys


# ── Routes ──

@router.post("/connect")
async def connect_confluence(
    body: ConfluenceConnectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Validate Confluence credentials and create a KnowledgeSource."""
    workspace_id = uuid.UUID(body.workspace_id)
    base_url = body.base_url.rstrip("/")

    # Test the connection first
    client = ConfluenceClient(base_url, body.email, body.api_token)
    is_valid = await client.test_connection()

    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail="Failed to connect to Confluence. Check your base URL, email, and API token."
        )

    # Check if a Confluence source already exists for this workspace
    stmt = select(KnowledgeSource).where(
        KnowledgeSource.workspace_id == workspace_id,
        KnowledgeSource.type == "confluence",
    )
    result = await db.execute(stmt)
    source = result.scalar_one_or_none()

    source_name = body.name or f"Confluence: {base_url.split('//')[1].split('.')[0]}"

    if not source:
        source = KnowledgeSource(
            workspace_id=workspace_id,
            user_id=current_user.id,
            name=source_name,
            type="confluence",
            config={
                "base_url": base_url,
                "email": body.email,
                "api_token": encrypt_string(body.api_token),  # Encrypt before saving
            },
            settings={},
            status="healthy",
            sync_status="idle",
        )
        db.add(source)
    else:
        # Update existing credentials
        source.config = {
            "base_url": base_url,
            "email": body.email,
            "api_token": encrypt_string(body.api_token),  # Encrypt on update
        }
        source.name = source_name
        source.status = "healthy"
        source.sync_status = "idle"

    await db.commit()
    await db.refresh(source)

    logger.info(f"✅ Confluence source connected: {source.id} ({source_name})")

    return {
        "id": str(source.id),
        "name": source.name,
        "status": source.status,
        "message": "Confluence connected successfully",
    }


@router.get("/spaces/{source_id}")
async def list_confluence_spaces(
    source_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List available Confluence spaces for the connected source."""
    source = await db.get(KnowledgeSource, source_id)
    if not source or source.type != "confluence":
        raise HTTPException(status_code=404, detail="Confluence source not found")

    config = source.config or {}
    client = ConfluenceClient(
        config.get("base_url", ""),
        config.get("email", ""),
        decrypt_string(config.get("api_token", "")),  # Decrypt for use
    )

    try:
        spaces = await client.list_spaces()
    except Exception as e:
        logger.error(f"Failed to list Confluence spaces: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch spaces: {str(e)}")

    # Return selected_spaces from settings for the UI to show checkmarks
    selected = (source.settings or {}).get("selected_spaces", [])

    return {
        "spaces": [
            {
                "key": s.get("key", ""),
                "name": s.get("name", ""),
                "type": s.get("type", ""),
                "selected": s.get("key", "") in selected,
            }
            for s in spaces
        ],
        "selected_spaces": selected,
    }


@router.put("/spaces/{source_id}")
async def update_selected_spaces(
    source_id: uuid.UUID,
    body: ConfluenceUpdateSpacesRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update which spaces to sync for a Confluence source."""
    source = await db.get(KnowledgeSource, source_id)
    if not source or source.type != "confluence":
        raise HTTPException(status_code=404, detail="Confluence source not found")

    settings = source.settings or {}
    settings["selected_spaces"] = body.selected_spaces
    source.settings = settings

    await db.commit()

    return {"message": "Spaces updated", "selected_spaces": body.selected_spaces}


@router.post("/sync/{source_id}")
async def sync_confluence(
    source_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually trigger a Confluence source sync."""
    source = await db.get(KnowledgeSource, source_id)
    if not source or source.type != "confluence":
        raise HTTPException(status_code=404, detail="Confluence source not found")

    try:
        await KnowledgeService.sync_source(db, request.app.state.arq_pool, source_id)
        return {"message": "Sync started successfully"}
    except Exception as e:
        logger.error(f"Confluence sync failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
