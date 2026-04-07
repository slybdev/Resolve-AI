import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.automation import AutomationRule
from app.models.macro import Macro
from app.models.workflow import Workflow
from app.models.campaign import Campaign
from app.models.automation_log import AutomationLog
from app.models.escalation import EscalationRule
from app.models.user import User
from app.schemas.automation import (
    AutomationRuleCreate, AutomationRuleUpdate, AutomationRuleResponse,
    MacroCreate, MacroUpdate, MacroResponse,
    WorkflowCreate, WorkflowUpdate, WorkflowResponse,
    CampaignCreate, CampaignUpdate, CampaignResponse,
    AutomationLogResponse,
    EscalationRuleCreate, EscalationRuleUpdate, EscalationRuleResponse
)

router = APIRouter(prefix="/api/v1/automations", tags=["Automations"])

# ── Automation Rules ──

@router.get("/rules", response_model=List[AutomationRuleResponse])
async def list_rules(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(AutomationRule)
        .where(AutomationRule.workspace_id == workspace_id)
        .order_by(AutomationRule.priority.desc())
    )
    return result.scalars().all()

@router.post("/rules", response_model=AutomationRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_rule(
    workspace_id: uuid.UUID,
    rule_in: AutomationRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rule = AutomationRule(
        **rule_in.model_dump(), 
        workspace_id=workspace_id,
        created_by=current_user.id
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule

@router.patch("/rules/{rule_id}", response_model=AutomationRuleResponse)
async def update_rule(
    rule_id: uuid.UUID,
    rule_in: AutomationRuleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(AutomationRule).where(AutomationRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    update_data = rule_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(rule, key, value)
    
    await db.commit()
    await db.refresh(rule)
    return rule

@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(
    rule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(AutomationRule).where(AutomationRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    await db.delete(rule)
    await db.commit()
    return None

@router.post("/rules/{rule_id}/toggle", response_model=AutomationRuleResponse)
async def toggle_rule(
    rule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(AutomationRule).where(AutomationRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    rule.is_active = not rule.is_active
    await db.commit()
    await db.refresh(rule)
    return rule

@router.post("/simulate", response_model=Dict[str, Any])
async def simulate_automation(
    workspace_id: uuid.UUID,
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Simulates automation rules against a mock payload.
    Returns which rules would fire and why.
    """
    from app.services.rule_engine import rule_engine
    
    # In simulate mode, we ideally don't want to commit changes
    # But for a basic trace, we can run the evaluation logic
    result = await db.execute(
        select(AutomationRule)
        .where(AutomationRule.workspace_id == workspace_id, AutomationRule.is_active == True)
        .order_by(AutomationRule.priority.desc())
    )
    rules = result.scalars().all()
    
    trace = []
    for rule in rules:
        # Mocking the event context from payload
        match_info = await rule_engine.evaluate_rule(db, rule, None, payload) # Passing None for message
        trace.append({
            "rule_id": str(rule.id),
            "rule_name": rule.name,
            "matched": match_info["matched"],
            "reason": match_info.get("reason", "N/A"),
            "actions": rule.actions if match_info["matched"] else []
        })
        
    return {"trace": trace}

# ── Macros ──

@router.get("/macros", response_model=List[MacroResponse])
async def list_macros(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Macro).where(Macro.workspace_id == workspace_id))
    return result.scalars().all()

@router.post("/macros", response_model=MacroResponse, status_code=status.HTTP_201_CREATED)
async def create_macro(
    workspace_id: uuid.UUID,
    macro_in: MacroCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    macro = Macro(**macro_in.model_dump(), workspace_id=workspace_id)
    db.add(macro)
    await db.commit()
    await db.refresh(macro)
    return macro

@router.get("/macros/suggest", response_model=List[MacroResponse])
async def suggest_macros(
    workspace_id: uuid.UUID,
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AI-powered macro suggestions based on conversation context.
    """
    from app.services.ai_service import AIService
    
    # Use real AI generation logic
    return await AIService.generate_macro_suggestions(db, workspace_id, conversation_id)

@router.patch("/macros/{macro_id}", response_model=MacroResponse)
async def update_macro(
    macro_id: uuid.UUID,
    macro_in: MacroUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Macro).where(Macro.id == macro_id))
    macro = result.scalar_one_or_none()
    if not macro:
        raise HTTPException(status_code=404, detail="Macro not found")
    
    update_data = macro_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(macro, key, value)
    
    await db.commit()
    await db.refresh(macro)
    return macro

@router.delete("/macros/{macro_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_macro(
    macro_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Macro).where(Macro.id == macro_id))
    macro = result.scalar_one_or_none()
    if not macro:
        raise HTTPException(status_code=404, detail="Macro not found")
    
    await db.delete(macro)
    await db.commit()
    return None

# ── Workflows ──

@router.get("/workflows", response_model=List[WorkflowResponse])
async def list_workflows(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Workflow).where(Workflow.workspace_id == workspace_id))
    return result.scalars().all()

@router.post("/workflows", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    workspace_id: uuid.UUID,
    workflow_in: WorkflowCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workflow = Workflow(**workflow_in.model_dump(), workspace_id=workspace_id)
    db.add(workflow)
    await db.commit()
    await db.refresh(workflow)
    return workflow

@router.post("/workflows/{workflow_id}/restore/{version}", response_model=WorkflowResponse)
async def restore_workflow_version(
    workflow_id: uuid.UUID,
    version: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Restores a previous version of a workflow. 
    In a real system, we'd have a WorkflowVersion table.
    """
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    # Logic to fetch from history table and overwrite workflow.graph
    workflow.version = version
    await db.commit()
    return workflow

# ── Campaigns ──

@router.get("/campaigns", response_model=List[CampaignResponse])
async def list_campaigns(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Campaign).where(Campaign.workspace_id == workspace_id))
    return result.scalars().all()

@router.get("/campaigns/{campaign_id}/stats", response_model=Dict[str, Any])
async def get_campaign_stats(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    return {
        "sent": campaign.sent_count,
        "delivered": campaign.delivered_count,
        "opened": campaign.opened_count,
        "replied": campaign.replied_count,
        "open_rate": (campaign.opened_count / campaign.sent_count * 100) if campaign.sent_count > 0 else 0
    }

# ── Escalations ──

@router.get("/escalations/rules", response_model=List[EscalationRuleResponse])
async def list_escalation_rules(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(EscalationRule).where(EscalationRule.workspace_id == workspace_id))
    return result.scalars().all()

@router.post("/escalations/rules", response_model=EscalationRuleResponse)
async def create_escalation_rule(
    workspace_id: uuid.UUID,
    rule_in: EscalationRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rule = EscalationRule(**rule_in.model_dump(), workspace_id=workspace_id)
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule

@router.patch("/escalations/rules/{rule_id}", response_model=EscalationRuleResponse)
async def update_escalation_rule(
    rule_id: uuid.UUID,
    rule_in: EscalationRuleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(EscalationRule).where(EscalationRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    update_data = rule_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(rule, key, value)
    
    await db.commit()
    await db.refresh(rule)
    return rule

@router.delete("/escalations/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_escalation_rule(
    rule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(EscalationRule).where(EscalationRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    await db.delete(rule)
    await db.commit()
    return None

# ── Logs ──

@router.get("/logs", response_model=List[AutomationLogResponse])
async def list_logs(
    workspace_id: uuid.UUID,
    rule_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(AutomationLog).where(AutomationLog.workspace_id == workspace_id)
    if rule_id:
        query = query.where(AutomationLog.rule_id == rule_id)
    query = query.order_by(AutomationLog.created_at.desc()).limit(100)
    result = await db.execute(query)
    return result.scalars().all()
