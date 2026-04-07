"""
Base connector interface.

All connectors MUST implement this interface to normalize data from
external sources into a unified document format.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional


@dataclass
class NormalizedDocument:
    """Unified document format returned by all connectors."""
    external_id: str
    title: str
    content: str
    doc_type: str  # notion_page, pdf, txt, docx, website, etc.
    status: Optional[str] = None
    doc_metadata: Dict[str, Any] = field(default_factory=dict)


class BaseConnector(ABC):
    """Abstract base class for all knowledge source connectors."""

    @abstractmethod
    async def connect(self, credentials: dict) -> bool:
        """
        Validate and establish connection to the external source.
        Returns True if connection is successful.
        """
        ...

    @abstractmethod
    async def fetch_documents(self) -> List[NormalizedDocument]:
        """
        Fetch all documents from the source.
        Returns a list of NormalizedDocument instances.
        Each call should return the full current state (for sync/dedup).
        """
        ...

    @abstractmethod
    async def test_connection(self) -> bool:
        """Check if the connection is still valid."""
        ...
