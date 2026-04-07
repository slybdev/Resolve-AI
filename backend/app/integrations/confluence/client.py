"""
Confluence Cloud REST API client.

Handles:
  - Basic Auth (email + API token)
  - Pagination via _links.next
  - Retry with exponential backoff
  - Structured HTML → Markdown conversion
"""

import asyncio
import logging
import re
from typing import List, Dict, Any, Optional
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup, Tag

logger = logging.getLogger(__name__)

# Defaults
REQUEST_TIMEOUT = 30.0
MAX_RETRIES = 3
BACKOFF_BASE = 1.5  # seconds


class ConfluenceError(Exception):
    """Base exception for Confluence client."""
    pass


class ConfluenceAuthError(ConfluenceError):
    """Authentication or authorization failed."""
    pass


class ConfluenceRateLimitError(ConfluenceError):
    """Persistent rate limiting from Confluence API."""
    pass


class ConfluenceClient:
    """Async client for the Confluence Cloud REST API."""

    def __init__(self, base_url: str, email: str, api_token: str):
        """
        Args:
            base_url: e.g. https://company.atlassian.net
            email: Atlassian account email
            api_token: API token from id.atlassian.com
        """
        self.base_url = base_url.rstrip("/")
        self.api_base = f"{self.base_url}/wiki/rest/api"
        self._auth = (email, api_token)

    # ──────────────────────────────────────────────
    # HTTP Layer (with retry + backoff)
    # ──────────────────────────────────────────────

    async def _request(
        self, method: str, url: str, **kwargs
    ) -> Dict[str, Any]:
        """Make an HTTP request with retry and exponential backoff."""
        last_error: Optional[Exception] = None

        for attempt in range(MAX_RETRIES):
            try:
                async with httpx.AsyncClient(
                    timeout=REQUEST_TIMEOUT,
                    auth=self._auth,
                ) as client:
                    response = await client.request(method, url, **kwargs)

                    # Rate limited — back off
                    if response.status_code == 429:
                        retry_after = int(response.headers.get("Retry-After", BACKOFF_BASE * (2 ** attempt)))
                        logger.warning(f"Rate limited by Confluence. Sleeping {retry_after}s (attempt {attempt + 1})")
                        await asyncio.sleep(retry_after)
                        continue

                    response.raise_for_status()
                    return response.json()

            except httpx.TimeoutException as e:
                last_error = e
                wait = BACKOFF_BASE * (2 ** attempt)
                logger.warning(f"Confluence request timeout (attempt {attempt + 1}/{MAX_RETRIES}). Retrying in {wait:.1f}s")
                await asyncio.sleep(wait)

            except httpx.HTTPStatusError as e:
                # ── Auth or 429 ──
                if e.response.status_code in (401, 403):
                    raise ConfluenceAuthError("Confluence authentication failed — please check your credentials and API token.") from e
                
                # Rate limit (already handled above but in case it persists)
                if e.response.status_code == 429:
                    raise ConfluenceRateLimitError("Confluence API is rate limiting our requests. Please try again later.") from e

                # Don't retry other 4xx
                if 400 <= e.response.status_code < 500:
                    raise
                last_error = e
                wait = BACKOFF_BASE * (2 ** attempt)
                logger.warning(f"Confluence HTTP {e.response.status_code} (attempt {attempt + 1}/{MAX_RETRIES}). Retrying in {wait:.1f}s")
                await asyncio.sleep(wait)

            except Exception as e:
                last_error = e
                wait = BACKOFF_BASE * (2 ** attempt)
                logger.warning(f"Confluence request failed (attempt {attempt + 1}/{MAX_RETRIES}): {e}. Retrying in {wait:.1f}s")
                await asyncio.sleep(wait)

        raise ConnectionError(f"Confluence request failed after {MAX_RETRIES} retries: {last_error}")

    async def _get(self, path: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """GET request against the Confluence REST API."""
        url = f"{self.api_base}{path}" if path.startswith("/") else path
        return await self._request("GET", url, params=params)

    # ──────────────────────────────────────────────
    # Paginated fetching
    # ──────────────────────────────────────────────

    async def _get_all_pages(self, path: str, params: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """Fetch ALL results by following _links.next until exhausted."""
        all_results: List[Dict[str, Any]] = []
        url = f"{self.api_base}{path}"

        while url:
            data = await self._request("GET", url, params=params)
            results = data.get("results", [])
            all_results.extend(results)

            # Follow pagination
            next_link = data.get("_links", {}).get("next")
            if next_link:
                # next_link is relative like /wiki/rest/api/content?start=25
                url = urljoin(self.base_url, next_link)
                params = None  # params are embedded in the next URL
            else:
                url = None

            logger.debug(f"Fetched {len(results)} results (total: {len(all_results)})")

        return all_results

    # ──────────────────────────────────────────────
    # Public API methods
    # ──────────────────────────────────────────────

    async def test_connection(self) -> bool:
        """Verify credentials by fetching one space."""
        try:
            await self._get("/space", params={"limit": 1})
            return True
        except Exception as e:
            logger.error(f"Confluence connection test failed: {e}")
            return False

    async def list_spaces(self) -> List[Dict[str, Any]]:
        """Fetch all accessible spaces."""
        return await self._get_all_pages("/space", params={"limit": 25})

    async def list_pages(self, space_key: str, limit: int = 25) -> List[Dict[str, Any]]:
        """Fetch all pages in a space with version info."""
        return await self._get_all_pages(
            "/content",
            params={
                "spaceKey": space_key,
                "type": "page",
                "limit": limit,
                "expand": "version,history.lastUpdated",
            }
        )

    async def get_page_content(self, page_id: str) -> Dict[str, Any]:
        """Fetch a single page with its body and version."""
        data = await self._get(
            f"/content/{page_id}",
            params={"expand": "body.storage,version,space"}
        )
        return data

    async def get_page_body_as_markdown(self, page_id: str) -> str:
        """Fetch a page and return its content as clean markdown."""
        data = await self.get_page_content(page_id)
        html = data.get("body", {}).get("storage", {}).get("value", "")
        return self.parse_storage_format(html)

    # ──────────────────────────────────────────────
    # HTML → Markdown (Structured Parser)
    # ──────────────────────────────────────────────

    @staticmethod
    def parse_storage_format(html: str) -> str:
        """
        Convert Confluence Storage Format (XHTML) to clean Markdown.

        Handles:
          - Headings (h1-h6)
          - Paragraphs
          - Lists (ordered, unordered)
          - Code blocks (ac:structured-macro with language)
          - Tables
          - Links
          - Bold, italic, underline
          - Block quotes
          - Horizontal rules
          - Safely ignores unknown macros
        """
        if not html or not html.strip():
            return ""

        soup = BeautifulSoup(html, "html.parser")
        parts: List[str] = []

        def _process_node(node) -> str:
            """Recursively convert a DOM node to markdown."""
            if isinstance(node, str):
                # NavigableString
                text = node.strip()
                return text if text else ""

            if not isinstance(node, Tag):
                return ""

            tag = node.name.lower() if node.name else ""

            # ── Headings ──
            if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
                level = int(tag[1])
                inner = _get_inner_text(node)
                if inner:
                    return f"\n{'#' * level} {inner}\n"
                return ""

            # ── Paragraphs ──
            if tag == "p":
                inner = _process_children(node)
                if inner.strip():
                    return f"\n{inner.strip()}\n"
                return ""

            # ── Bold ──
            if tag in ("strong", "b"):
                inner = _process_children(node)
                return f"**{inner}**" if inner.strip() else ""

            # ── Italic ──
            if tag in ("em", "i"):
                inner = _process_children(node)
                return f"*{inner}*" if inner.strip() else ""

            # ── Underline (no markdown equivalent, just pass through) ──
            if tag == "u":
                return _process_children(node)

            # ── Links ──
            if tag == "a":
                href = node.get("href", "")
                inner = _get_inner_text(node)
                if href and inner:
                    return f"[{inner}]({href})"
                return inner or ""

            # ── Unordered lists ──
            if tag == "ul":
                items = []
                for li in node.find_all("li", recursive=False):
                    text = _process_children(li).strip()
                    if text:
                        items.append(f"- {text}")
                return "\n" + "\n".join(items) + "\n" if items else ""

            # ── Ordered lists ──
            if tag == "ol":
                items = []
                for idx, li in enumerate(node.find_all("li", recursive=False), 1):
                    text = _process_children(li).strip()
                    if text:
                        items.append(f"{idx}. {text}")
                return "\n" + "\n".join(items) + "\n" if items else ""

            # ── List items (when processed individually) ──
            if tag == "li":
                return _process_children(node)

            # ── Code blocks (inline) ──
            if tag == "code":
                inner = _get_inner_text(node)
                return f"`{inner}`" if inner else ""

            # ── Preformatted ──
            if tag == "pre":
                inner = _get_inner_text(node)
                return f"\n```\n{inner}\n```\n" if inner else ""

            # ── Block quotes ──
            if tag == "blockquote":
                inner = _process_children(node).strip()
                if inner:
                    lines = inner.split("\n")
                    return "\n" + "\n".join(f"> {line}" for line in lines) + "\n"
                return ""

            # ── Tables ──
            if tag == "table":
                return _process_table(node)

            # ── Horizontal rule ──
            if tag == "hr":
                return "\n---\n"

            # ── Line breaks ──
            if tag == "br":
                return "\n"

            # ── Confluence macros (ac:structured-macro) ──
            if tag == "ac:structured-macro":
                return _process_macro(node)

            # ── Confluence rich text body / plain text body ──
            if tag in ("ac:rich-text-body", "ac:plain-text-body"):
                return _process_children(node)

            # ── Spans and divs — just recurse ──
            if tag in ("span", "div", "section", "article", "body", "html",
                        "ac:layout", "ac:layout-section", "ac:layout-cell"):
                return _process_children(node)

            # ── Unknown tags — recurse into children ──
            return _process_children(node)

        def _process_children(node) -> str:
            """Process all children of a node and join results."""
            return "".join(_process_node(child) for child in node.children)

        def _get_inner_text(node) -> str:
            """Get plain text content, stripping tags."""
            return node.get_text(strip=True)

        def _process_table(table_node) -> str:
            """Convert an HTML table to markdown table."""
            rows = []
            for tr in table_node.find_all("tr"):
                cells = []
                for td in tr.find_all(["th", "td"]):
                    cell_text = _get_inner_text(td).replace("|", "\\|")
                    cells.append(cell_text)
                if cells:
                    rows.append(cells)

            if not rows:
                return ""

            # Build markdown table
            lines = []
            # Header row
            lines.append("| " + " | ".join(rows[0]) + " |")
            lines.append("| " + " | ".join(["---"] * len(rows[0])) + " |")
            # Data rows
            for row in rows[1:]:
                # Pad row to match header length
                while len(row) < len(rows[0]):
                    row.append("")
                lines.append("| " + " | ".join(row) + " |")

            return "\n" + "\n".join(lines) + "\n"

        def _process_macro(node) -> str:
            """Handle Confluence macros (code, info, warning, note, etc.)."""
            macro_name = node.get("ac:name", "").lower()

            # Code block macro
            if macro_name == "code":
                language = ""
                for param in node.find_all("ac:parameter"):
                    if param.get("ac:name") == "language":
                        language = param.get_text(strip=True)
                        break

                body = node.find("ac:plain-text-body")
                if body:
                    code_text = body.get_text()
                    return f"\n```{language}\n{code_text.strip()}\n```\n"
                return ""

            # Info / Note / Warning / Tip macros
            if macro_name in ("info", "note", "warning", "tip"):
                prefix = {"info": "ℹ️", "note": "📝", "warning": "⚠️", "tip": "💡"}.get(macro_name, "")
                body = node.find("ac:rich-text-body")
                if body:
                    inner = _process_children(body).strip()
                    return f"\n{prefix} {inner}\n" if inner else ""
                return ""

            # Panel macro
            if macro_name == "panel":
                body = node.find("ac:rich-text-body")
                if body:
                    inner = _process_children(body).strip()
                    return f"\n> {inner}\n" if inner else ""
                return ""

            # Expand / Section — recurse into body
            if macro_name in ("expand", "section", "column", "excerpt"):
                body = node.find("ac:rich-text-body")
                if body:
                    return _process_children(body)
                return ""

            # Table of contents — skip
            if macro_name == "toc":
                return ""

            # Unknown macro — log for future support and try to extract text
            logger.debug(f"Unhandled Confluence macro: '{macro_name}'")
            body = node.find("ac:rich-text-body") or node.find("ac:plain-text-body")
            if body:
                return _process_children(body)

            return ""

        # Process all top-level nodes
        for child in soup.children:
            result = _process_node(child)
            if result:
                parts.append(result)

        # Clean up: collapse multiple blank lines
        text = "\n".join(parts)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()
