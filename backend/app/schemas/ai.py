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

    model_config = ConfigDict(from_attributes=True)
