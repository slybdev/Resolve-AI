"""
Knowledge service — orchestration layer.

Responsibilities:
  - Source management (create, sync)
  - Document creation (via connectors)
  - Triggering background ingestion
  - Vector search

This service does NOT do chunking or embedding — that is IngestionService's job.
"""

import uuid
import os
import asyncio
import logging
from typing import List, Optional
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.knowledge import (
    KnowledgeSource, KnowledgeDocument, KnowledgeChunk, KnowledgeEmbedding
)
from app.connectors.base import BaseConnector, NormalizedDocument
from app.connectors.file_connector import FileConnector
from app.connectors.notion_connector import NotionConnector
from app.services.ingestion_service import IngestionService
from app.embeddings.gemini import GeminiEmbeddingProvider
from app.db.session import async_session_factory

logger = logging.getLogger(__name__)


def get_connector(source_type: str) -> BaseConnector:
    """Factory: return the correct connector for a source type."""
    connectors = {
        "file": FileConnector,
        "notion": NotionConnector,
    }
    cls = connectors.get(source_type)
    if not cls:
        raise ValueError(f"Unsupported connector type: {source_type}")
    return cls()


class KnowledgeService:
    """Orchestrates knowledge ingestion and search."""

    # ── File Upload ──

    @staticmethod
    async def create_document_from_upload(
        db: AsyncSession,
        arq_pool,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
        source_id: uuid.UUID | None,
        file_path: str,
        original_filename: str,
    ) -> KnowledgeDocument:
        """
        Create a Document from a file upload and trigger background ingestion.
        Returns the document immediately with status='pending'.
        """
        connector = FileConnector()
        connected = await connector.connect({
            "file_path": file_path,
            "filename": original_filename,
        })
        if not connected:
            raise ValueError(f"Could not process file: {original_filename}")

        # Extract content via connector
        normalized_docs = await connector.fetch_documents()
        if not normalized_docs:
            raise ValueError("No content extracted from file")

        norm = normalized_docs[0]

        # Create Document record (status=pending)
        doc = KnowledgeDocument(
            source_id=source_id,
            workspace_id=workspace_id,
            user_id=user_id,
            external_id=norm.external_id,
            title=norm.title,
            content=norm.content,
            type=norm.doc_type,
            status="pending",
        )
        db.add(doc)

        # Update source metadata
        if source_id:
            source = await db.get(KnowledgeSource, source_id)
            if source:
                source.document_count += 1
                source.sync_status = "syncing"

        await db.commit()
        await db.refresh(doc)

        # Fire background ingestion via arq (Redis queue)
        await arq_pool.enqueue_job("process_document_job", str(doc.id))

        return doc

    # ── Source Sync ──

    @staticmethod
    async def sync_source(db: AsyncSession, arq_pool, source_id: uuid.UUID):
        """
        Sync a source using its connector. Creates/updates documents
        and triggers background ingestion for each.
        """
        source = await db.get(KnowledgeSource, source_id)
        if not source:
            raise ValueError("Source not found")

        # Update sync status
        source.sync_status = "syncing"
        await db.commit()

        try:
            connector = get_connector(source.type)
            connected = await connector.connect(source.config)
            if not connected:
                raise ValueError(f"Failed to connect to {source.type} source")

            normalized_docs = await connector.fetch_documents()

            new_count = 0
            for norm in normalized_docs:
                # Check for existing document (deduplication via external_id)
                stmt = select(KnowledgeDocument).where(
                    KnowledgeDocument.source_id == source_id,
                    KnowledgeDocument.external_id == norm.external_id,
                )
                result = await db.execute(stmt)
                existing = result.scalar_one_or_none()

                if existing:
                    # Update existing document content
                    existing.title = norm.title
                    existing.content = norm.content
                    # Re-process via Redis worker
                    await arq_pool.enqueue_job("process_document_job", str(existing.id))
                else:
                    # Create new document
                    doc = KnowledgeDocument(
                        source_id=source_id,
                        workspace_id=source.workspace_id,
                        user_id=source.user_id,
                        external_id=norm.external_id,
                        title=norm.title,
                        content=norm.content,
                        type=norm.doc_type,
                        status="pending",
                    )
                    db.add(doc)
                    await db.commit()
                    await db.refresh(doc)
                    new_count += 1
                    # Process via Redis worker
                    await arq_pool.enqueue_job("process_document_job", str(doc.id))

            # Update source metadata
            source.sync_status = "idle"
            source.last_sync_at = datetime.now()
            source.status = "healthy"
            source.document_count += new_count
            await db.commit()

            logger.info(f"Synced source {source_id}: {len(normalized_docs)} docs, {new_count} new")

        except Exception as e:
            logger.error(f"Sync failed for source {source_id}: {e}")
            source.sync_status = "error"
            source.error_message = str(e)
            source.status = "failed"
            await db.commit()
            raise

    # ── Vector Search ──

    @staticmethod
    async def vector_search(
        db: AsyncSession,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
        query: str,
        top_k: int = 5,
    ):
        """Semantic search across all ready documents in a workspace."""
        provider = GeminiEmbeddingProvider()
        query_vector = await provider.embed_text(query)

        # pgvector cosine distance, only search 'ready' documents
        stmt = (
            select(KnowledgeChunk, KnowledgeDocument)
            .join(KnowledgeDocument, KnowledgeChunk.document_id == KnowledgeDocument.id)
            .join(KnowledgeEmbedding, KnowledgeChunk.id == KnowledgeEmbedding.chunk_id)
            .where(KnowledgeDocument.workspace_id == workspace_id)
            .where(KnowledgeDocument.user_id == user_id)
            .where(KnowledgeDocument.status == "ready")
            .order_by(KnowledgeEmbedding.vector.cosine_distance(query_vector))
            .limit(top_k)
        )

        result = await db.execute(stmt)
        return result.all()

    # ── Internal Helpers ──


