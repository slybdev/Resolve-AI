import logging
from typing import List, Dict, Any, Optional
import uuid
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from google import genai
from google.genai import types

from app.models.knowledge import KnowledgeDocument, KnowledgeChunk, KnowledgeEmbedding
from app.models.workspace import Workspace
from app.embeddings.gemini import GeminiEmbeddingProvider
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class AIService:
    """
    RAG Service for AI Querying.
    Enforces strict user_id and workspace_id isolation.
    """

    @staticmethod
    async def query(
        db: AsyncSession,
        user_id: uuid.UUID,
        workspace_id: uuid.UUID,
        query_text: str,
        folder_id: Optional[uuid.UUID] = None,
        limit: int = 5
    ) -> Dict[str, Any]:
        """
        Full RAG pipeline: Embed -> Search -> Generate.
        """
        # 1. Generate query embedding
        provider = GeminiEmbeddingProvider()
        query_vector = await provider.embed_text(query_text)

        # 2. Vector search (pgvector similarity search)
        # Using cosine distance <=> for ordering
        # JOIN Embedding -> Chunk -> Document
        # STRICT FILTER BY user_id and workspace_id
        
        # We need a raw or semi-raw query for pgvector similarity operator if ORM doesn't support it directly easily.
        # But pgvector-python usually adds support. 
        # Here we use a clean SELECT with JOINs and strict filters.
        
        stmt = (
            select(
                KnowledgeChunk.content,
                KnowledgeDocument.id.label("document_id"),
                KnowledgeDocument.title.label("document_title"),
                (text("1.0") - KnowledgeEmbedding.vector.cosine_distance(query_vector)).label("score")
            )
            .select_from(KnowledgeEmbedding)
            .join(KnowledgeChunk, KnowledgeEmbedding.chunk_id == KnowledgeChunk.id)
            .join(KnowledgeDocument, KnowledgeChunk.document_id == KnowledgeDocument.id)
            .where(KnowledgeDocument.user_id == user_id)
            .where(KnowledgeDocument.workspace_id == workspace_id)
        )

        if folder_id:
            # Note: Folders are many-to-many. For simplification we check if doc is in this folder.
            from app.models.knowledge import document_folders
            stmt = stmt.join(document_folders).where(document_folders.c.folder_id == folder_id)

        # Apply vector search ordering
        # Using the pgvector similarity operator <=> (cosine distance)
        stmt = stmt.order_by(KnowledgeEmbedding.vector.cosine_distance(query_vector)).limit(limit)

        result = await db.execute(stmt)
        chunks = result.all()

        if not chunks:
            return {
                "answer": "I couldn't find any relevant information in your knowledge base to answer that question.",
                "sources": [],
                "confidence_score": 0.0
            }

        # 3. Build context
        context_text = "\n\n".join([f"--- SOURCE: {c.document_title} ---\n{c.content}" for c in chunks])
        sources = [
            {
                "document_id": str(c.document_id), 
                "title": c.document_title, 
                "snippet": c.content[:200] + "...",
                "score": float(c.score)
            }
            for c in chunks
        ]
        
        # Calculate overall confidence score (average of top chunks)
        avg_score = sum(c.score for c in chunks) / len(chunks) if chunks else 0
        
        # De-duplicate sources
        unique_sources = []
        seen_docs = set()
        for s in sources:
            if s["document_id"] not in seen_docs:
                unique_sources.append(s)
                seen_docs.add(s["document_id"])

        # 4. Generate answer using Gemini LLM
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        # Fetch Workspace settings for custom instructions
        workspace = await db.get(Workspace, workspace_id)
        custom_instructions = workspace.ai_system_prompt if workspace and workspace.ai_system_prompt else "You are a helpful AI assistant for XentralDesk."
        ai_tone = workspace.ai_tone if workspace and workspace.ai_tone else "Professional and concise"

        prompt = f"""
        {custom_instructions}
        
        Answer the user's question based ONLY on the provided context from their knowledge base.
        Tone: {ai_tone}
        
        CONTEXT:
        {context_text}
        
        QUESTION: 
        {query_text}
        
        INSTRUCTIONS:
        1. Use ONLY the provided context. 
        2. If the answer is not in the context, politely say you don't know based on the available knowledge.
        3. Keep your response concise and professional.
        4. Do not mention external knowledge or hallucinations.
        """

        try:
            # Using user-suggested model name
            response = await client.aio.models.generate_content(
                model="gemini-1.5-flash-latest",
                contents=prompt
            )
            
            # Use safety-safe text extraction
            if response.candidates and response.candidates[0].content.parts:
                answer = response.text
            else:
                 answer = "I'm sorry, I couldn't generate a safe response based on that context."
                 logger.warning(f"Gemini generated empty or blocked response: {response}")
                 
        except Exception as e:
            logger.error(f"Gemini generation failed with primary model: {e}", exc_info=True)
            # Try a prioritized fallback list based on probe results and user suggestions
            fallback_models = [
                "gemini-1.5-pro-latest",
                "gemini-flash-latest",
                "gemma-3-4b-it"
            ]
            
            answer = None
            for fb_model in fallback_models:
                try:
                    logger.info(f"Retrying with fallback model {fb_model}...")
                    response = await client.aio.models.generate_content(
                        model=fb_model,
                        contents=prompt
                    )
                    if response.candidates and response.candidates[0].content.parts:
                        answer = response.text
                        break
                except Exception as e_fb:
                    logger.error(f"Fallback {fb_model} failed: {e_fb}")
            
            if not answer:
                 # Option B - Graceful fallback (Show sources even if LLM fails)
                 answer = "I'm sorry, the AI generator is currently reaching its quota limit or is unavailable. However, here are the most relevant documents found for your query:"

        return {
            "answer": answer,
            "sources": unique_sources,
            "confidence_score": avg_score
        }
