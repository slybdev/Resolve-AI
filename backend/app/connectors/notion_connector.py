"""
Notion connector — fetches pages from a Notion workspace via OAuth.

Wraps the existing NotionClient and returns NormalizedDocument instances.
"""

import logging
from typing import List

from app.connectors.base import BaseConnector, NormalizedDocument
from app.integrations.notion.client import NotionClient

logger = logging.getLogger(__name__)


class NotionConnector(BaseConnector):
    """Connector for Notion workspaces using OAuth."""

    def __init__(self):
        self._client: NotionClient | None = None
        self._access_token: str | None = None

    async def connect(self, credentials: dict) -> bool:
        """
        credentials must contain:
          - access_token: Notion OAuth access token
        """
        self._access_token = credentials.get("access_token")
        if not self._access_token:
            logger.error("Missing access_token for Notion connector")
            return False

        self._client = NotionClient(self._access_token)
        return True

    async def test_connection(self) -> bool:
        """Verify we can reach the Notion API."""
        if not self._client:
            return False
        try:
            pages = await self._client.list_pages_and_databases()
            return True
        except Exception as e:
            logger.error(f"Notion connection test failed: {e}")
            return False

    async def fetch_documents(self) -> List[NormalizedDocument]:
        """Fetch all pages from the connected Notion workspace."""
        if not self._client:
            raise ValueError("Connector not connected. Call connect() first.")

        pages = await self._client.list_pages_and_databases()
        documents = []

        for page in pages:
            external_id = page["id"]

            # Extract title from Notion's nested properties
            title = "Untitled"
            props = page.get("properties", {})
            for prop_value in props.values():
                if prop_value.get("type") == "title":
                    title_parts = prop_value.get("title", [])
                    if title_parts:
                        title = "".join(t.get("plain_text", "") for t in title_parts)
                    break

            # Fetch full page content
            try:
                content = await self._client.get_page_content(external_id)
            except Exception as e:
                logger.warning(f"Failed to fetch content for page {external_id}: {e}")
                content = ""

            if not content.strip():
                continue

            documents.append(
                NormalizedDocument(
                    external_id=external_id,
                    title=title or "Untitled",
                    content=content,
                    doc_type="notion_page",
                    metadata={
                        "notion_page_id": external_id,
                        "url": page.get("url", ""),
                    }
                )
            )

        return documents
