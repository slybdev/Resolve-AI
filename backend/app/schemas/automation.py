import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# ── Automation Rule Schemas ──

class AutomationRuleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    trigger_type: str = Field(min_length=1, max_length=50)
    conditions: Dict[str, Any] = Field(default_factory=dict)
    actions: List[Dict[str, Any]] = Field(default_factory=list)
    is_active: bool = True
    priority: int = 0
    use_ai_matching: bool = False
    ai_intent_prompt: Optional[str] = None

class AutomationRuleUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    trigger_type: Optional[str] = Field(None, max_length=50)
    conditions: Optional[Dict[str, Any]] = None
    actions: Optional[List[Dict[str, Any]]] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None
    use_ai_matching: Optional[bool] = None
    ai_intent_prompt: Optional[str] = None

class AutomationRuleResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    description: Optional[str] = None
    trigger_type: str
    conditions: Dict[str, Any]
    actions: List[Dict[str, Any]]
    is_active: bool
    priority: int
    use_ai_matching: bool
    ai_intent_prompt: Optional[str] = None
    hit_count: int
    last_triggered_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

# ── Macro Schemas ──

class MacroCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    shortcut: str = Field(min_length=1, max_length=50)
    body: str = Field(min_length=1, max_length=2000)
    category: Optional[str] = Field(None, max_length=100)
    attachments: List[Dict[str, Any]] = Field(default_factory=list)
    is_shared: bool = True

class MacroUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    shortcut: Optional[str] = Field(None, max_length=50)
    body: Optional[str] = Field(None, max_length=2000)
    category: Optional[str] = Field(None, max_length=100)
    attachments: Optional[List[Dict[str, Any]]] = None
    is_shared: Optional[bool] = None

class MacroResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    shortcut: str
    body: str
    category: Optional[str] = None
    attachments: List[Dict[str, Any]]
    is_shared: bool
    usage_count: int
    created_at: datetime

    model_config = {"from_attributes": True}

# ── Workflow Schemas ──

class WorkflowCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    graph: Dict[str, Any] = Field(default_factory=dict)
    trigger_type: str = Field(min_length=1, max_length=50)
    is_active: bool = True

class WorkflowUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    graph: Optional[Dict[str, Any]] = None
    trigger_type: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None
    version: Optional[int] = None

class WorkflowResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    description: Optional[str] = None
    graph: Dict[str, Any]
    trigger_type: str
    is_active: bool
    version: int
    last_run_at: Optional[datetime] = None
    run_count: int
    created_at: datetime

    model_config = {"from_attributes": True}

# ── Campaign Schemas ──

class CampaignCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=1, max_length=5000)
    audience_filters: Dict[str, Any] = Field(default_factory=dict)
    channel: str = "email"
    scheduled_at: Optional[datetime] = None

class CampaignUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    message: Optional[str] = Field(None, max_length=5000)
    audience_filters: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    channel: Optional[str] = None
    scheduled_at: Optional[datetime] = None

class CampaignResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    message: str
    audience_filters: Dict[str, Any]
    status: str
    channel: str
    scheduled_at: Optional[datetime] = None
    sent_count: int
    delivered_count: int
    opened_count: int
    replied_count: int
    created_at: datetime

    model_config = {"from_attributes": True}

# ── Automation Log Schemas ──

class AutomationLogResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    rule_id: Optional[uuid.UUID] = None
    workflow_id: Optional[uuid.UUID] = None
    event_type: str
    triggered_by: str
    input_snapshot: Dict[str, Any]
    result: str
    actions_executed: List[Dict[str, Any]]
    error_message: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

# ── Escalation Schemas ──

class EscalationRuleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    trigger_type: str
    keywords: List[str] = Field(default_factory=list)
    threshold_minutes: int = 30
    ai_frustration_enabled: bool = False
    frustration_sensitivity: float = 0.7
    action_assign_team: Optional[uuid.UUID] = None
    action_priority: str = "high"
    action_notify_emails: List[str] = Field(default_factory=list)
    is_active: bool = True

class EscalationRuleUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    trigger_type: Optional[str] = None
    keywords: Optional[List[str]] = None
    threshold_minutes: Optional[int] = None
    ai_frustration_enabled: Optional[bool] = None
    frustration_sensitivity: Optional[float] = None
    action_assign_team: Optional[uuid.UUID] = None
    action_priority: Optional[str] = None
    action_notify_emails: Optional[List[str]] = None
    is_active: Optional[bool] = None

class EscalationRuleResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    trigger_type: str
    keywords: List[str]
    threshold_minutes: int
    ai_frustration_enabled: bool
    frustration_sensitivity: float
    action_assign_team: Optional[uuid.UUID] = None
    action_priority: str
    action_notify_emails: List[str]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
