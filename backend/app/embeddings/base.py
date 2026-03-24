from abc import ABC, abstractmethod
from typing import List

class EmbeddingProvider(ABC):
    """Base interface for embedding models."""
    
    @abstractmethod
    async def embed_text(self, text: str) -> List[float]:
        """Generate vector embedding for a single text string."""
        pass

    @abstractmethod
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate vector embeddings for a batch of text strings."""
        pass
