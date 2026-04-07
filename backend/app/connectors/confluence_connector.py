"""
Confluence connector — fetches pages from a Confluence Cloud workspace.

Uses API token auth (email + token). Implements incremental sync
via Confluence's page version numbers.
"""

import logging
from datetime import datetime
from typing import List, Optional

from app.connectors.base import BaseConnector, NormalizedDocument
from app.integrations.confluence.client import ConfluenceClient, ConfluenceAuthError, ConfluenceRateLimitError
from app.core.encryption import decrypt_string

logger = logging.getLogger(__name__)

# Max content size before we warn/truncate (500KB of text)
MAX_CONTENT_SIZE = 500_000


class ConfluenceConnector(BaseConnector):
    """Connector for Confluence Cloud workspaces using API token auth."""

    def __init__(self):
        self._client: Optional[ConfluenceClient] = None
        self._last_sync_at: Optional[datetime] = None
        self._selected_spaces: List[str] = []

    async def connect(self, credentials: dict) -> bool:
        """
        credentials must contain:
          - base_url: Confluence instance URL (e.g. https://company.atlassian.net)
          - email: Atlassian account email
          - api_token: API token from Atlassian account settings
          - last_sync_at: Optional last successful sync time
          - settings: Optional dict with selected_spaces
        """
        base_url = credentials.get("base_url")
        email = credentials.get("email")
        api_token = credentials.get("api_token")

        if not all([base_url, email, api_token]):
            logger.error("Missing required Confluence credentials (base_url, email, api_token)")
            return False

        self._last_sync_at = credentials.get("last_sync_at")
        settings = credentials.get("settings", {})
        self._selected_spaces = settings.get("selected_spaces", [])

        # Decrypt token for worker use
        decrypted_token = decrypt_string(api_token)

        self._client = ConfluenceClient(base_url, email, decrypted_token)
        return True

    async def test_connection(self) -> bool:
        """Verify we can reach the Confluence API."""
        if not self._client:
            return False
        return await self._client.test_connection()

    async def fetch_documents(self) -> List[NormalizedDocument]:
        """
        Fetch all pages from selected Confluence spaces.

        Implements incremental sync:
          - Compares page version numbers with stored versions
          - Only fetches full content for new/changed pages
          - Returns skeleton docs for unchanged pages (dedup still works)
        """
        if not self._client:
            raise ValueError("Connector not connected. Call connect() first.")

        # Get spaces — either selected ones or all
        try:
            all_spaces = await self._client.list_spaces()
        except ConfluenceAuthError:
            logger.error("Confluence connection failed: Invalid credentials")
            raise ValueError("Authentication with Confluence failed. Please check your API token.")
        except ConfluenceRateLimitError:
            logger.error("Confluence connection failed: Rate limited")
            raise ValueError("Confluence sync paused: We are being rate limited by Atlassian.")
        
        if self._selected_spaces:
            spaces = [s for s in all_spaces if s.get("key") in self._selected_spaces]
            logger.info(f"Syncing {len(spaces)} selected Confluence spaces")
        else:
            spaces = all_spaces
            logger.info(f"Syncing ALL {len(spaces)} Confluence spaces")

        documents: List[NormalizedDocument] = []
        pages_processed = 0
        pages_skipped = 0
        pages_failed = 0

        for space in spaces:
            space_key = space.get("key", "")
            space_name = space.get("name", space_key)
            logger.info(f"📂 Processing Confluence space: {space_name} ({space_key})")

            try:
                pages = await self._client.list_pages(space_key)
            except Exception as e:
                logger.error(f"Failed to list pages for space {space_key}: {e}")
                pages_failed += 1
                continue

            for page in pages:
                page_id = page.get("id", "")
                title = page.get("title", "Untitled")
                version_number = page.get("version", {}).get("number", 0)
                last_updated = page.get("history", {}).get("lastUpdated", {}).get("when", "")

                # Build the page URL
                page_url = f"{self._client.base_url}/wiki/spaces/{space_key}/pages/{page_id}"

                # Check if page has changed since last sync (incremental)
                is_stale = True
                if self._last_sync_at and last_updated:
                    try:
                        updated_dt = datetime.fromisoformat(last_updated.replace("Z", "+00:00"))
                        if updated_dt <= self._last_sync_at:
                            is_stale = False
                    except (ValueError, TypeError):
                        pass  # Can't parse — treat as stale

                content = ""
                if is_stale:
                    logger.info(f"🔄 Syncing Confluence page: {title} (v{version_number})")
                    try:
                        content = await self._client.get_page_body_as_markdown(page_id)

                        # Enforce content size limit
                        if len(content) > MAX_CONTENT_SIZE:
                            logger.warning(f"Page {title} exceeds {MAX_CONTENT_SIZE} chars, truncating")
                            content = content[:MAX_CONTENT_SIZE] + "\n\n[Content truncated due to size]"

                        pages_processed += 1
                    except Exception as e:
                        logger.error(f"Failed to fetch content for page {page_id} ({title}): {e}")
                        pages_failed += 1
                        continue
                else:
                    logger.debug(f"⏭️ Skipping unchanged Confluence page: {title}")
                    pages_skipped += 1

                documents.append(
                    NormalizedDocument(
                        external_id=page_id,
                        title=title,
                        content=content,
                        doc_type="confluence_page",
                        doc_metadata={
                            "confluence_page_id": page_id,
                            "space_key": space_key,
                            "space_name": space_name,
                            "version_number": version_number,
                            "url": page_url,
                            "last_updated": last_updated,
                            "is_stale": is_stale,
                        }
                    )
                )

        sync_metrics = {
            "pages_processed": pages_processed,
            "pages_skipped": pages_skipped,
            "pages_failed": pages_failed,
            "total_discovered": pages_processed + pages_skipped + pages_failed,
            "last_sync_type": "incremental" if self._last_sync_at else "full"
        }

        logger.info(
            f"✅ Confluence sync complete: "
            f"{pages_processed} processed, {pages_skipped} skipped, {pages_failed} failed"
        )
        
        # We can't easily return the metrics here as the interface returns List[NormalizedDocument]
        # But we can attach them to the metadata of the first document or use a side-channel
        # Better: KnowledgeService will handle the metrics if we store them in the connector instance
        self.last_sync_metrics = sync_metrics
        
        return documents
