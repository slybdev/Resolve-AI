"""
Pydantic schemas for the knowledge system.

Covers: Sources, Documents, Folders.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from uuid import UUID
from pydantic import BaseModel, ConfigDict


# ── Source Schemas ──

class KnowledgeSourceBase(BaseModel):
    name: str
    type: str  # file, notion, website, etc.
    config: Dict[str, Any] = {}
    settings: Dict[str, Any] = {}


class KnowledgeSourceCreate(KnowledgeSourceBase):
    pass


class KnowledgeSourceUpdate(BaseModel):
    name: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    settings: Optional[Dict[str, Any]] = None


class KnowledgeSourceRead(KnowledgeSourceBase):
    id: UUID
    workspace_id: UUID
    sync_status: str = "idle"
    status: str = "healthy"
    last_sync_at: Optional[datetime] = None
    error_message: Optional[str] = None
    document_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Document Schemas ──

class DocumentRead(BaseModel):
    id: UUID
    workspace_id: UUID
    source_id: Optional[UUID] = None
    external_id: str
    title: str
    type: str
    status: str  # pending, processing, ready, failed
    content_type: str = "text/plain"
    created_at: datetime
    updated_at: datetime
    folder_ids: List[UUID] = []

    # Usage toggles
    usage_agent: bool = True
    usage_copilot: bool = True
    usage_help_center: bool = True

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_with_folders(cls, doc):
        """Build DocumentRead including folder IDs."""
        data = {
            "id": doc.id,
            "workspace_id": doc.workspace_id,
            "source_id": doc.source_id,
            "external_id": doc.external_id,
            "title": doc.title,
            "type": doc.type,
            "status": doc.status,
            "content_type": doc.content_type,
            "created_at": doc.created_at,
            "updated_at": doc.updated_at,
            "folder_ids": [f.id for f in doc.folders] if doc.folders else [],
            "usage_agent": doc.usage_agent,
            "usage_copilot": doc.usage_copilot,
            "usage_help_center": doc.usage_help_center,
        }
        return cls(**data)


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    usage_agent: Optional[bool] = None
    usage_copilot: Optional[bool] = None
    usage_help_center: Optional[bool] = None


class DocumentUploadResponse(BaseModel):
    id: UUID
    title: str
    status: str

    model_config = ConfigDict(from_attributes=True)


# ── Folder Schemas ──

class FolderCreate(BaseModel):
    name: str
    parent_id: Optional[UUID] = None


class FolderUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[UUID] = None
    usage_agent: Optional[bool] = None
    usage_copilot: Optional[bool] = None
    usage_help_center: Optional[bool] = None


class FolderRead(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str
    parent_id: Optional[UUID] = None
    usage_agent: bool = True
    usage_copilot: bool = True
    usage_help_center: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentFolderAssign(BaseModel):
    document_id: UUID
