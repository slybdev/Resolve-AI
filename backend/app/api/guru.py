import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.core.dependencies import get_db, get_current_user
from app.integrations.guru.client import GuruClient
from app.models.knowledge import KnowledgeSource
from app.services.knowledge_service import KnowledgeService
from app.models.user import User
from app.core.encryption import encrypt_string, decrypt_string

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/guru", tags=["guru"])

# ── Request schemas ──

class GuruConnectRequest(BaseModel):
    workspace_id: str
    email: str
    api_token: str
    name: str = ""      # optional custom name

class GuruUpdateCollectionsRequest(BaseModel):
    selected_collections: List[str]  # list of collection IDs

# ── Routes ──

@router.post("/connect")
async def connect_guru(
    body: GuruConnectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Validate Guru credentials and create/update a KnowledgeSource."""
    try:
        workspace_id = uuid.UUID(body.workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace ID format.")

    # 1. Test the connection first
    client = GuruClient(body.email, body.api_token)
    is_valid = await client.verify_connection()

    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail="Failed to connect to Guru. Check your Email and API Token."
        )

    # 2. Check if a Guru source already exists for this workspace
    stmt = select(KnowledgeSource).where(
        KnowledgeSource.workspace_id == workspace_id,
        KnowledgeSource.type == "guru",
    )
    result = await db.execute(stmt)
    source = result.scalar_one_or_none()

    source_name = body.name or f"Guru: {body.email.split('@')[0]}"

    if not source:
        source = KnowledgeSource(
            workspace_id=workspace_id,
            user_id=current_user.id,
            name=source_name,
            type="guru",
            config={
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
            "email": body.email,
            "api_token": encrypt_string(body.api_token),
        }
        source.name = source_name
        source.status = "healthy"
        source.sync_status = "idle"

    await db.commit()
    await db.refresh(source)

    logger.info(f"✅ Guru source connected: {source.id} ({source_name})")

    return {
        "id": str(source.id),
        "name": source.name,
        "status": source.status,
        "message": "Guru connected successfully",
    }


@router.get("/collections/{source_id}")
async def list_guru_collections(
    source_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List available Guru collections for the connected source."""
    source = await db.get(KnowledgeSource, source_id)
    if not source or source.type != "guru":
        raise HTTPException(status_code=404, detail="Guru source not found")

    config = source.config or {}
    try:
        api_token = decrypt_string(config.get("api_token", ""))
    except Exception:
        api_token = config.get("api_token", "")

    client = GuruClient(
        config.get("email", ""),
        api_token,
    )

    try:
        collections = await client.list_collections()
    except Exception as e:
        logger.error(f"Failed to list Guru collections: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch collections: {str(e)}")

    # Return selected_collections from settings for the UI to show checkmarks
    selected = (source.settings or {}).get("selected_collections", [])

    return {
        "collections": [
            {
                "id": c.get("id", ""),
                "name": c.get("name", ""),
                "type": c.get("collectionType", ""),
                "selected": c.get("id", "") in selected,
            }
            for c in collections
        ],
        "selected_collections": selected,
    }


@router.put("/collections/{source_id}")
async def update_selected_collections(
    source_id: uuid.UUID,
    body: GuruUpdateCollectionsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update which collections to sync for a Guru source."""
    source = await db.get(KnowledgeSource, source_id)
    if not source or source.type != "guru":
        raise HTTPException(status_code=404, detail="Guru source not found")

    settings = source.settings or {}
    settings["selected_collections"] = body.selected_collections
    source.settings = settings

    await db.commit()

    return {"message": "Collections updated", "selected_collections": body.selected_collections}


@router.post("/sync/{source_id}")
async def sync_guru(
    source_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually trigger a Guru source sync."""
    source = await db.get(KnowledgeSource, source_id)
    if not source or source.type != "guru":
        raise HTTPException(status_code=404, detail="Guru source not found")

    try:
        # Trigger background sync via service
        await KnowledgeService.sync_source(db, request.app.state.arq_pool, source_id)
        return {"message": "Sync started successfully"}
    except Exception as e:
        logger.error(f"Guru sync failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
