from typing import List
import logging
from google import genai
from google.genai import types
from app.embeddings.base import EmbeddingProvider
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class GeminiEmbeddingProvider(EmbeddingProvider):
    """Google Gemini embedding implementation."""
    
    def __init__(self, model_name: str = "gemini-embedding-001"):
        self.model_name = model_name
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)

    async def embed_text(self, text: str) -> List[float]:
        """Generate a single embedding."""
        try:
            # Using the async client (aio) to avoid blocking the event loop
            response = await self.client.aio.models.embed_content(
                model=self.model_name,
                contents=text,
                config=types.EmbedContentConfig(
                    output_dimensionality=1536,
                    task_type="RETRIEVAL_QUERY"
                )
            )
            return response.embeddings[0].values
        except Exception as e:
            logger.error(f"Gemini Embedding failed: {e}")
            raise

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate batch embeddings."""
        try:
            # Using the async client (aio) to avoid blocking the event loop
            response = await self.client.aio.models.embed_content(
                model=self.model_name,
                contents=texts,
                config=types.EmbedContentConfig(
                    output_dimensionality=1536,
                    task_type="RETRIEVAL_DOCUMENT"
                )
            )
            return [e.values for e in response.embeddings]
        except Exception as e:
            logger.error(f"Gemini Batch Embedding failed: {e}")
            raise
