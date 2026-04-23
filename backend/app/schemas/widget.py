import uuid
import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class WidgetConversationCreate(BaseModel):
    workspace_key: str
    visitor_id: Optional[str] = None # UUID from localStorage (persistent)
    session_id: Optional[str] = None # Ephemeral browser session ID
    user_token: Optional[str] = None # Signed JWT from customer backend
    metadata: Optional[Dict[str, Any]] = None # Referrer, current page, UTMs, etc.
    consent_given: bool = False # GDPR tracking consent
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    initial_message: Optional[str] = None

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

class WidgetConversationHistoryItem(BaseModel):
    conversation_id: uuid.UUID
    last_message: Optional[str] = None
    last_message_at: Optional[datetime.datetime] = None
    status: str = "open"
    has_active_ticket: bool = False

class WidgetRatingCreate(BaseModel):
    conversation_id: uuid.UUID
    ticket_id: Optional[uuid.UUID] = None
    agent_id: Optional[uuid.UUID] = None
    rated_entity_type: str = "agent"  # "agent" or "ai"
    score: int  # 1-5
    comment: Optional[str] = None
