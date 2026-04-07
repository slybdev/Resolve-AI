import httpx
from typing import Dict, Any, Optional
from app.core.config import get_settings

settings = get_settings()

class NotionOAuth:
    """Handles Notion OAuth flow and token exchange."""
    
    AUTHORIZE_URL = "https://api.notion.com/v1/oauth/authorize"
    TOKEN_URL = "https://api.notion.com/v1/oauth/token"

    @classmethod
    def get_authorization_url(cls, state: str) -> str:
        """Generate the Notion authorization URL."""
        params = {
            "client_id": settings.NOTION_CLIENT_ID,
            "redirect_uri": settings.NOTION_REDIRECT_URI,
            "response_type": "code",
            "owner": "user",
            "state": state
        }
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{cls.AUTHORIZE_URL}?{query_string}"

    @classmethod
    async def exchange_code_for_token(cls, code: str) -> Dict[str, Any]:
        """Exchange the authorization code for an access token."""
        auth = (settings.NOTION_CLIENT_ID, settings.NOTION_CLIENT_SECRET)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                cls.TOKEN_URL,
                auth=auth,
                json={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": settings.NOTION_REDIRECT_URI
                }
            )
            response.raise_for_status()
            token_data = response.json()
            return token_data
