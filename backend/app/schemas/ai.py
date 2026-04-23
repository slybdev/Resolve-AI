from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class AIQueryRequest(BaseModel):
    query: str
    workspace_id: UUID
    conversation_id: Optional[UUID] = None
    folder_id: Optional[UUID] = None

class AISource(BaseModel):
    document_id: str
    title: str
    snippet: Optional[str] = None
    score: float

class AIQueryResponse(BaseModel):
    answer: str
    sources: List[AISource]
    confidence_score: float
    intent: Optional[str] = None

class AIConfigurationBase(BaseModel):
    company_name: Optional[str] = None
    company_description: Optional[str] = None
    industry: Optional[str] = "saas"
    personality: Optional[str] = "professional"
    tone: Optional[str] = "formal"
    primary_goal: Optional[str] = "support"
    greeting_message: Optional[str] = None
    fallback_message: Optional[str] = None
    collect_email_trigger: Optional[str] = "on_support_request"
    collect_name_trigger: Optional[str] = "with_email"
    max_context_messages: Optional[int] = 10
    rag_enabled: Optional[bool] = True
    rag_top_k: Optional[int] = 3
    rag_min_similarity: Optional[float] = 0.7
    allowed_topics: Optional[List[str]] = None
    blocked_topics: Optional[List[str]] = None
    escalation_keywords: Optional[List[str]] = None
    system_prompt_template: Optional[str] = None
    tools_enabled: Optional[dict] = {"identify_contact": True, "create_ticket": True}

class AIConfigurationCreate(AIConfigurationBase):
    workspace_id: UUID

class AIConfigurationUpdate(AIConfigurationBase):
    pass

class AIConfigurationOut(AIConfigurationBase):
    workspace_id: UUID
    model_config = ConfigDict(from_attributes=True)
