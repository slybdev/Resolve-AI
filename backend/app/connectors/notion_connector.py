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
        self._last_sync_at: datetime | None = None
        self._selected_pages: List[str] = []

    async def connect(self, credentials: dict) -> bool:
        """
        credentials must contain:
          - access_token: Notion OAuth access token
          - last_sync_at: Optional last successful sync time
          - settings: Optional dict with selected_pages
        """
        self._access_token = credentials.get("access_token")
        if not self._access_token:
            logger.error("Missing access_token for Notion connector")
            return False

        self._last_sync_at = credentials.get("last_sync_at")
        settings = credentials.get("settings", {})
        self._selected_pages = settings.get("selected_pages", [])
        
        self._client = NotionClient(self._access_token)
        return True

    async def test_connection(self) -> bool:
        """Verify we can reach the Notion API."""
        if not self._client:
            return False
        try:
            await self._client.list_pages_and_databases()
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

        from datetime import datetime
        
        for page in pages:
            external_id = page["id"]
            
            # Filter by selected pages if provided
            if self._selected_pages and external_id not in self._selected_pages:
                continue

            # Check last edited time for incremental sync
            last_edited_str = page.get("last_edited_time")
            last_edited_dt = None
            if last_edited_str:
                # Notion returns ISO 8601 like "2022-03-01T19:05:00.000Z"
                try:
                    last_edited_dt = datetime.fromisoformat(last_edited_str.replace("Z", "+00:00"))
                except ValueError:
                    logger.warning(f"Could not parse last_edited_time: {last_edited_str}")

            # Extract title from Notion's nested properties
            title = "Untitled"
            props = page.get("properties", {})
            for prop_value in props.values():
                if prop_value.get("type") == "title":
                    title_parts = prop_value.get("title", [])
                    if title_parts:
                        title = "".join(t.get("plain_text", "") for t in title_parts)
                    break

            # If page hasn't changed since last sync, we can return a skeleton doc
            # to signal it still exists but skip the heavy content fetch.
            # KnowledgeService.sync_source will see it already exists and skip re-ingestion.
            is_stale = True
            if self._last_sync_at and last_edited_dt:
                if last_edited_dt <= self._last_sync_at:
                    is_stale = False
            
            content = ""
            if is_stale:
                logger.info(f"🔄 Syncing changed Notion page: {title} ({external_id})")
                try:
                    content = await self._client.get_page_content(external_id)
                except Exception as e:
                    logger.warning(f"Failed to fetch content for page {external_id}: {e}")
            else:
                logger.debug(f"⏭️ Skipping unchanged Notion page: {title}")

            documents.append(
                NormalizedDocument(
                    external_id=external_id,
                    title=title or "Untitled",
                    content=content,
                    doc_type="notion_page",
                    doc_metadata={
                        "notion_page_id": external_id,
                        "url": page.get("url", ""),
                        "last_edited_time": last_edited_str,
                        "is_stale": is_stale
                    }
                )
            )

        return documents
