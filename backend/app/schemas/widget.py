import uuid
import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class WidgetConversationCreate(BaseModel):
    workspace_key: str
    visitor_id: Optional[str] = None # UUID from localStorage
    user_token: Optional[str] = None # Signed JWT from customer backend

class WidgetConversationResponse(BaseModel):
    conversation_id: uuid.UUID
    ws_token: str
    expires_at: datetime.datetime
    messages: List[Dict[str, Any]] = []
    ticket_id: Optional[uuid.UUID] = None

class WidgetTokenRefresh(BaseModel):
    current_token: str

class WidgetStateResponse(BaseModel):
    offline_state: Optional[str] = None
    collected: Dict[str, Any] = {}
