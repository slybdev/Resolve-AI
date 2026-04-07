import httpx
import logging
import uuid
import base64
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup, NavigableString

logger = logging.getLogger(__name__)

class GuruClient:
    """
    API client for Guru Knowledge Management System.
    Base URL: https://api.getguru.com/api/v1
    """

    def __init__(self, email: str, api_token: str):
        self.email = email
        self.api_token = api_token
        self.base_url = "https://api.getguru.com/api/v1"
        
        # Build Basic Auth header
        auth_str = f"{email}:{api_token}"
        auth_bytes = auth_str.encode("ascii")
        base64_auth = base64.b64encode(auth_bytes).decode("ascii")
        self.headers = {
            "Authorization": f"Basic {base64_auth}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

    async def _request(self, method: str, path: str, **kwargs) -> Dict[str, Any]:
        """Internal helper for all Guru API requests."""
        url = f"{self.base_url}/{path.lstrip('/')}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.request(method, url, headers=self.headers, **kwargs)
                
                if response.status_code == 401:
                    raise Exception("Guru authentication failed. Check your Email and API Token.")
                if response.status_code == 429:
                    raise Exception("Guru rate limit reached. Please try again later.")
                
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"Guru API error ({method} {path}): {e.response.text}")
                raise Exception(f"Guru API Error: {e.response.status_code} - {e.response.text}")
            except Exception as e:
                logger.error(f"Guru request failed: {e}")
                raise

    async def verify_connection(self) -> bool:
        """Test if the credentials are valid."""
        try:
            # Simple test: list collections
            await self.list_collections()
            return True
        except Exception:
            return False

    async def list_collections(self) -> List[Dict[str, Any]]:
        """Fetch all collections available to the user."""
        return await self._request("GET", "collections")

    async def list_cards(self, collection_ids: List[str] = None, max_results: int = 50) -> List[Dict[str, Any]]:
        """
        Fetch cards from Guru using the search manager.
        """
        payload = {
            "maxResults": max_results,
        }
        
        if collection_ids:
            payload["collectionIds"] = collection_ids
            
        # cardmgr endpoint is best for bulk card retrieval
        return await self._request("POST", "search/cardmgr", json=payload)

    def parse_card_content(self, html_content: str) -> str:
        """
        Converts Guru's card HTML content into clean Markdown.
        """
        if not html_content:
            return ""

        soup = BeautifulSoup(html_content, "html.parser")
        
        def _process_node(node) -> str:
            if isinstance(node, NavigableString):
                return str(node)
                
            tag = node.name
            if not tag:
                return ""

            # ── Headings ──
            if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
                level = int(tag[1])
                return f"\n{'#' * level} {_process_children(node).strip()}\n"

            # ── Paragraphs ──
            if tag == "p":
                return f"\n{_process_children(node).strip()}\n"

            # ── Bold / Italics ──
            if tag in ("b", "strong"):
                return f"**{_process_children(node)}**"
            if tag in ("i", "em"):
                return f"*{_process_children(node)}*"

            # ── Links ──
            if tag == "a":
                href = node.get("href", "#")
                return f"[{_process_children(node)}]({href})"

            # ── Lists ──
            if tag == "ul":
                return "\n" + _process_children(node) + "\n"
            if tag == "ol":
                # Basic OL handling (Guru doesn't always provide numbers in HTML)
                return "\n" + _process_children(node) + "\n"
            if tag == "li":
                parent = node.parent.name if node.parent else "ul"
                prefix = "1. " if parent == "ol" else "- "
                return f"{prefix}{_process_children(node).strip()}\n"

            # ── Code blocks ──
            if tag == "pre" or (tag == "div" and "gh-code-snippet" in node.get("class", [])):
                code_text = node.get_text().strip()
                return f"\n```\n{code_text}\n```\n"
            if tag == "code":
                return f"`{_process_children(node)}`"

            # ── Specialized Guru tags (Mentions, Highlights) ──
            if tag == "span" and "gh-mention" in node.get("class", []):
                return f"@{node.get_text()}"

            # ── Unknown tags — recurse into children ──
            return _process_children(node)

        def _process_children(node) -> str:
            return "".join(_process_node(child) for child in node.children)

        return _process_node(soup).strip()
