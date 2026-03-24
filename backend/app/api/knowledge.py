"""
Knowledge API routes.

Endpoints:
  Sources:    CRUD + sync + file upload
  Documents:  List, get, upload, delete
  Folders:    CRUD + document assignment
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form, Request
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import os
import uuid

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.models.knowledge import KnowledgeSource, KnowledgeDocument, Folder, document_folders
from app.services.knowledge_service import KnowledgeService
from app.schemas.knowledge import (
    KnowledgeSourceCreate, KnowledgeSourceUpdate, KnowledgeSourceRead,
    DocumentRead, DocumentUpdate, DocumentUploadResponse,
    FolderCreate, FolderUpdate, FolderRead, DocumentFolderAssign,
)

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
    """List documents, optionally filtered by source, folder, or status."""
    query = (
        select(KnowledgeDocument)
        .options(selectinload(KnowledgeDocument.folders))
        .where(KnowledgeDocument.workspace_id == workspace_id)
        .where(KnowledgeDocument.user_id == current_user.id)
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


@router.get("/documents/{document_id}", response_model=DocumentRead)
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
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentRead.from_orm_with_folders(doc)


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
        content = await file.read()
        with open(local_path, "wb") as f:
            f.write(content)

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
        content = await file.read()
        with open(local_path, "wb") as f:
            f.write(content)

        doc = await KnowledgeService.create_document_from_upload(
            db=db,
            arq_pool=request.app.state.arq_pool,
            workspace_id=workspace_id,
            user_id=current_user.id,
            source_id=source_id,
            file_path=local_path,
            original_filename=file.filename or "unknown",
        )

        return {"id": str(doc.id), "title": doc.title, "status": doc.status}

    except Exception as e:
        import logging
        logging.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
