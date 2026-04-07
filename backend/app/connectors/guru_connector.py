import logging
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.connectors.base import BaseConnector, NormalizedDocument
from app.integrations.guru.client import GuruClient
from app.core.encryption import decrypt_string

logger = logging.getLogger(__name__)

class GuruConnector(BaseConnector):
    """
    Connector for Guru Knowledge Source.
    Synchronizes Guru cards as Knowledge Documents.
    """

    async def connect(self, config: Dict[str, Any]) -> bool:
        """
        Validate credentials and initialize the Guru client.
        Config should contain: email, api_token (encrypted or plain)
        """
        email = config.get("email")
        # Decrypt token if it's encrypted
        raw_token = config.get("api_token")
        if not raw_token:
            return False
            
        try:
            # Try to decrypt, if it fails assume it's already plain (for initial setup)
            api_token = decrypt_string(raw_token)
        except Exception:
            api_token = raw_token
            
        self.client = GuruClient(email, api_token)
        self.config = config
        self.last_sync_at = config.get("last_sync_at")
        self.selected_collections = config.get("settings", {}).get("selected_collections", [])
        
        # Test connection
        return await self.client.verify_connection()

    async def fetch_documents(self) -> List[NormalizedDocument]:
        """
        Fetch cards from selected collections and map to NormalizedDocuments.
        """
        logger.info(f"🚀 Guru Sync: Starting fetch for collections: {self.selected_collections}")
        
        # Reset metrics
        self.last_sync_metrics = {
            "cards_processed": 0,
            "cards_skipped": 0,
            "cards_failed": 0,
            "total_discovered": 0
        }

        try:
            # 1. Fetch cards (supports filtering by collection)
            # Guru's search/cardmgr returns a list of card objects
            cards = await self.client.list_cards(
                collection_ids=self.selected_collections if self.selected_collections else None,
                max_results=500  # Reasonable limit for MVP
            )
            
            self.last_sync_metrics["total_discovered"] = len(cards)
            logger.info(f"🔍 Guru Sync: Discovered {len(cards)} cards")

            normalized_docs = []
            for card in cards:
                try:
                    card_id = card.get("id")
                    title = card.get("preferredPhrase", card.get("title", "Untitled Card"))
                    content_html = card.get("content", "")
                    
                    # ── Metadata Extraction ──
                    # Guru uses 'lastModified' timestamp
                    last_modified_str = card.get("lastModified")
                    is_verified = card.get("verificationStatus") == "TRUSTED"
                    collection_name = card.get("collection", {}).get("name", "Unknown Collection")
                    author = card.get("lastModifiedBy", {}).get("email", "System")
                    
                    # ── Incremental Sync Logic ──
                    is_stale = True
                    if self.last_sync_at and last_modified_str:
                        try:
                            # Guru format: 2026-03-30T13:00:00.000+0000 or similar
                            # Use dateutil or simple string slice for comparison
                            last_modified_dt = datetime.fromisoformat(last_modified_str.replace("Z", "+00:00"))
                            if last_modified_dt <= self.last_sync_at:
                                is_stale = False
                        except Exception as e:
                            logger.warning(f"Failed to parse Guru timestamp '{last_modified_str}': {e}")

                    if not is_stale:
                        self.last_sync_metrics["cards_skipped"] += 1
                        logger.debug(f"⏭️ Guru Sync: Skipping unchanged card: {title}")
                        # We still return the doc but with is_stale=False to avoid re-embedding
                        # Note: Our sync_source logic uses is_stale from NormalizedDocument.doc_metadata
                    
                    # Parse HTML to Markdown
                    clean_content = self.client.parse_card_content(content_html)
                    
                    # ── Document Object ──
                    doc = NormalizedDocument(
                        external_id=card_id,
                        title=title,
                        content=clean_content,
                        doc_type="guru-card",
                        doc_metadata={
                            "collection": collection_name,
                            "verified": is_verified,
                            "author": author,
                            "last_modified": last_modified_str,
                            "is_stale": is_stale  # Critical for efficiency
                        }
                    )
                    normalized_docs.append(doc)
                    self.last_sync_metrics["cards_processed"] += 1
                    
                except Exception as e:
                    logger.error(f"❌ Guru Sync: Failed to process card: {e}")
                    self.last_sync_metrics["cards_failed"] += 1
                    continue

            logger.info(f"✅ Guru Sync: Completed. Processed: {self.last_sync_metrics['cards_processed']}, Skipped: {self.last_sync_metrics['cards_skipped']}")
            return normalized_docs

        except Exception as e:
            logger.error(f"💥 Guru Sync: Critical failure: {e}")
            raise
