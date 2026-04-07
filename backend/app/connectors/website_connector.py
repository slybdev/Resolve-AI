import uuid
import logging
import asyncio
import random
import hashlib
import fnmatch
from typing import List, Dict, Any, Set, Tuple, Optional
from urllib.parse import urlparse, urljoin
import urllib.robotparser

import httpx
from bs4 import BeautifulSoup

from app.connectors.base import BaseConnector, NormalizedDocument
from app.services.browser_service import browser_service
from app.services.extraction_service import ExtractionService

logger = logging.getLogger(__name__)

# Constants for quality and safety
MIN_CONTENT_LENGTH = 500
MAX_CONCURRENT_FETCHES = 3
DEFAULT_DELAY = 1.0

class WebsiteConnector(BaseConnector):
    """Elite Adaptive Ingestion Engine for websites."""

    def __init__(self):
        self._url: str | None = None
        self._config: dict = {}
        self._visited_urls: Set[str] = set()
        self._content_hashes: Set[str] = set()
        self._base_domain: str = ""
        self._rp: Optional[urllib.robotparser.RobotFileParser] = None
        self._semaphore = asyncio.Semaphore(MAX_CONCURRENT_FETCHES)

    async def connect(self, credentials: dict) -> bool:
        self._url = credentials.get("url", "").strip()
        self._config = credentials
        if self._url:
            self._base_domain = urlparse(self._url).netloc
            
            # Respect robots.txt by default, but allow user override
            if self._config.get("respect_robots_txt", True):
                try:
                    self._rp = urllib.robotparser.RobotFileParser()
                    robots_url = urljoin(self._url, "/robots.txt")
                    async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                        resp = await client.get(robots_url)
                        if resp.status_code == 200:
                            # Verify it's actually text and not an SPA redirecting to index.html
                            content_type = resp.headers.get("Content-Type", "").lower()
                            if "html" in content_type:
                                logger.warning(f"robots.txt at {robots_url} returned HTML. Likely an SPA catch-all. Ignoring restrictions.")
                                self._rp = None
                            else:
                                self._rp.parse(resp.text.splitlines())
                        else:
                            self._rp = None
                except Exception as e:
                    logger.warning(f"Failed to fetch robots.txt for {self._url}: {e}")
                    self._rp = None
            else:
                logger.info(f"Ignoring robots.txt for {self._url} (user override)")
                self._rp = None
        return bool(self._url)

    async def test_connection(self) -> bool:
        if not self._url: return False
        try:
            async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                response = await client.get(self._url)
                return response.status_code < 400
        except Exception:
            return False

    def _normalize_url(self, url: str) -> str:
        """Strip fragments, query params, and trailing slashes."""
        parsed = urlparse(url)
        # We keep the path but strip the rest to avoid duplicates
        return f"{parsed.scheme}://{parsed.netloc}{parsed.path.rstrip('/')}"

    def _score_url(self, url: str) -> int:
        """Elite prioritization: higher is better."""
        url_lower = url.lower()
        if any(w in url_lower for w in ["pricing", "plan", "subscription"]): return 10
        if any(w in url_lower for w in ["docs", "documentation", "guide", "help"]): return 9
        if any(w in url_lower for w in ["about", "mission", "company"]): return 8
        if any(w in url_lower for w in ["blog", "news", "article"]): return 5
        return 0

    def _parse_patterns(self, patterns: Any) -> List[str]:
        """Convert string or list of patterns into a clean list."""
        if isinstance(patterns, str):
            # Split by comma and strip
            return [p.strip() for p in patterns.split(",") if p.strip()]
        if isinstance(patterns, list):
            return [str(p).strip() for p in patterns if str(p).strip()]
        return []

    def _can_fetch(self, url: str) -> bool:
        """Check robots.txt and user patterns."""
        if self._rp and not self._rp.can_fetch("*", url):
            logger.info(f"Skipping {url} (blocked by robots.txt)")
            return False
            
        parsed = urlparse(url)
        if parsed.netloc != self._base_domain:
            return False

        path = parsed.path.lower() or "/"
        
        # Noise filters
        if any(x in path for x in ["/login", "/signup", "/cart", "/auth", "/logout", "/admin"]):
            return False

        # User patterns (Elite: Support glob matching)
        exclude = self._parse_patterns(self._config.get("exclude_patterns", []))
        for pattern in exclude:
            if fnmatch.fnmatch(path, pattern.lower()):
                logger.info(f"Skipping {url} (matched exclude pattern: {pattern})")
                return False
            
        include = self._parse_patterns(self._config.get("include_patterns", []))
        if include:
            matched = False
            for pattern in include:
                if fnmatch.fnmatch(path, pattern.lower()):
                    matched = True
                    break
            if not matched:
                return False

        return True

    async def fetch_documents(self) -> List[NormalizedDocument]:
        if not self._url: raise ValueError("Not connected")

        # If user selected specific target URLs from preview, process those directly
        target_urls = self._config.get("target_urls", [])
        if target_urls:
            return await self._fetch_target_urls(target_urls)

        # Config with UI overrides
        mode = self._config.get("crawl_mode", "subpages")
        page_limit = int(self._config.get("page_limit", 50))
        
        # Elite Mapping: crawl_mode -> max_depth
        if mode == "single":
            max_depth = 0
        elif mode == "subpages":
            max_depth = 1
        else: # recursive
            max_depth = int(self._config.get("max_depth", 2))

        # Priority Queue: (priority, depth, url)
        queue: List[Tuple[int, int, str]] = [(100, 0, self._url)]
        self._visited_urls = {self._normalize_url(self._url)}
        results: List[NormalizedDocument] = []

        logger.info(f"🚀 ELITE INGESTION STARTING: {self._url} (Mode: {mode}, Depth: {max_depth}, Limit: {page_limit})")

        while queue and len(results) < page_limit:
            # Re-sort queue by priority (desc) and then depth (asc)
            queue.sort(key=lambda x: (-x[0], x[1]))
            priority, depth, current_url = queue.pop(0)

            # Jitter delay
            await asyncio.sleep(random.uniform(0.5, DEFAULT_DELAY))

            doc = await self._process_url(current_url, depth)
            if doc:
                # Content deduplication check
                content_hash = doc.doc_metadata.get("content_hash")
                if content_hash in self._content_hashes:
                    logger.info(f"Skipping {current_url} (duplicate content found)")
                else:
                    self._content_hashes.add(content_hash)
                    results.append(doc)

                # Discovery (if within depth)
                if depth < max_depth:
                    new_links = doc.doc_metadata.get("discovered_links", [])
                    for link in new_links:
                        norm_link = self._normalize_url(link)
                        if norm_link not in self._visited_urls and self._can_fetch(link):
                            self._visited_urls.add(norm_link)
                            queue.append((self._score_url(link), depth + 1, link))

        logger.info(f"✅ INGESTION COMPLETE: {len(results)} high-quality docs extracted.")
        return results

    async def _fetch_target_urls(self, target_urls: List[str]) -> List[NormalizedDocument]:
        """Process specific user-selected URLs from the preview directly."""
        results: List[NormalizedDocument] = []
        page_limit = int(self._config.get("page_limit", 50))
        logger.info(f"🎯 TARGET MODE: Processing {len(target_urls)} user-selected URLs (Limit: {page_limit})")
        
        for i, url in enumerate(target_urls):
            if len(results) >= page_limit:
                logger.info(f"Reached page limit ({page_limit}). Stopping target crawl.")
                break
                
            logger.info(f"➤ Processing target [{i+1}/{len(target_urls)}]: {url}")
            await asyncio.sleep(random.uniform(0.3, 1.0))
            
            doc = await self._process_url(url, 0)
            if doc:
                # Content deduplication check
                content_hash = doc.doc_metadata.get("content_hash")
                if content_hash in self._content_hashes:
                    logger.info(f"Skipping {url} (duplicate content)")
                    doc.status = "skipped"
                    doc.doc_metadata["skip_reason"] = "duplicate"
                    results.append(doc)
                    continue
                
                self._content_hashes.add(content_hash)

                # Elite Title Derivation: prioritize URL-based titles for subpages, "Home" for base
                derived_title = self._title_from_url(url)
                if derived_title:
                    doc.title = derived_title
                
                results.append(doc)
                logger.info(f"✓ Extracted: {doc.title} ({len(doc.content)} chars)")
            else:
                logger.warning(f"✗ No content extracted from: {url}")
        
        logger.info(f"✅ TARGET INGESTION COMPLETE: {len(results)}/{len(target_urls)} pages extracted.")
        return results

    async def _process_url(self, url: str, depth: int) -> Optional[NormalizedDocument]:
        """Fetch using static first, then fallback to Playwright if adaptive detection triggers."""
        content_focus = self._config.get("content_focus", "docs")
        start_time = asyncio.get_event_loop().time()
        mode = "static"
        html = ""
        links = []
        canonical = None

        try:
            async with self._semaphore:
                # Elite UA rotation
                from app.services.browser_service import USER_AGENTS
                ua = random.choice(USER_AGENTS)
                
                async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers={"User-Agent": ua}) as client:
                    response = await client.get(url)
                    response.raise_for_status()
                    html = response.text
                    
            # Ensure browser service is initialized (if worker startup was skipped)
            await browser_service.start()
            
            # Adaptive SPA Detection
            if ExtractionService.should_use_browser(html):
                logger.info(f"⚠️ SPA Detected at {url}, triggering Playwright fallback.")
                mode = "browser"
                browser_data = await browser_service.fetch_rendered_page(url)
                if browser_data.get("success"):
                    html = browser_data["html"]
                    links = browser_data["links"]
                    canonical = browser_data.get("canonical")
                else:
                    logger.error(f"Playwright fallback failed for {url}")
            else:
                # Static link extraction
                soup = BeautifulSoup(html, "html.parser")
                links = [urljoin(url, a["href"]) for a in soup.find_all("a", href=True)]

            # Elite Extraction (Trafilatura)
            extraction = ExtractionService.extract_content(html, url, content_focus=content_focus)
            
            if extraction["is_low_value"] and mode == "static":
                 # One last chance: static found nothing, maybe browser will
                 logger.info(f"Low content found for {url} via Static. Retrying with Browser.")
                 mode = "browser"
                 browser_data = await browser_service.fetch_rendered_page(url)
                 if browser_data.get("success"):
                     html = browser_data["html"]
                     links = browser_data["links"]
                     extraction = ExtractionService.extract_content(html, url)

            if not extraction["content"]:
                logger.warning(f"Skipping {url} (Zero content extracted)")
                return None
            
            # For target mode (depth 0), we are much more lenient with low-value content
            if depth == 0 and extraction["is_low_value"]:
                logger.info(f"Preserving low-value target page: {url}")
            elif extraction["is_low_value"]:
                logger.warning(f"Skipping {url} (Insufficient content after removal of boiler-plate)")
                return None

            duration = (asyncio.get_event_loop().time() - start_time) * 1000
            logger.info({
                "event": "page_ingested",
                "url": url,
                "mode": mode,
                "depth": depth,
                "duration_ms": round(duration, 2),
                "chars": len(extraction["content"])
            })

            return NormalizedDocument(
                external_id=f"web-{hashlib.md5(url.encode()).hexdigest()}",
                title=extraction["title"] or url,
                content=extraction["content"],
                doc_type="website",
                doc_metadata={
                    "source_url": url,
                    "canonical": canonical or url,
                    "content_hash": extraction["content_hash"],
                    "extraction_mode": mode,
                    "depth": depth,
                    "discovered_links": links
                }
            )

        except Exception as e:
            logger.error(f"Processing failed for {url}: {e}")
            return None

    async def preview_links(self) -> List[dict]:
        """Shallow prioritized crawl for preview with SPA fallback."""
        if not self._url: return []
        self._visited_urls = {self._normalize_url(self._url)}
        
        # Initial adaptive fetch for the home page to discover links
        doc = await self._process_url(self._url, 0)
        
        if not doc:
            return [{"url": self._url, "title": "Could not reach site or no content found"}]

        # Start with the home page (Title: Home)
        results = [{"url": self._url, "title": "Home"}]
        
        # Apply configurations from config
        page_limit = int(self._config.get("page_limit", 50))
        crawl_mode = self._config.get("crawl_mode", "subpages")
        
        # Skip discovery if "single" mode
        if crawl_mode == "single" or page_limit <= 1:
            return results
        
        # Discover links from the rendered/static content
        links = doc.doc_metadata.get("discovered_links", [])
        for link in links:
            if len(results) >= page_limit: break
            
            if self._can_fetch(link):
                norm_link = self._normalize_url(link)
                if norm_link not in self._visited_urls:
                    self._visited_urls.add(norm_link)
                    # Derive a readable title from the URL path
                    title = self._title_from_url(link)
                    results.append({"url": link, "title": title})
                    
        return results

    @staticmethod
    def _title_from_url(url: str) -> str:
        """Derive a human-readable title from a URL path."""
        path = urlparse(url).path.strip("/")
        if not path:
            return "Home"
        # Take the last segment, replace separators with spaces, title-case it
        segment = path.split("/")[-1]
        # Remove file extensions
        if "." in segment:
            segment = segment.rsplit(".", 1)[0]
        # Replace hyphens/underscores with spaces
        title = segment.replace("-", " ").replace("_", " ").strip()
        return title.title() if title else "Page"
