"""
Ingestion service — background processing pipeline.

Flow:
  1. Accept a document_id
  2. Set status → "processing"
  3. Chunk text (500–1000 chars, with overlap)
  4. Generate embeddings via GeminiEmbeddingProvider
  5. Store embeddings in pgvector
  6. Set status → "ready" (or "failed" on error)

This MUST run as a background task, never blocking API routes.
"""

import logging
from typing import List

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.knowledge import KnowledgeDocument, KnowledgeChunk, KnowledgeEmbedding, KnowledgeSource
from app.embeddings.gemini import GeminiEmbeddingProvider

logger = logging.getLogger(__name__)


class IngestionService:
    """Handles document chunking, embedding, and status lifecycle."""

    @staticmethod
    async def process_document(db: AsyncSession, document_id):
        """
        Main entry point. Processes a single document through the full pipeline.
        Call this via asyncio.create_task() from API routes.
        """
        doc = await db.get(KnowledgeDocument, document_id)
        if not doc:
            logger.error(f"Document {document_id} not found")
            return

        try:
            logger.info(f"IngestionService: Starting ingestion for document {document_id}")
            # Get source to update overall sync status
            source = None
            if doc.source_id:
                source = await db.get(KnowledgeSource, doc.source_id)
            
            # 1. Set status → chunking
            doc.status = "chunking"
            logger.info(f"Document {document_id}: Status set to 'chunking'")
            if source:
                source.sync_status = "syncing"
            await db.commit()

            # 2. Clear existing chunks (for re-processing)
            await db.execute(
                delete(KnowledgeChunk).where(KnowledgeChunk.document_id == doc.id)
            )
            await db.flush()

            # 3. Chunk the text
            chunks = IngestionService.chunk_text(doc.content)
            if not chunks:
                doc.status = "failed"
                await db.commit()
                logger.warning(f"Document {document_id} produced no chunks")
                return

            logger.info(f"Document {document_id}: {len(chunks)} chunks created")
            
            # Update status to vectorizing
            doc.status = "vectorizing"
            logger.info(f"Document {document_id}: Status set to 'vectorizing'")
            await db.commit()

            # 4. Generate embeddings in batch and store
            provider = GeminiEmbeddingProvider()
            
            try:
                # Batch embed all chunks at once
                vectors = await provider.embed_batch(chunks)
                
                for i, (chunk_text, vector) in enumerate(zip(chunks, vectors)):
                    # Create chunk
                    chunk = KnowledgeChunk(
                        document_id=doc.id,
                        content=chunk_text,
                        chunk_index=i,
                    )
                    db.add(chunk)
                    await db.flush()

                    # Store embedding
                    embedding = KnowledgeEmbedding(
                        chunk_id=chunk.id,
                        vector=vector,
                        model_name="gemini-embedding-001",
                    )
                    db.add(embedding)
            except Exception as e:
                logger.error(f"Batch embedding failed for doc {document_id}: {e}")
                raise

            # 5. Set status → ready
            doc.status = "ready"
            if source:
                # Check if other documents are still processing for this source
                # Simplification: set to idle if this one is done
                source.sync_status = "idle"
            await db.commit()
            logger.info(f"Document {document_id}: ingestion complete (ready)")

        except Exception as e:
            logger.error(f"Ingestion failed for document {document_id}: {e}")
            try:
                doc.status = "failed"
                if source:
                    source.sync_status = "error"
                await db.commit()
            except Exception:
                pass

    @staticmethod
    def chunk_text(text: str, chunk_size: int = 800, overlap: int = 200) -> List[str]:
        """
        Split text into chunks with overlap.
        Uses character-based splitting. Production upgrade: use tiktoken for token-based.
        """
        if not text or not text.strip():
            return []

        chunks = []
        start = 0
        text_len = len(text)

        while start < text_len:
            end = min(start + chunk_size, text_len)

            # Try to break at sentence boundary
            if end < text_len:
                # Look backward for a period, newline, or other sentence boundary
                for boundary_char in ["\n\n", "\n", ". ", "! ", "? "]:
                    boundary = text.rfind(boundary_char, start + chunk_size // 2, end)
                    if boundary != -1:
                        end = boundary + len(boundary_char)
                        break

            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)

            start = end - overlap
            if start >= text_len or end == text_len:
                break

        return chunks
