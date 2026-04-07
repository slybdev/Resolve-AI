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

from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.knowledge import (
    KnowledgeSource, KnowledgeDocument, KnowledgeChunk, KnowledgeEmbedding
)
from app.connectors.base import BaseConnector, NormalizedDocument
from app.connectors.file_connector import FileConnector
from app.connectors.notion_connector import NotionConnector
from app.connectors.website_connector import WebsiteConnector
from app.connectors.confluence_connector import ConfluenceConnector
from app.connectors.guru_connector import GuruConnector
from app.services.ingestion_service import IngestionService
from app.embeddings.gemini import GeminiEmbeddingProvider
from app.db.session import async_session_factory

logger = logging.getLogger(__name__)


def get_connector(source_type: str) -> BaseConnector:
    """Factory: return the correct connector for a source type."""
    connectors = {
        "file": FileConnector,
        "notion": NotionConnector,
        "website": WebsiteConnector,
        "confluence": ConfluenceConnector,
        "guru": GuruConnector,
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
        logger.info("Processing upload file %s at %s", original_filename, file_path)
        connector = FileConnector()
        connected = await connector.connect({
            "file_path": file_path,
            "filename": original_filename,
        })
        if not connected:
            logger.error("File connector failed for %s", original_filename)
            raise ValueError(f"Could not process file: {original_filename}")

        # Extract content via connector
        normalized_docs = await connector.fetch_documents()
        if not normalized_docs:
            logger.error("No normalized documents returned from file connector for %s", original_filename)
            raise ValueError("No content extracted from file")
        logger.info("File connector extracted %s normalized document(s) from %s", len(normalized_docs), original_filename)

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
        try:
            await arq_pool.enqueue_job("process_document_job", str(doc.id))
        except Exception as e:
            logger.warning(f"Failed to enqueue ingestion job for document {doc.id}: {e}. Processing synchronously instead.")
            await IngestionService.process_document(db, doc.id)

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
            # Pass config + last_sync_at + settings for smart connectors
            connector_config = {
                **(source.config or {}),
                "last_sync_at": source.last_sync_at,
                "settings": source.settings or {}
            }
            
            connected = await connector.connect(connector_config)
            if not connected:
                raise ValueError(f"Failed to connect to {source.type} source")

            normalized_docs = await connector.fetch_documents()

            new_count = 0
            for norm in normalized_docs:
                is_stale = norm.doc_metadata.get("is_stale", True)
                
                # Check for existing document (deduplication via external_id)
                stmt = select(KnowledgeDocument).where(
                    KnowledgeDocument.source_id == source_id,
                    KnowledgeDocument.external_id == norm.external_id,
                )
                result = await db.execute(stmt)
                existing = result.scalar_one_or_none()

                if existing:
                    existing.doc_metadata = norm.doc_metadata
                    if is_stale:
                        # Update existing document content
                        existing.title = norm.title
                        existing.content = norm.content
                        # Clean up old chunks + embeddings before re-processing
                        old_chunks = await db.execute(
                            select(KnowledgeChunk).where(KnowledgeChunk.document_id == existing.id)
                        )
                        for chunk in old_chunks.scalars().all():
                            await db.execute(
                                delete(KnowledgeEmbedding).where(KnowledgeEmbedding.chunk_id == chunk.id)
                            )
                        await db.execute(
                            delete(KnowledgeChunk).where(KnowledgeChunk.document_id == existing.id)
                        )
                        await db.commit()
                        # Re-process via Redis worker
                        await arq_pool.enqueue_job("process_document_job", str(existing.id))
                        logger.info(f"Updated and re-enqueued stale document: {existing.title}")
                    else:
                        logger.debug(f"Skipping re-ingestion for unchanged document: {existing.title}")
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
                        doc_metadata=norm.doc_metadata
                    )
                    db.add(doc)
                    await db.commit()
                    await db.refresh(doc)
                    new_count += 1
                    # Process via Redis worker
                    await arq_pool.enqueue_job("process_document_job", str(doc.id))
                    logger.info(f"Ingesting new document: {doc.title}")

            # Update source metadata
            source.sync_status = "idle"
            source.last_sync_at = datetime.now()
            source.status = "healthy"
            source.document_count = await db.scalar(
                select(func.count(KnowledgeDocument.id)).where(KnowledgeDocument.source_id == source.id)
            )

            # 📊 Collect metrics from connector if available
            metrics = getattr(connector, "last_sync_metrics", {})
            if metrics:
                current_settings = source.settings or {}
                # Update with new metrics, keeping other settings
                current_settings["last_sync_metrics"] = metrics
                source.settings = current_settings

            await db.commit()
            logger.info(f"Synced source {source_id}: {len(normalized_docs)} docs, {new_count} new")

        except Exception as e:
            logger.error(f"Sync failed for source {source_id}: {e}")
            source.sync_status = "error"
            source.error_message = str(e)
            source.status = "failed"
            await db.commit()
            raise

    # ── Website Scraping ──

    @staticmethod
    async def scrape_document(db: AsyncSession, document_id: uuid.UUID, url: str, folder_id: uuid.UUID | None = None):
        """
        Background job to scrape a website URL and update a document.
        Moves status: scraping → pending → (IngestionService handles the rest)
        """
        doc = await db.get(KnowledgeDocument, document_id)
        if not doc:
            logger.error(f"Document {document_id} not found for scraping")
            return
            
        # GOD_MODE v4: Load source immediately to ensure naming lock
        source = await db.get(KnowledgeSource, doc.source_id)
        if not source:
            logger.error(f"Source {doc.source_id} not found for document {document_id}")
            return

        try:
            logger.info(f"╔═══════════════════════════════════════════════╗")
            logger.info(f"║ 💎 GOD_MODE v4: SCRAPER NAMING LOCK          ║")
            logger.info(f"║ SOURCE_NAME: {source.name:<32} ║")
            logger.info(f"║ DOC_ID: {str(document_id):<37} ║")
            logger.info(f"╚═══════════════════════════════════════════════╝")
            
            connector = WebsiteConnector()
            # GOD_MODE v6: Pass full config (depth, patterns, etc.) to the connector
            connected = await connector.connect(source.config or {"url": url})
            if not connected:
                raise ValueError(f"Failed to connect to website: {url}")

            normalized_docs = await connector.fetch_documents()
            if not normalized_docs:
                raise ValueError("No content extracted from URL")

            logger.info(f"🕸️ SCRAPER DISCOVERED {len(normalized_docs)} DOCUMENTS")

            # Update the first document (the one that triggered this job)
            main_norm = normalized_docs[0]
            doc.title = main_norm.title
            doc.content = main_norm.content
            doc.external_id = main_norm.external_id
            doc.doc_metadata = main_norm.doc_metadata
            doc.status = "skipped" if main_norm.status == "skipped" else "pending"
            await db.commit()

            # Assign TO FOLDER if provided (and not already assigned)
            if folder_id:
                try:
                    from app.models.knowledge import document_folders
                    await db.execute(
                        document_folders.insert().values(document_id=doc.id, folder_id=folder_id)
                    )
                    await db.commit()
                    logger.info(f"✓ Assigned main doc {doc.id} to folder {folder_id}")
                except Exception as e:
                    logger.warning(f"Failed to assign main doc to folder: {e}")
            
            # Start ingestion for the first document (only if not skipped)
            if doc.status == "pending":
                await IngestionService.process_document(db, doc.id)
            
            # Create and process any additional documents found during crawl
            for i, extra_norm in enumerate(normalized_docs[1:]):
                logger.info(f"➤ Creating extra document [{i+2}/{len(normalized_docs)}]: {extra_norm.title}")
                
                # Check for skipped status (duplicates)
                status = "skipped" if extra_norm.status == "skipped" else "pending"
                
                new_doc = KnowledgeDocument(
                    source_id=source.id,
                    workspace_id=source.workspace_id,
                    user_id=source.user_id,
                    external_id=extra_norm.external_id,
                    title=extra_norm.title,
                    content=extra_norm.content,
                    type="website",
                    status=status,
                    doc_metadata=extra_norm.doc_metadata
                )
                db.add(new_doc)
                await db.commit()
                await db.refresh(new_doc)

                # Assign extra doc to folder
                if folder_id:
                    try:
                        from app.models.knowledge import document_folders
                        await db.execute(
                            document_folders.insert().values(document_id=new_doc.id, folder_id=folder_id)
                        )
                        await db.commit()
                    except Exception as e:
                        logger.warning(f"Failed to assign extra doc to folder: {e}")
                
                # Process the new document immediately (only if not skipped)
                if status == "pending":
                    await IngestionService.process_document(db, new_doc.id)
                else:
                    logger.info(f"→ Document {new_doc.id} ({extra_norm.title}) skipped from ingestion (Reason: {extra_norm.doc_metadata.get('skip_reason', 'unknown')})")

            logger.info(f"✓ ALL {len(normalized_docs)} DOCUMENTS FROM {url} HAVE BEEN PROCESSED")
            
            # GOD_MODE: source status is managed by IngestionService check
            # but we can refresh the count here
            source = await db.get(KnowledgeSource, doc.source_id)
            if source:
                source.document_count = await db.scalar(
                    select(func.count(KnowledgeDocument.id)).where(KnowledgeDocument.source_id == source.id)
                )
                await db.commit()
            
        except Exception as e:
            logger.error(f"Scrape failed for document {document_id}: {e}", exc_info=True)
            doc.status = "failed"
            source = await db.get(KnowledgeSource, doc.source_id)
            if source:
                source.sync_status = "error"
                source.status = "failed"
            await db.commit()
            raise
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


