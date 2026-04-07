"""
Knowledge API routes.

Endpoints:
  Sources:    CRUD + sync + file upload
  Documents:  List, get, upload, delete
  Folders:    CRUD + document assignment
"""

from typing import List, Optional
from uuid import UUID
import logging
import json
import asyncio

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form, Request, WebSocket, WebSocketDisconnect
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import os
import uuid

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.models.knowledge import KnowledgeSource, KnowledgeDocument, Folder, document_folders
from app.services.knowledge_service import KnowledgeService
from app.services.ingestion_service import IngestionService
from app.schemas.knowledge import (
    KnowledgeSourceCreate, KnowledgeSourceUpdate, KnowledgeSourceRead,
    DocumentRead, DocumentDetailRead, DocumentUpdate, DocumentUploadResponse,
    FolderCreate, FolderUpdate, FolderRead, DocumentFolderAssign,
)
from app.connectors.website_connector import WebsiteConnector

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/workspaces/{workspace_id}/knowledge", tags=["knowledge"])


# ═══════════════════════════════════════════════════════════════
#  SOURCES
# ═══════════════════════════════════════════════════════════════

@router.get("/sources", response_model=List[KnowledgeSourceRead])
async def list_sources(
    workspace_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(KnowledgeSource).where(KnowledgeSource.workspace_id == workspace_id)
    )
    return result.scalars().all()


@router.post("/sources", response_model=KnowledgeSourceRead)
async def create_source(
    workspace_id: UUID,
    source_in: KnowledgeSourceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    source = KnowledgeSource(
        **source_in.model_dump(), 
        workspace_id=workspace_id,
        user_id=current_user.id
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return source


@router.get("/sources/{source_id}", response_model=KnowledgeSourceRead)
async def get_source(
    workspace_id: UUID,
    source_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(KnowledgeSource).where(
            KnowledgeSource.id == source_id,
            KnowledgeSource.workspace_id == workspace_id,
        )
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    return source


@router.patch("/sources/{source_id}", response_model=KnowledgeSourceRead)
async def update_source(
    workspace_id: UUID,
    source_id: UUID,
    source_in: KnowledgeSourceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(KnowledgeSource).where(
            KnowledgeSource.id == source_id,
            KnowledgeSource.workspace_id == workspace_id,
        )
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    for field, value in source_in.model_dump(exclude_unset=True).items():
        setattr(source, field, value)

    await db.commit()
    await db.refresh(source)
    return source


@router.delete("/sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_source(
    workspace_id: UUID,
    source_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(KnowledgeSource).where(
            KnowledgeSource.id == source_id,
            KnowledgeSource.workspace_id == workspace_id,
        )
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    await db.delete(source)
    await db.commit()


@router.post("/sources/{source_id}/sync")
async def sync_source(
    workspace_id: UUID,
    source_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger a manual sync for a source."""
    try:
        await KnowledgeService.sync_source(db, request.app.state.arq_pool, source_id)
        return {"message": "Sync started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sources/website/preview")
async def preview_website(
    workspace_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Shallow crawl a website URL to discover links for user preview.
    """
    try:
        body = await request.json()
        url = body.get("url", "").strip()
        
        if not url:
            raise HTTPException(status_code=400, detail="URL is required")

        connector = WebsiteConnector()
        # Pass the full body to ensure crawl_mode, max_depth, page_limit, patterns are available
        connected = await connector.connect(body)
        if not connected:
            raise HTTPException(status_code=400, detail="Failed to connect to URL")
            
        links = await connector.preview_links()
        return {"links": links}
    except Exception as e:
        logger.error(f"Preview failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sources/website/scrape", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def scrape_website(
    workspace_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Scrape a website URL and add content to knowledge base.
    
    Request body:
      {
        "url": "https://example.com/article",
        "folder_id": "optional-folder-uuid"
      }
    """
    try:
        body = await request.json()
        url = body.get("url", "").strip()
        folder_id = body.get("folder_id")
        
        # 💎 GOD_MODE v6: EXTREME NAMING ROBUSTNESS
        # Check all possible keys that might contain the user's provided name
        provided_name = (
            body.get("name") or 
            body.get("source_name") or 
            body.get("title") or 
            ""
        ).strip()
        
        # v6: ZERO FALLBACK DIAGNOSTIC
        source_name = provided_name or f"BACKEND_RECEIVED_NO_NAME_FOR_{url[:20]}"
        
        if not url:
            raise HTTPException(status_code=400, detail="URL is required")
        
        logger.info(f"╔═══════════════════════════════════════════════╗")
        logger.info(f"║ 💎 GOD_MODE v6: NAMING TRACE                 ║")
        logger.info(f"║ ALL KEYS RECEIVED: {list(body.keys())}       ║")
        logger.info(f"║ URL: {url:<40} ║")
        logger.info(f"║ PROVIDED_NAME: {provided_name:<30} ║")
        logger.info(f"║ FINAL SOURCE_NAME: {source_name:<26} ║")
        logger.info(f"╚═══════════════════════════════════════════════╝")
        
        # Create a KnowledgeSource for this website
        source = KnowledgeSource(
            name=source_name,
            type="website",
            config={
                "url": url,
                "crawl_mode": body.get("crawl_mode", "subpages"),
                "max_depth": body.get("max_depth", 2),
                "page_limit": body.get("page_limit", 50),
                "include_patterns": body.get("include_patterns", []),
                "exclude_patterns": body.get("exclude_patterns", []),
                "frequency": body.get("frequency", "once"),
                "content_focus": body.get("content_focus", "docs"),
                "target_urls": body.get("target_urls", []),  # GOD_MODE: Specific URLs to ingest
                "respect_robots_txt": body.get("respect_robots_txt", True)
            },
            workspace_id=workspace_id,
            user_id=current_user.id,
            sync_status="syncing",
            status="pending"
        )
        db.add(source)
        await db.flush() # GOD_MODE: Ensure source has an ID before creating document
        
        # Create document with status=scraping
        doc = KnowledgeDocument(
            source_id=source.id,
            workspace_id=workspace_id,
            user_id=current_user.id,
            external_id=f"pending-{uuid.uuid4()}",
            title=source_name, # GOD_MODE: Consistency between source and doc title
            content="",
            type="website",
            status="scraping",
        )
        db.add(doc)
        await db.commit()
        await db.refresh(source)
        await db.refresh(doc)
        
        logger.info(f"✓ ATOMIC CREATION COMPLETE: {source.id} ({source.name})")
        
        # Assign to folder if specified
        if folder_id:
            folder = await db.get(Folder, folder_id)
            if folder and folder.workspace_id == workspace_id:
                await db.execute(
                    document_folders.insert().values(document_id=doc.id, folder_id=folder_id)
                )
                await db.commit()
                logger.info(f"Assigned document {doc.id} to folder {folder_id}")
        
        # Enqueue background scraping job
        try:
            logger.info(f"➤ ENQUEUEING BACKGROUND SCRAPE JOB (folder: {folder_id})...")
            await request.app.state.arq_pool.enqueue_job("scrape_document_job", str(doc.id), url, str(folder_id) if folder_id else None)
            logger.info(f"✓ JOB ENQUEUED SUCCESSFULLY")
        except Exception as e:
            logger.error(f"✗ FAILED TO ENQUEUE JOB: {e}", exc_info=True)

        return {
            "id": doc.id,
            "title": doc.title,
            "status": doc.status,
            "resolved_source_name": source.name # v6: Echo back for frontend diagnostics
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Website scraping failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Website scraping failed: {str(e)}")


# ═══════════════════════════════════════════════════════════════
#  DOCUMENTS
# ═══════════════════════════════════════════════════════════════

@router.get("/documents", response_model=List[DocumentRead])
async def list_documents(
    workspace_id: UUID,
    source_id: Optional[UUID] = None,
    folder_id: Optional[UUID] = None,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List documents in this workspace. All team members can access shared documents."""
    query = (
        select(KnowledgeDocument)
        .options(selectinload(KnowledgeDocument.folders))
        .where(KnowledgeDocument.workspace_id == workspace_id)
        # Note: Removed user_id filter — knowledge is workspace-scoped, not user-scoped
    )

    if source_id:
        query = query.where(KnowledgeDocument.source_id == source_id)
    if status_filter:
        query = query.where(KnowledgeDocument.status == status_filter)
    if folder_id:
        query = query.join(document_folders).where(document_folders.c.folder_id == folder_id)

    result = await db.execute(query.order_by(KnowledgeDocument.created_at.desc()))
    docs = result.scalars().unique().all()
    return [DocumentRead.from_orm_with_folders(d) for d in docs]


@router.get("/documents/{document_id}", response_model=DocumentDetailRead)
async def get_document(
    workspace_id: UUID,
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(KnowledgeDocument)
        .options(selectinload(KnowledgeDocument.folders))
        .where(
            KnowledgeDocument.id == document_id,
            KnowledgeDocument.workspace_id == workspace_id,
            # Note: Workspace members can view any workspace document
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentDetailRead.from_orm_with_folders(doc)


@router.post("/documents/upload", response_model=DocumentUploadResponse)
async def upload_document(
    workspace_id: UUID,
    request: Request,
    file: UploadFile = File(...),
    source_id: Optional[UUID] = Form(None),
    folder_id: Optional[UUID] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a file → create Document (status=pending) → trigger background ingestion."""
    upload_dir = "/app/uploads"
    os.makedirs(upload_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "")[1]
    filename = f"{uuid.uuid4()}{ext}"
    local_path = os.path.join(upload_dir, filename)

    try:
        logger.info(
            "Upload document request: workspace=%s file=%s source=%s folder=%s",
            workspace_id,
            file.filename,
            source_id,
            folder_id,
        )
        content = await file.read()
        with open(local_path, "wb") as f:
            f.write(content)
        logger.info("Saved uploaded file to %s", local_path)

        doc = await KnowledgeService.create_document_from_upload(
            db=db,
            arq_pool=request.app.state.arq_pool,
            workspace_id=workspace_id,
            user_id=current_user.id,
            source_id=source_id,
            file_path=local_path,
            original_filename=file.filename or "unknown",
        )

        # Assign to folder if specified
        if folder_id:
            folder = await db.get(Folder, folder_id)
            if folder and folder.workspace_id == workspace_id:
                await db.execute(
                    document_folders.insert().values(document_id=doc.id, folder_id=folder_id)
                )
                await db.commit()
                logger.info("Assigned uploaded document %s to folder %s", doc.id, folder_id)
            else:
                logger.warning("Folder assignment skipped: folder %s not found or mismatched workspace", folder_id)

        return DocumentUploadResponse(id=doc.id, title=doc.title, status=doc.status)

    except Exception as e:
        import logging
        logging.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.patch("/documents/{document_id}", response_model=DocumentRead)
async def patch_document(
    workspace_id: UUID,
    document_id: UUID,
    update_data: DocumentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update document properties (title or usage toggles)."""
    result = await db.execute(
        select(KnowledgeDocument).where(
            KnowledgeDocument.id == document_id,
            KnowledgeDocument.workspace_id == workspace_id
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Update fields
    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(doc, field, value)

    await db.commit()
    await db.refresh(doc)
    
    # Reload with folders
    result = await db.execute(
        select(KnowledgeDocument).options(selectinload(KnowledgeDocument.folders)).where(KnowledgeDocument.id == document_id)
    )
    doc = result.scalar_one()
    return DocumentRead.from_orm_with_folders(doc)


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    workspace_id: UUID,
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(KnowledgeDocument).where(
            KnowledgeDocument.id == document_id,
            KnowledgeDocument.workspace_id == workspace_id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Update source document count if applicable
    if doc.source_id:
        result = await db.execute(select(KnowledgeSource).where(KnowledgeSource.id == doc.source_id))
        source = result.scalar_one_or_none()
        if source and source.document_count > 0:
            source.document_count -= 1

    await db.delete(doc)
    await db.commit()


# ═══════════════════════════════════════════════════════════════
#  FOLDERS
# ═══════════════════════════════════════════════════════════════

@router.get("/folders", response_model=List[FolderRead])
async def list_folders(
    workspace_id: UUID,
    parent_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Folder).where(Folder.workspace_id == workspace_id)
    if parent_id:
        query = query.where(Folder.parent_id == parent_id)
    else:
        query = query.where(Folder.parent_id.is_(None))

    result = await db.execute(query.order_by(Folder.name))
    return result.scalars().all()


@router.post("/folders", response_model=FolderRead)
async def create_folder(
    workspace_id: UUID,
    folder_in: FolderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    folder = Folder(
        workspace_id=workspace_id,
        user_id=current_user.id,
        name=folder_in.name,
        parent_id=folder_in.parent_id,
    )
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    return folder


@router.patch("/folders/{folder_id}", response_model=FolderRead)
async def update_folder(
    workspace_id: UUID,
    folder_id: UUID,
    folder_in: FolderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a folder's properties and cascade usage toggles."""
    result = await db.execute(
        select(Folder).where(Folder.id == folder_id, Folder.workspace_id == workspace_id)
    )
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    update_dict = folder_in.model_dump(exclude_unset=True)
    
    for field, value in update_dict.items():
        setattr(folder, field, value)

    # Cascade usage toggles to all documents in this folder
    usage_fields = ["usage_agent", "usage_copilot", "usage_help_center"]
    updated_usage = {f: update_dict[f] for f in usage_fields if f in update_dict}

    if updated_usage:
        # Update documents linked to this folder
        await db.execute(
            update(KnowledgeDocument)
            .where(KnowledgeDocument.folders.any(Folder.id == folder_id))
            .values(**updated_usage)
        )

    await db.commit()
    await db.refresh(folder)
    return folder


@router.delete("/folders/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(
    workspace_id: UUID,
    folder_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Folder).where(Folder.id == folder_id, Folder.workspace_id == workspace_id)
    )
    folder = result.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    await db.delete(folder)
    await db.commit()


# ═══════════════════════════════════════════════════════════════
#  STREAMING DOCUMENT INGESTION
# ═══════════════════════════════════════════════════════════════

@router.websocket("/ws/ingest/{document_id}")
async def websocket_stream_ingestion(
    websocket: WebSocket,
    workspace_id: UUID,
    document_id: UUID,
):
    """
    WebSocket endpoint for real-time ingestion progress tracking.
    
    Flow:
    1. Client connects: ws://api/v1/workspaces/{id}/knowledge/ws/ingest/{doc_id}
    2. Backend starts ingestion pipeline in background
    3. Progress updates streamed to client:
       {"status": "chunking", "percent": 10, "current_step": "Chunking document..."}
       {"status": "vectorizing", "percent": 50, "current_step": "Generating embeddings..."}
       {"status": "ready", "percent": 100, "current_step": "Complete!"}
    4. On completion or error, connection closes with final status
    
    Example client code (JavaScript):
    ```
    const ws = new WebSocket(`wss://api.example.com/api/v1/workspaces/${id}/knowledge/ws/ingest/${doc_id}`);
    
    ws.onmessage = (event) => {
        const progress = JSON.parse(event.data);
        console.log(`${progress.status}: ${progress.percent}%`);
    };
    
    ws.onclose = () => console.log('Ingestion complete!');
    ```
    """
    await websocket.accept()
    
    try:
        # Get document
        db: AsyncSession
        async with get_db() as db:
            doc = await db.get(KnowledgeDocument, document_id)
            if not doc:
                await websocket.send_json({
                    "status": "error",
                    "message": "Document not found",
                    "percent": 0
                })
                await websocket.close(code=1000)
                return
            
            if doc.workspace_id != workspace_id:
                await websocket.send_json({
                    "status": "error",
                    "message": "Unauthorized",
                    "percent": 0
                })
                await websocket.close(code=1000)
                return
        
        # Send initial status
        await websocket.send_json({
            "status": "pending",
            "percent": 0,
            "current_step": "Initializing ingestion...",
            "timestamp": asyncio.get_event_loop().time()
        })
        
        # Process document in background with progress tracking
        async with get_db() as db:
            doc = await db.get(KnowledgeDocument, document_id)
            
            # Simulate progress updates (will be refined in actual implementation)
            # In production, you'd hook into IngestionService for real updates
            
            # CHUNKING PHASE
            await websocket.send_json({
                "status": "chunking",
                "percent": 15,
                "current_step": "Chunking document (token-based)...",
                "timestamp": asyncio.get_event_loop().time()
            })
            await asyncio.sleep(0.5)
            
            # CHUNKING COMPLETE
            await websocket.send_json({
                "status": "chunking",
                "percent": 30,
                "current_step": f"Created chunks, now vectorizing...",
                "timestamp": asyncio.get_event_loop().time()
            })
            
            # VECTORIZING PHASE
            await websocket.send_json({
                "status": "vectorizing",
                "percent": 50,
                "current_step": "Generating embeddings (Gemini API)...",
                "timestamp": asyncio.get_event_loop().time()
            })
            await asyncio.sleep(0.5)
            
            # START ACTUAL INGESTION
            try:
                await IngestionService.process_document(db, document_id)
                
                # Final success status
                await websocket.send_json({
                    "status": "ready",
                    "percent": 100,
                    "current_step": "Ingestion complete!",
                    "timestamp": asyncio.get_event_loop().time(),
                    "message": "Document successfully processed"
                })
            except Exception as e:
                logger.error(f"Ingestion failed for document {document_id}: {e}")
                await websocket.send_json({
                    "status": "failed",
                    "percent": 0,
                    "current_step": "Ingestion failed",
                    "error": str(e),
                    "timestamp": asyncio.get_event_loop().time()
                })
                await db.rollback()
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected during ingestion of {document_id}")
    except Exception as e:
        logger.error(f"WebSocket error during ingestion: {e}")
        try:
            await websocket.send_json({
                "status": "error",
                "message": "Server error",
                "error": str(e)
            })
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass


@router.post("/folders/{folder_id}/documents", status_code=status.HTTP_201_CREATED)
async def assign_document_to_folder(
    workspace_id: UUID,
    folder_id: UUID,
    body: DocumentFolderAssign,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Assign a document to a folder (many-to-many)."""
    # Verify folder
    folder = await db.get(Folder, folder_id)
    if not folder or folder.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Folder not found")

    # Verify document
    doc = await db.get(KnowledgeDocument, body.document_id)
    if not doc or doc.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Document not found")

    await db.execute(
        document_folders.insert().values(document_id=body.document_id, folder_id=folder_id)
    )
    await db.commit()
    return {"message": "Document assigned to folder"}


@router.delete("/folders/{folder_id}/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_document_from_folder(
    workspace_id: UUID,
    folder_id: UUID,
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a document from a folder."""
    await db.execute(
        document_folders.delete().where(
            document_folders.c.document_id == document_id,
            document_folders.c.folder_id == folder_id,
        )
    )
    await db.commit()


# ═══════════════════════════════════════════════════════════════
#  LEGACY COMPAT — /sources/{source_id}/upload
# ═══════════════════════════════════════════════════════════════

@router.post("/sources/{source_id}/upload")
async def upload_knowledge_file(
    workspace_id: UUID,
    source_id: UUID,
    request: Request,
    parent_id: Optional[UUID] = Form(None),
    folder_id: Optional[UUID] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Legacy upload endpoint. Redirects to the new document upload flow."""
    upload_dir = "/app/uploads"
    os.makedirs(upload_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "")[1]
    filename = f"{uuid.uuid4()}{ext}"
    local_path = os.path.join(upload_dir, filename)

    try:
        logger.info(
            "Legacy source upload request: workspace=%s source=%s parent_id=%s folder_id=%s file=%s",
            workspace_id,
            source_id,
            parent_id,
            folder_id,
            file.filename,
        )
        content = await file.read()
        with open(local_path, "wb") as f:
            f.write(content)
        logger.info("Saved legacy uploaded file to %s", local_path)

        doc = await KnowledgeService.create_document_from_upload(
            db=db,
            arq_pool=request.app.state.arq_pool,
            workspace_id=workspace_id,
            user_id=current_user.id,
            source_id=source_id,
            file_path=local_path,
            original_filename=file.filename or "unknown",
        )

        selected_folder_id = folder_id or parent_id
        if selected_folder_id:
            folder = await db.get(Folder, selected_folder_id)
            if folder and folder.workspace_id == workspace_id:
                await db.execute(
                    document_folders.insert().values(document_id=doc.id, folder_id=selected_folder_id)
                )
                await db.commit()
                logger.info("Assigned legacy uploaded document %s to folder %s", doc.id, selected_folder_id)
            else:
                logger.warning("Legacy folder assignment skipped: folder %s not found or mismatched workspace", selected_folder_id)

        return {"id": str(doc.id), "title": doc.title, "status": doc.status}

    except Exception as e:
        import logging
        logging.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
