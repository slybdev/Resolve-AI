import asyncio
import uuid
from sqlalchemy import select, func
from app.db.session import async_session_factory
from app.models.knowledge import KnowledgeDocument, KnowledgeChunk, KnowledgeEmbedding

async def check_stats():
    async with async_session_factory() as db:
        async with db.begin():
            # Get latest document
            doc_stmt = select(KnowledgeDocument).order_by(KnowledgeDocument.created_at.desc()).limit(1)
            result = await db.execute(doc_stmt)
            doc = result.scalar_one_or_none()
            
            if not doc:
                print("No documents found in database.")
                return

            print(f"Latest Document: {doc.title} (ID: {doc.id}, Status: {doc.status})")
            
            # Count chunks for this doc
            chunk_stmt = select(func.count(KnowledgeChunk.id)).where(KnowledgeChunk.document_id == doc.id)
            result = await db.execute(chunk_stmt)
            chunk_count = result.scalar_one()
            
            # Count embeddings for these chunks
            embed_stmt = select(func.count(KnowledgeEmbedding.id)).join(KnowledgeChunk).where(KnowledgeChunk.document_id == doc.id)
            result = await db.execute(embed_stmt)
            embed_count = result.scalar_one()
            
            print(f"Chunks Count: {chunk_count}")
            print(f"Embeddings Count: {embed_count}")
            
            if chunk_count > 0 and embed_count == chunk_count:
                print("SUCCESS: Chunks and embeddings match!")
            elif chunk_count > 0:
                print(f"WARNING: Mismatch! Chunks: {chunk_count}, Embeddings: {embed_count}")
            else:
                print("FAILED: No chunks generated.")

if __name__ == "__main__":
    asyncio.run(check_stats())
