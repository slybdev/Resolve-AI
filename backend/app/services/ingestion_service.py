"""
Ingestion service — background processing pipeline.

Flow:
  1. Accept a document_id
  2. Set status → "processing"
  3. Chunk text using token-based splitting (with fallback to character-based)
  4. Generate embeddings via GeminiEmbeddingProvider (with caching + retry)
  5. Store embeddings in pgvector
  6. Set status → "ready" (or "failed" on error)

This MUST run as a background task, never blocking API routes.
"""

import logging
from typing import List

from sqlalchemy import delete, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.knowledge import KnowledgeDocument, KnowledgeChunk, KnowledgeEmbedding, KnowledgeSource
from app.embeddings.gemini import GeminiEmbeddingProvider

logger = logging.getLogger(__name__)

# Try to import tiktoken for token-based chunking
try:
    import tiktoken
    TOKENIZER = None
    try:
        # This may fail if there's no internet to download the encoding file
        TOKENIZER = tiktoken.get_encoding("cl100k_base")
        TIKTOKEN_AVAILABLE = True
        logger.info("tiktoken available - using token-based chunking")
    except Exception as e:
        TIKTOKEN_AVAILABLE = False
        logger.warning(f"tiktoken encoding could not be loaded (likely no internet): {e}. Falling back to character-based chunking.")
except ImportError:
    TIKTOKEN_AVAILABLE = False
    logger.warning("tiktoken not installed - falling back to character-based chunking")


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
            logger.info(f"Document {document_id}: Commit successful after chunking status")

            # 2. Clear existing chunks (for re-processing)
            logger.info(f"Document {document_id}: Starting chunk deletion")
            await db.execute(
                delete(KnowledgeChunk).where(KnowledgeChunk.document_id == doc.id)
            )
            await db.flush()
            logger.info(f"Document {document_id}: Chunk deletion complete")

            # 3. Chunk the text (token-based if available, else character-based)
            logger.info(f"Document {document_id}: Starting text chunking (TIKTOKEN_AVAILABLE={TIKTOKEN_AVAILABLE})")
            if TIKTOKEN_AVAILABLE:
                chunks = IngestionService.chunk_text_tokens(doc.content)
                logger.info(f"Document {document_id}: {len(chunks)} chunks created (token-based)")
            else:
                chunks = IngestionService.chunk_text(doc.content)
                logger.info(f"Document {document_id}: {len(chunks)} chunks created (character-based fallback)")
            
            if not chunks:
                doc.status = "failed"
                await db.commit()
                logger.warning(f"Document {document_id} produced no chunks")
                return
            
            # Update status to vectorizing
            doc.status = "vectorizing"
            logger.info(f"Document {document_id}: Status set to 'vectorizing'")
            await db.commit()

            # 4. Generate embeddings in batch and store
            logger.info(f"Document {document_id}: Starting embeddings (batch of {len(chunks)} chunks)")
            provider = GeminiEmbeddingProvider(enable_cache=True)
            
            try:
                # Batch embed all chunks at once (with intelligent sub-batching)
                vectors = await provider.embed_batch(chunks)
                logger.info(f"Document {document_id}: Got {len(vectors)} vectors back")
                
                # Process in batches to avoid memory accumulation
                BATCH_INSERT_SIZE = 500
                for batch_idx in range(0, len(chunks), BATCH_INSERT_SIZE):
                    batch_end = min(batch_idx + BATCH_INSERT_SIZE, len(chunks))
                    
                    for i in range(batch_idx, batch_end):
                        chunk_text = chunks[i]
                        vector = vectors[i]
                        
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
                    
                    # Commit this batch to free memory
                    await db.commit()
                    logger.info(f"Document {document_id}: Committed {batch_end - batch_idx} chunks to database")
                
                # Clear lists to free memory
                chunks.clear()
                vectors.clear()
            except Exception as e:
                logger.error(f"Batch embedding failed for doc {document_id}: {e}", exc_info=True)
                raise

            # 5. Set status → ready
            doc.status = "ready"
            
            # GOD_MODE: Check if all documents for this source are now 'ready' or 'failed'
            # to avoid premature 'idle' jumps.
            if source:
                remaining_task_query = select(func.count(KnowledgeDocument.id)).where(
                    KnowledgeDocument.source_id == source.id,
                    KnowledgeDocument.status.in_(["pending", "processing", "scraping", "chunking", "vectorizing"])
                )
                result = await db.execute(remaining_task_query)
                remaining_tasks = result.scalar() or 0
                
                if remaining_tasks == 0:
                    source.sync_status = "idle"
                    source.status = "healthy"
                    logger.info(f"✓ Source {source.id}: All documents ready. Status set to idle.")
                else:
                    logger.info(f"Source {source.id}: {remaining_tasks} documents still processing. Keeping status as 'syncing'.")

            await db.commit()
            logger.info(f"Document {document_id}: ingestion complete (ready)")

        except Exception as e:
            logger.error(f"Ingestion failed for document {document_id}: {e}", exc_info=True)
            try:
                doc.status = "failed"
                if source:
                    source.sync_status = "error"
                    source.status = "failed"
                await db.commit()
            except Exception as e2:
                logger.error(f"Failed to set error status: {e2}", exc_info=True)

    @staticmethod
    def chunk_text(text: str, chunk_size: int = 800, overlap: int = 200) -> List[str]:
        """
        DEPRECATED: Character-based splitting.
        Kept for backward compatibility.
        Use chunk_text_tokens() instead.
        """
        if not text or not text.strip():
            return []

        chunks = []
        start = 0
        text_len = len(text)
        iteration_limit = text_len * 2  # Safety limit to prevent infinite loops
        iteration_count = 0

        while start < text_len:
            iteration_count += 1
            if iteration_count > iteration_limit:
                logger.error("Character chunking iteration limit exceeded, stopping to prevent infinite loop")
                break
                
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

            # Move start forward by (chunk_size - overlap)
            new_start = end - overlap
            
            # Safety: ensure we're always advancing
            if new_start <= start:
                # If overlap is too large, jump ahead by at least chunk_size
                new_start = start + max(chunk_size // 2, 1)
                logger.debug("Character chunking: overlap too large, forcing advance from %d to %d", start, new_start)
            
            start = new_start
            if start >= text_len or end == text_len:
                break

        return chunks

    @staticmethod
    def chunk_text_tokens(
        text: str, 
        chunk_tokens: int = 512, 
        overlap_tokens: int = 50,
        max_chunk_chars: int = 2000,
        max_text_length: int = 200_000
    ) -> List[str]:
        """
        Split text into chunks based on TOKEN count (not characters).
        ONLY available if tiktoken is installed.

        Falls back to character-based chunking for extremely large documents or
        if tiktoken fails on the input text.
        """
        if not TIKTOKEN_AVAILABLE:
            logger.warning("tiktoken not available, using character-based fallback")
            return IngestionService.chunk_text(text)

        if not text or not text.strip():
            return []

        if len(text) > max_text_length:
            logger.warning(
                "Text too large for token-based chunking (%s chars) - falling back to character-based splitting",
                len(text),
            )
            return IngestionService.chunk_text(text)

        try:
            tokens = TOKENIZER.encode(text)
        except Exception as e:
            logger.warning(
                "Tokenization failed with exception, falling back to character-based chunking: %s",
                e,
            )
            return IngestionService.chunk_text(text)

        if len(tokens) == 0:
            return []

        chunks = []
        start_idx = 0

        while start_idx < len(tokens):
            # Calculate end index
            end_idx = min(start_idx + chunk_tokens, len(tokens))
            
            # Safety: ensure we're actually advancing
            if end_idx <= start_idx:
                logger.warning("Chunk boundary calculation failed, skipping remaining text")
                break

            # Decode this chunk
            chunk_tokens_slice = tokens[start_idx:end_idx]
            chunk_text = TOKENIZER.decode(chunk_tokens_slice).strip()
            
            # Safety check: enforce max chunk size to prevent memory issues
            if len(chunk_text) > max_chunk_chars:
                # Truncate at word boundary if possible
                truncated = chunk_text[:max_chunk_chars]
                if " " in truncated:
                    truncated = truncated.rsplit(" ", 1)[0]
                chunk_text = truncated
                logger.warning("Chunk exceeded max chars (%d), truncated to %d", len(chunk_text), max_chunk_chars)
            
            if chunk_text:
                chunks.append(chunk_text)
            
            # Move start by chunk_tokens - overlap (sliding window)
            # CRITICAL: Always advance by at least 1 token to prevent infinite loop
            next_start_idx = end_idx - overlap_tokens
            if next_start_idx <= start_idx:
                # If overlap is too large, force minimum advancement
                next_start_idx = start_idx + max(1, chunk_tokens // 4)
                logger.debug("Overlap caused backtrack, forcing forward: %d -> %d", start_idx, next_start_idx)
            
            start_idx = next_start_idx
            if start_idx >= len(tokens):
                break

        logger.debug(f"Chunked text into {len(chunks)} chunks ({chunk_tokens} tokens/chunk, {overlap_tokens} overlap)")
        return chunks
