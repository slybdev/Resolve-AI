import httpx
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class NotionClient:
    """Async client for the Notion API."""
    
    BASE_URL = "https://api.notion.com/v1"
    VERSION = "2022-06-28"

    def __init__(self, access_token: str):
        self.access_token = access_token
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Notion-Version": self.VERSION,
            "Content-Type": "application/json",
        }

    async def list_pages_and_databases(self) -> List[Dict[str, Any]]:
        """Search for all accessible pages and databases."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.BASE_URL}/search",
                headers=self.headers,
                json={"filter": {"value": "page", "property": "object"}}
            )
            response.raise_for_status()
            results = response.json().get("results", [])
            return results

    async def get_page_content(self, page_id: str) -> str:
        """Fetch and flatten all block content for a page."""
        blocks = await self._get_blocks(page_id)
        return self._flatten_blocks(blocks)

    async def _get_blocks(self, block_id: str) -> List[Dict[str, Any]]:
        """Recursively fetch child blocks."""
        all_blocks = []
        cursor = None
        
        async with httpx.AsyncClient() as client:
            while True:
                params = {"page_size": 100}
                if cursor:
                    params["start_cursor"] = cursor
                    
                response = await client.get(
                    f"{self.BASE_URL}/blocks/{block_id}/children",
                    headers=self.headers,
                    params=params
                )
                response.raise_for_status()
                data = response.json()
                
                blocks = data.get("results", [])
                for block in blocks:
                    all_blocks.append(block)
                    if block.get("has_children"):
                        child_blocks = await self._get_blocks(block["id"])
                        all_blocks.extend(child_blocks)
                
                if not data.get("has_more"):
                    break
                cursor = data.get("next_cursor")
                
        return all_blocks

    def _flatten_blocks(self, blocks: List[Dict[str, Any]]) -> str:
        """Flatten nested Notion blocks into clean text."""
        text_parts = []
        
        for block in blocks:
            b_type = block.get("type")
            if not b_type:
                continue
                
            content = block.get(b_type, {})
            rich_text = content.get("rich_text", [])
            
            if rich_text:
                plain_text = "".join([t.get("plain_text", "") for t in rich_text])
                if plain_text:
                    if b_type == "heading_1":
                        text_parts.append(f"\n# {plain_text}\n")
                    elif b_type == "heading_2":
                        text_parts.append(f"\n## {plain_text}\n")
                    elif b_type == "heading_3":
                        text_parts.append(f"\n### {plain_text}\n")
                    elif b_type == "bulleted_list_item":
                        text_parts.append(f"- {plain_text}")
                    elif b_type == "numbered_list_item":
                        text_parts.append(f"1. {plain_text}")
                    elif b_type == "to_do":
                        checked = content.get("checked", False)
                        text_parts.append(f"[{'x' if checked else ' '}] {plain_text}")
                    elif b_type == "toggle":
                        text_parts.append(f"> {plain_text}")
                    elif b_type == "quote":
                        text_parts.append(f"> {plain_text}")
                    elif b_type == "callout":
                        text_parts.append(f"💡 {plain_text}")
                    elif b_type == "code":
                        language = content.get("language", "text")
                        text_parts.append(f"```{language}\n{plain_text}\n```")
                    else:
                        text_parts.append(plain_text)
            elif b_type == "divider":
                text_parts.append("\n---\n")
                        
        return "\n".join(text_parts)
