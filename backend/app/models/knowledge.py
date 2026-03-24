"""
Knowledge system models.

Architecture:
  Source → Document → Chunk → Embedding
  Folder ←→ Document (many-to-many via DocumentFolder)
"""

import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import (
    String, JSON, Boolean, DateTime, ForeignKey, Text, Integer, Uuid, Table, Column, Enum
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector

from app.db.base import Base


# ── Association Table ──

document_folders = Table(
    "document_folders",
    Base.metadata,
    Column("document_id", Uuid, ForeignKey("knowledge_documents.id", ondelete="CASCADE"), primary_key=True),
    Column("folder_id", Uuid, ForeignKey("folders.id", ondelete="CASCADE"), primary_key=True),
)


# ── Source ──

class KnowledgeSource(Base):
    """A connected data source (Notion workspace, file upload batch, website, etc.)."""
    __tablename__ = "knowledge_sources"

    workspace_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("workspaces.id"), index=True, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # file, notion, website, etc.

    # Connection details (access tokens, API keys, URLs)
    config: Mapped[dict] = mapped_column(JSON, default=dict)

    # Advanced settings (chunking config, PII filters, etc.)
    settings: Mapped[dict] = mapped_column(JSON, default=dict)

    # Sync state
    sync_status: Mapped[str] = mapped_column(String(50), default="idle")  # idle, syncing, error
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    document_count: Mapped[int] = mapped_column(Integer, default=0)

    # Legacy compat
    status: Mapped[str] = mapped_column(String(50), default="healthy")

    # Relationships
    documents: Mapped[list["KnowledgeDocument"]] = relationship(
        "KnowledgeDocument", back_populates="source", cascade="all, delete-orphan"
    )


# ── Document ──

class KnowledgeDocument(Base):
    """A normalized document from any connector. Tracks processing status."""
    __tablename__ = "knowledge_documents"

    source_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("knowledge_sources.id"), index=True, nullable=True
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("workspaces.id"), index=True, nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), index=True, nullable=False
    )
    external_id: Mapped[str] = mapped_column(String(255), index=True, nullable=False)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[str] = mapped_column(String(50), default="text/plain")

    # Document type (notion_page, pdf, txt, docx, website, etc.)
    type: Mapped[str] = mapped_column(String(50), default="unknown")

    # Processing status: pending → processing → ready | failed
    status: Mapped[str] = mapped_column(String(50), default="pending", index=True)

    # Usage toggles (Access control for AI features)
    usage_agent: Mapped[bool] = mapped_column(Boolean, default=True)
    usage_copilot: Mapped[bool] = mapped_column(Boolean, default=True)
    usage_help_center: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    source: Mapped[Optional["KnowledgeSource"]] = relationship("KnowledgeSource", back_populates="documents")
    chunks: Mapped[List["KnowledgeChunk"]] = relationship(
        "KnowledgeChunk", back_populates="document", cascade="all, delete-orphan"
    )
    folders: Mapped[List["Folder"]] = relationship(
        "Folder", secondary=document_folders, back_populates="documents"
    )


# ── Chunk ──

class KnowledgeChunk(Base):
    """A text segment of a document, ready for embedding."""
    __tablename__ = "knowledge_chunks"

    document_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("knowledge_documents.id", ondelete="CASCADE"), index=True, nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)

    # Relationships
    document: Mapped["KnowledgeDocument"] = relationship("KnowledgeDocument", back_populates="chunks")
    embeddings: Mapped[List["KnowledgeEmbedding"]] = relationship(
        "KnowledgeEmbedding", back_populates="chunk", cascade="all, delete-orphan"
    )


# ── Embedding ──

class KnowledgeEmbedding(Base):
    """Vector representation of a chunk using pgvector."""
    __tablename__ = "knowledge_embeddings"

    chunk_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("knowledge_chunks.id", ondelete="CASCADE"), index=True, nullable=False
    )
    vector: Mapped[List[float]] = mapped_column(Vector(1536), nullable=False)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)

    # Relationships
    chunk: Mapped["KnowledgeChunk"] = relationship("KnowledgeChunk", back_populates="embeddings")


# ── Folder ──

class Folder(Base):
    """User-defined folder for organizing documents. Supports nesting."""
    __tablename__ = "folders"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("workspaces.id"), index=True, nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("folders.id", ondelete="CASCADE"), nullable=True
    )

    # Usage toggles (Cascades to documents if implemented in API)
    usage_agent: Mapped[bool] = mapped_column(Boolean, default=True)
    usage_copilot: Mapped[bool] = mapped_column(Boolean, default=True)
    usage_help_center: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    children: Mapped[list["Folder"]] = relationship(
        "Folder", back_populates="parent", cascade="all, delete-orphan"
    )
    parent: Mapped[Optional["Folder"]] = relationship(
        "Folder", back_populates="children", remote_side="Folder.id"
    )
    documents: Mapped[List["KnowledgeDocument"]] = relationship(
        "KnowledgeDocument", secondary=document_folders, back_populates="folders"
    )
