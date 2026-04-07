import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class MacroBase(BaseModel):
    name: str = Field(..., max_length=255)
    shortcut: str = Field(..., max_length=50)
    body: str = Field(..., max_length=2000)
    category: Optional[str] = Field(None, max_length=100)
    is_shared: bool = True

class MacroCreate(MacroBase):
    workspace_id: uuid.UUID

class MacroResponse(MacroBase):
    id: uuid.UUID
    workspace_id: uuid.UUID
    usage_count: int
    attachments: List[dict] = []
    
    model_config = {"from_attributes": True}
