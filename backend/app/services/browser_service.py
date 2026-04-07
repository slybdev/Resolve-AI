import asyncio
import logging
import random
from typing import Optional, Dict, Any, List
from playwright.async_api import async_playwright, Browser, BrowserContext, Page

logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0",
]

class BrowserService:
    _instance: Optional['BrowserService'] = None
    _browser: Optional[Browser] = None
    _playwright = None
    _semaphore = asyncio.Semaphore(3) # Elite concurrency control

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(BrowserService, cls).__new__(cls)
        return cls._instance

    async def start(self):
        """Initialize playwright and launch browser."""
        if not self._browser:
            logger.info("Initializing Playwright Browser...")
            self._playwright = await async_playwright().start()
            self._browser = await self._playwright.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
            )
            logger.info("Playwright Browser started.")

    async def stop(self):
        """Shutdown browser and playwright."""
        if self._browser:
            await self._browser.close()
            self._browser = None
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None
        logger.info("Playwright Browser stopped.")

    async def fetch_rendered_page(self, url: str) -> Dict[str, Any]:
        """
        Fetch a page using Playwright, rendering JavaScript.
        Includes anti-bot evasion and outcome-based results.
        """
        if not self._browser:
            await self.start()

        async with self._semaphore: # Resource protection
            context: Optional[BrowserContext] = None
            page: Optional[Page] = None
            try:
                # Anti-bot: Random UA and Viewport
                ua = random.choice(USER_AGENTS)
                context = await self._browser.new_context(
                    user_agent=ua,
                    viewport={"width": 1280, "height": 800}
                )
                page = await context.new_page()

                # Jitter delay
                await asyncio.sleep(random.uniform(0.5, 1.5))

                logger.info(f"Browser fetching: {url}")
                
                # Navigate with timeout
                response = await page.goto(url, wait_until="domcontentloaded", timeout=60000)
                
                # Fallback safety: wait for network idle if it seems like an SPA
                try:
                    await page.wait_for_load_state("networkidle", timeout=15000)
                except Exception:
                    pass # Don't hang if network never goes idle

                html = await page.content()
                
                # Extract rendered links (Elite discovery)
                links = await page.eval_on_selector_all("a[href]", "elements => elements.map(el => el.href)")
                
                # Canonical handling
                canonical = None
                try:
                    canonical = await page.locator('link[rel="canonical"]').get_attribute("href")
                except Exception:
                    pass

                return {
                    "html": html,
                    "url": url,
                    "canonical": canonical,
                    "links": list(set(links)), # Deduplicate
                    "status": response.status if response else 500,
                    "success": True if response and response.status < 400 else False
                }

            except Exception as e:
                logger.error(f"Playwright fetch failed for {url}: {e}")
                return {"html": "", "url": url, "success": False, "error": str(e)}
            finally:
                if page: await page.close()
                if context: await context.close()

# Global singleton
browser_service = BrowserService()
