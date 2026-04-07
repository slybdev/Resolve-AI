from typing import List, Optional
import logging
import hashlib
import json
import redis
from google import genai
from google.genai import types
from tenacity import retry, stop_after_attempt, wait_exponential

from app.embeddings.base import EmbeddingProvider
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class GeminiEmbeddingProvider(EmbeddingProvider):
    """Google Gemini embedding implementation with caching and retry logic."""
    
    def __init__(self, model_name: str = "gemini-embedding-001", enable_cache: bool = True):
        self.model_name = model_name
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.enable_cache = enable_cache
        
        # Redis client for embedding cache (30-day TTL)
        self.redis_client: Optional[redis.Redis] = None
        if enable_cache:
            try:
                self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=False)
                self.redis_client.ping()
                logger.info("Embedding cache initialized (Redis)")
            except Exception as e:
                logger.warning(f"Redis cache unavailable, disabling embedding cache: {e}")
                self.redis_client = None

    @staticmethod
    def _content_hash(text: str) -> str:
        """Generate deterministic hash of content for caching."""
        return hashlib.sha256(text.encode()).hexdigest()

    def _get_cache_key(self, text: str, task_type: str) -> str:
        """Generate cache key: embedding:{hash}:{model}:{task_type}"""
        content_hash = self._content_hash(text)
        return f"embedding:{content_hash}:{self.model_name}:{task_type}"

    async def _get_cached_embedding(self, text: str, task_type: str) -> Optional[List[float]]:
        """Retrieve embedding from cache if available."""
        if not self.redis_client:
            return None
        
        try:
            key = self._get_cache_key(text, task_type)
            cached = self.redis_client.get(key)
            if cached:
                logger.debug(f"Cache hit for embedding (size: {len(text)} chars)")
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Cache retrieval error: {e}")
        
        return None

    async def _set_cache_embedding(self, text: str, task_type: str, vector: List[float]) -> None:
        """Store embedding in cache (30-day TTL)."""
        if not self.redis_client:
            return
        
        try:
            key = self._get_cache_key(text, task_type)
            self.redis_client.setex(
                key,
                2592000,  # 30 days in seconds
                json.dumps(vector)
            )
        except Exception as e:
            logger.warning(f"Cache storage error: {e}")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True
    )
    async def _embed_with_retry(self, contents, task_type: str) -> List[List[float]]:
        """Call Gemini embedding API with exponential backoff retry."""
        try:
            response = await self.client.aio.models.embed_content(
                model=self.model_name,
                contents=contents,
                config=types.EmbedContentConfig(
                    output_dimensionality=1536,
                    task_type=task_type
                )
            )
            return [e.values for e in response.embeddings]
        except Exception as e:
            logger.error(f"Gemini Embedding API error (attempt): {e}")
            raise

    async def embed_text(self, text: str) -> List[float]:
        """Generate a single embedding with caching."""
        # Check cache first
        cached = await self._get_cached_embedding(text, "RETRIEVAL_QUERY")
        if cached:
            return cached
        
        try:
            # Call API with retry
            vectors = await self._embed_with_retry([text], "RETRIEVAL_QUERY")
            vector = vectors[0]
            
            # Store in cache
            await self._set_cache_embedding(text, "RETRIEVAL_QUERY", vector)
            
            return vector
        except Exception as e:
            logger.error(f"Gemini Embedding failed for single text after retries: {e}")
            raise

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate batch embeddings with caching and optimal batching."""
        if not texts:
            return []
        
        # Fetch from cache where available
        cached_vectors = {}
        uncached_texts = {}
        
        for i, text in enumerate(texts):
            cached = await self._get_cached_embedding(text, "RETRIEVAL_DOCUMENT")
            if cached:
                cached_vectors[i] = cached
            else:
                uncached_texts[i] = text
        
        logger.info(f"Batch embedding: {len(cached_vectors)} cached, {len(uncached_texts)} new")
        
        # Initialize result array
        result = [None] * len(texts)
        
        # Fill in cached results
        for idx, vector in cached_vectors.items():
            result[idx] = vector
        
        # Process uncached texts in sub-batches (Gemini has limits)
        if uncached_texts:
            BATCH_SIZE = 100  # Gemini embedding batch limit
            uncached_list = list(uncached_texts.items())
            
            for batch_start in range(0, len(uncached_list), BATCH_SIZE):
                batch_end = min(batch_start + BATCH_SIZE, len(uncached_list))
                batch_items = uncached_list[batch_start:batch_end]
                batch_texts = [text for _, text in batch_items]
                batch_indices = [idx for idx, _ in batch_items]
                
                try:
                    # Call API with retry
                    vectors = await self._embed_with_retry(batch_texts, "RETRIEVAL_DOCUMENT")
                    
                    # Store results and cache
                    for idx, vector, text in zip(batch_indices, vectors, batch_texts):
                        result[idx] = vector
                        await self._set_cache_embedding(text, "RETRIEVAL_DOCUMENT", vector)
                    
                    logger.debug(f"Batch {batch_start//BATCH_SIZE + 1}: Embedded {len(batch_texts)} texts")
                except Exception as e:
                    logger.error(f"Batch embedding failed for indices {batch_indices}: {e}")
                    raise
        
        # Verify all results are filled
        if any(v is None for v in result):
            raise RuntimeError("Embedding batch processing incomplete: some vectors are None")
        
        return result
