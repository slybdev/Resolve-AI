import logging
import uuid
import asyncio
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.escalation import EscalationRule
from app.models.conversation import Conversation
from app.models.message import Message
from app.services.message_hooks import register_handler
from app.services.ai_service import AIService
from app.core.config import get_settings
from openai import AsyncOpenAI
from google import genai

logger = logging.getLogger(__name__)
settings = get_settings()

class EscalationService:
    def __init__(self):
        # Register for message reception to detect frustration
        register_handler(self.check_escalation_on_message)

    async def check_escalation_on_message(self, db: AsyncSession, message: Message):
        """
        Check for frustration in an incoming message and trigger escalation if needed.
        """
        if message.sender_type != "customer": return
        
        conversation = message.conversation
        workspace_id = conversation.workspace_id if conversation else message.conversation_id
        
        # 1. Find active escalation rules (AI Frustration or Keyword Match)
        result = await db.execute(
            select(EscalationRule)
            .where(
                EscalationRule.workspace_id == workspace_id,
                EscalationRule.is_active == True
            )
        )
        rules = result.scalars().all()

        for rule in rules:
            try:
                # 2. Check Keyword Match Trigger
                if rule.trigger_type == "keyword_match" and rule.keywords:
                    message_body = message.body.lower()
                    if any(kw.lower() in message_body for kw in rule.keywords):
                        logger.warning(f"Keyword Escalation triggered for workspace {workspace_id} (Keyword found in: {message.body[:50]}...)")
                        await self.trigger_escalation(db, rule, conversation, "keyword_match")
                        continue # Move to next rule

                # 3. Detect Frustration (AI Matching)
                if rule.ai_frustration_enabled:
                    frustration_level = await self._detect_frustration(message.body)
                    
                    if frustration_level >= rule.frustration_sensitivity:
                        logger.warning(f"Predictive Escalation triggered! Frustration level {frustration_level} > sensitivity {rule.frustration_sensitivity} for workspace {workspace_id}")
                        await self.trigger_escalation(db, rule, conversation, "ai_frustration")
            except Exception as e:
                logger.error(f"Error evaluating escalation for rule {rule.id}: {e}")

    async def check_sla_breaches(self, db: AsyncSession):
        """
        Background task to monitor SLA breaches for all open conversations.
        Called by a periodic task (ARQ/Celery).
        """
        # 1. Find active SLA rules
        result = await db.execute(select(EscalationRule).where(EscalationRule.trigger_type == "sla_breach", EscalationRule.is_active == True))
        rules = result.scalars().all()
        
        for rule in rules:
            # 2. Find open conversations in this workspace that haven't been replied to in X minutes
            pass # SLA logic implementation

    async def trigger_escalation(self, db: AsyncSession, rule: EscalationRule, conversation: Conversation, reason: str):
        """
        Executes the escalation actions defined in the rule.
        """
        logger.info(f"Escalating conversation {conversation.id} via rule {rule.id} (Reason: {reason})")
        
        # Action 1: Assign to team/agent
        if rule.action_assign_team:
            # conversation.team_id = rule.action_assign_team
            pass
            
        # Action 2: Bump Priority
        conversation.priority = rule.action_priority
        
        # Action 3: Notify via Email/WebSocket
        # email_service.notify(rule.action_notify_emails, conversation.id, reason)
        
        # Commit changes
        await db.commit()

    async def _detect_frustration(self, text: str) -> float:
        """
        AI frustration detection using AIService.
        """
        logger.info(f"AI Frustration Detection Request: Content='{text[:30]}...'")
        
        # Initialize clients (cached or ephemeral)
        openai_client = None
        if settings.OPENAI_API_KEY:
            openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        
        gemini_client = None
        if settings.GEMINI_API_KEY:
            gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)

        return await AIService.detect_frustration(
            text=text,
            openai_client=openai_client,
            gemini_client=gemini_client
        )

escalation_service = EscalationService()
