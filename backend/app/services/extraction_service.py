import hashlib
import logging
import trafilatura
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

class ExtractionService:
    @staticmethod
    def extract_content(html: str, url: str, content_focus: str = "docs") -> Dict[str, Any]:
        """
        Extract content with adaptive quality based on user focus.
        Returns a dict with content, title, and metadata.
        """
        try:
            # Trafilatura settings based on focus
            include_tables = True
            include_comments = False
            
            # If focus is "full", we use a less aggressive extraction
            content = trafilatura.extract(
                html, 
                include_comments=include_comments,
                include_tables=include_tables,
                no_fallback=False if content_focus == "docs" else True,
                # Additional Trafilatura options could go here
            )
            
            # Fallback optimization for "full" mode or low-value trafilatura results
            min_length = 50 if content_focus == "docs" else 20
            if not content or len(content.strip()) < min_length:
                logger.warning(f"Trafilatura returned low-value content for {url}, using fallback text extraction.")
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(html, "html.parser")
                
                # If "docs", we strip ALL noise. If "full", we only strip script/style
                to_strip = ["script", "style", "nav", "footer", "header", "form"] if content_focus == "docs" else ["script", "style"]
                for tag in soup(to_strip):
                    tag.decompose()
                    
                fallback_text = soup.get_text(separator="\n", strip=True)
                if len(fallback_text) > len(content or ""):
                    content = fallback_text
            
            metadata = trafilatura.metadata.extract_metadata(html)
            
            return {
                "content": content or "",
                "title": metadata.title if metadata else None,
                "description": metadata.description if metadata else None,
                "author": metadata.author if metadata else None,
                "date": metadata.date if metadata else None,
                "content_hash": ExtractionService.generate_hash(content or ""),
                "is_low_value": ExtractionService.is_low_value(content or "")
            }
        except Exception as e:
            logger.error(f"Extraction failed for {url}: {e}")
            return {
                "content": "",
                "title": None,
                "content_hash": "",
                "is_low_value": True
            }

    @staticmethod
    def generate_hash(text: str) -> str:
        """
        Generate SHA-256 hash of the text for deduplication.
        Stabilizes text by collapsing whitespace to ensure tiny Formatting
        variations don't cause false unique detections.
        """
        import re
        # Collapse all whitespace to a single space and strip
        stable_text = re.sub(r'\s+', ' ', text).strip()
        # Also lowercase to be extra safe for one-page sections
        stable_text = stable_text.lower()
        return hashlib.sha256(stable_text.encode("utf-8")).hexdigest()

    @staticmethod
    def is_low_value(content: str) -> bool:
        """Check if the extracted content is likely junk/boiler plate."""
        return len(content.strip()) < 50

    @staticmethod
    def should_use_browser(html: str) -> bool:
        """
        Adaptive SPA detection.
        Decides if we should re-fetch with Playwright based on the quality of static HTML.
        """
        # Elite detection: outcome-based
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")
        
        # Strip script/style for density check
        for tag in soup(["script", "style"]):
            tag.decompose()
        
        text = soup.get_text(separator=" ", strip=True)
        text_len = len(text)
        
        # SPA indicators: empty shell or mostly scripts
        if text_len < 300:
            return True # Definitely an SPA shell or empty page
            
        if "<script" in html and text_len < 800:
            return True # Likely an SPA that hasn't hydrated
            
        # Framework roots often indicate SPAs even if some static text exists
        indicators = [
            'id="root"', 'id="app"', 'id="__next"', 
            'window.__INITIAL_STATE__', 'window.__VUE_STATE__'
        ]
        if any(ind in html for ind in indicators):
            return True
            
        return False
