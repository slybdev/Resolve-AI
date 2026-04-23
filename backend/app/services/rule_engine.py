import logging
import uuid
import re
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import select
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession
import json

from app.models.automation import AutomationRule
from app.models.automation_log import AutomationLog
from app.models.conversation import Conversation
from app.models.message import Message
from app.services.message_hooks import register_handler
from app.services.ai_service import AIService
from app.core.config import get_settings
from app.core.pubsub import pubsub_manager
from openai import AsyncOpenAI
from google import genai

logger = logging.getLogger(__name__)
settings = get_settings()

class RuleEngine:
    def __init__(self):
        # Register this service as a message handler
        register_handler(self.evaluate_automations)

    async def evaluate_automations(self, db: AsyncSession, message: Message):
        """
        The entry point for the Rule Engine, called by the message_hooks bridge.
        """
        conversation = message.conversation
        if not conversation:
            result = await db.execute(select(Conversation).where(Conversation.id == message.conversation_id))
            conversation = result.scalar_one_or_none()
        
        if not conversation:
            logger.error(f"RuleEngine: Conversation {message.conversation_id} not found")
            return

        workspace_id = conversation.workspace_id
        logger.info(f"RuleEngine: Evaluating automations for WS {workspace_id}, Msg: {message.id} ('{message.body[:20]}')")
        
        # 1. Get active rules
        result = await db.execute(
            select(AutomationRule)
            .where(
                AutomationRule.workspace_id == workspace_id,
                AutomationRule.trigger_type == "message_received",
                AutomationRule.is_active == True
            )
            .order_by(AutomationRule.priority.desc())
        )
        rules = result.scalars().all()
        logger.info(f"RuleEngine: Found {len(rules)} active rules to check.")

        for rule in rules:
            try:
                event = self._build_event_context(message, conversation)
                logger.debug(f"RuleEngine: Checking rule '{rule.name}' (ID: {rule.id})")
                
                # 2. Evaluate Rule
                match_result = await self.evaluate_rule(db, rule, message, event)
                
                if match_result["matched"]:
                    logger.info(f"RuleEngine: MATCH SUCCESS for rule '{rule.name}'!")
                    executed_actions = await self.execute_actions(db, rule.actions, event)
                    
                    await self.log_execution(db, workspace_id, rule.id, event, result="executed", actions=executed_actions)
                    
                    rule.hit_count += 1
                    rule.last_triggered_at = datetime.now()
                    logger.info(f"RuleEngine: Hit incremented for '{rule.name}'. Total hits: {rule.hit_count}")
                else:
                    logger.debug(f"RuleEngine: Match failed for '{rule.name}'. Reason: {match_result.get('reason')}")
                    
            except Exception as e:
                logger.exception(f"RuleEngine: Fatal error processing rule {rule.id}")
                await self.log_execution(db, workspace_id, rule.id, event, "failed", [], str(e))

        await db.commit()

    async def evaluate_rule(self, db: AsyncSession, rule: AutomationRule, message: Message, event: Dict[str, Any]) -> Dict[str, Any]:
        """ gate logic """
        # Gate 1: Standard Conditions
        standard_match = self.evaluate_conditions(rule.conditions, event)
        if not standard_match:
            return {"matched": False, "reason": f"standard_conditions_failed (Conditions: {rule.conditions})"}

        # Gate 2: AI Match (Optional)
        if rule.use_ai_matching:
            message_text = message.body if message else event.get("message", {}).get("body", "")
            ai_match = await self.ai_intent_match(rule.workspace_id, rule.ai_intent_prompt, message_text)
            if not ai_match:
                return {"matched": False, "reason": "ai_matching_failed"}

        return {"matched": True}

    def evaluate_conditions(self, conditions: Dict[str, Any], event: Dict[str, Any]) -> bool:
        if not conditions or (not conditions.get("all") and not conditions.get("any")):
            return True

        if "all" in conditions:
            return all(self.check_condition(c, event) for c in conditions["all"])
        if "any" in conditions:
            return any(self.check_condition(c, event) for c in conditions["any"])
        
        return True

    def check_condition(self, condition: Dict[str, Any], event: Dict[str, Any]) -> bool:
        field = condition.get("field")
        operator = condition.get("operator")
        value = condition.get("value")
        
        field_value = self.extract_field(event, field)
        if field_value is None:
            return False

        if operator == "equals":
            return str(field_value).lower() == str(value).lower()
        if operator == "contains":
            return str(value).lower() in str(field_value).lower()
        if operator == "regex":
            return bool(re.search(str(value), str(field_value), re.IGNORECASE))
        if operator == "gt":
            return float(field_value) > float(value)
        if operator == "lt":
            return float(field_value) < float(value)
        
        return False

    async def ai_intent_match(self, workspace_id: uuid.UUID, prompt: str, content: str) -> bool:
        """
        AI intent matching using AIService.
        """
        logger.info(f"AI Match Request: Prompt='{prompt}', Content='{content[:30]}...'")
        
        # Initialize clients (cached or ephemeral)
        openai_client = None
        if settings.OPENAI_API_KEY:
            openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        
        gemini_client = None
        if settings.GEMINI_API_KEY:
            gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)

        return await AIService.evaluate_rule_condition(
            workspace_id=workspace_id,
            prompt=prompt,
            text=content,
            openai_client=openai_client,
            gemini_client=gemini_client
        )

    def extract_field(self, event: Dict[str, Any], field_path: str) -> Any:
        if not field_path: return None
        parts = field_path.split(".")
        val = event
        for part in parts:
            if isinstance(val, dict):
                val = val.get(part)
            else:
                return None
        return val

    def _build_event_context(self, message: Message, conversation: Conversation) -> Dict[str, Any]:
        # Determine channel from message
        channel_name = "unknown"
        if message.channel_id and hasattr(message, 'channel') and message.channel:
            channel_name = message.channel.type.value if message.channel.type else "unknown"
        
        return {
            "message": {
                "id": str(message.id),
                "body": message.body or "",
                "type": message.message_type,
                "sender_type": message.sender_type
            },
            "conversation": {
                "id": str(conversation.id),
                "workspace_id": str(conversation.workspace_id),
                "status": conversation.status,
                "priority": conversation.priority,
                "channel": channel_name,
                "assigned_to": str(conversation.assigned_to) if conversation.assigned_to else None
            },
            "contact": {
                "id": str(conversation.contact_id) if conversation.contact_id else None,
                "name": conversation.contact.name if conversation.contact else "Anonymous"
            }
        }

    async def broadcast_ticket_update(self, db: AsyncSession, ticket_id: uuid.UUID, workspace_id: uuid.UUID, is_new: bool = False):
        """Helper to notify the dashboard of a ticket change via PubSub."""
        from app.services.ticket_service import TicketService
        ticket = await TicketService.get_ticket(db, ticket_id)
        if not ticket: return
        
        from app.schemas.ticket import TicketResponse
        ticket_data = TicketResponse.model_validate(ticket).model_dump()
        
        payload = {
            "type": "ticket.new" if is_new else "ticket.updated",
            "workspace_id": str(workspace_id),
            "ticket": ticket_data
        }
        await pubsub_manager.publish(f"ws:{workspace_id}", payload)
        logger.info(f"RuleEngine: Broadcasted {'creation' if is_new else 'update'} of ticket {ticket_id}")

    async def execute_actions(self, db: AsyncSession, actions: List[Dict[str, Any]], event: Dict[str, Any]) -> List[Dict[str, Any]]:
        executed = []
        for action in actions:
            action_type = action.get("type")
            try:
                if action_type == "add_tag":
                    await self.action_add_tag(db, event, action.get("value"))
                elif action_type == "assign_team":
                    await self.action_assign_team(db, event, action.get("value"))
                elif action_type == "assign_agent":
                    await self.action_assign_agent(db, event, action.get("value"))
                elif action_type == "send_message":
                    await self.action_send_message(db, event, action.get("value"))
                elif action_type == "set_priority":
                    await self.action_set_priority(db, event, action.get("value"))
                elif action_type == "close_conversation":
                    await self.action_close_conversation(db, event)
                elif action_type == "create_ticket":
                    logger.info(f"RuleEngine: Dispatching create_ticket with value type={type(action.get('value')).__name__}, value={action.get('value')}")
                    await self.action_create_ticket(db, event, action.get("value"))
                elif action_type == "send_template" or action_type == "send_message":
                    await self.action_send_message(db, event, action.get("value"))
                
                executed.append(action)
            except Exception as e:
                logger.exception(f"Rule Engine Action '{action_type}' failed")
                executed.append({**action, "error": str(e)})
        return executed

    async def log_execution(self, db: AsyncSession, workspace_id: uuid.UUID, rule_id: uuid.UUID, event: Dict[str, Any], result: str, actions: List[Dict[str, Any]], error: Optional[str] = None):
        log = AutomationLog(
            workspace_id=workspace_id,
            rule_id=rule_id,
            event_type="message_received",
            triggered_by="message",
            input_snapshot=event,
            result=result,
            actions_executed=actions,
            error_message=error
        )
        db.add(log)

    # ── Action Implementations ──

    async def action_add_tag(self, db: AsyncSession, event: Dict[str, Any], tag_name: Optional[str]):
        """Add a tag to the conversation's ticket (create tag if needed)."""
        if not tag_name:
            return
        conversation_id = self.extract_field(event, "conversation.id")
        workspace_id = self.extract_field(event, "conversation.workspace_id")
        if not conversation_id:
            return
        
        from app.models.ticket import Ticket
        from app.models.ticket_tag import TicketTag

        # Find ticket for this conversation
        result = await db.execute(
            select(Ticket).where(Ticket.conversation_id == uuid.UUID(conversation_id))
        )
        ticket = result.scalars().first()
        
        if ticket:
            # Check if tag already exists on this ticket
            existing = await db.execute(
                select(TicketTag).where(
                    TicketTag.ticket_id == ticket.id,
                    TicketTag.tag_name == tag_name.strip()
                )
            )
            if not existing.scalars().first():
                new_tag = TicketTag(ticket_id=ticket.id, tag_name=tag_name.strip())
                db.add(new_tag)
                logger.info(f"Action: Added tag '{tag_name}' to ticket {ticket.id}")
        else:
            logger.warning(f"Action add_tag: No ticket found for conversation {conversation_id}")

    async def action_assign_team(self, db: AsyncSession, event: Dict[str, Any], raw_team_value: Optional[str]):
        """Assign a ticket to a specific team. Support ID or Name lookup."""
        if not raw_team_value:
            return
        conversation_id = self.extract_field(event, "conversation.id")
        workspace_id = self.extract_field(event, "conversation.workspace_id")
        if not conversation_id or not workspace_id:
            return
            
        from app.models.ticket import Ticket
        from app.models.team import Team

        # Try to resolve team_id
        team_id = None
        try:
            team_id = uuid.UUID(raw_team_value)
        except ValueError:
            # Fallback: Look up by name
            res = await db.execute(
                select(Team).where(Team.name == raw_team_value, Team.workspace_id == uuid.UUID(workspace_id))
            )
            team = res.scalar_one_or_none()
            if team:
                team_id = team.id
                logger.info(f"Action: Resolved team name '{raw_team_value}' to ID {team_id}")
            else:
                logger.warning(f"Action assign_team: Could not resolve team '{raw_team_value}'")
                return

        # Find ticket for this conversation
        result = await db.execute(
            select(Ticket).where(Ticket.conversation_id == uuid.UUID(conversation_id))
        )
        ticket = result.scalars().first()
        
        if ticket:
            ticket.assigned_team_id = team_id
            db.add(ticket)
            logger.info(f"Action: Assigned ticket {ticket.id} to team {team_id}")
        else:
            logger.warning(f"Action assign_team: No ticket found for conversation {conversation_id} - cannot assign team")

    async def action_assign_agent(self, db: AsyncSession, event: Dict[str, Any], raw_agent_value: Optional[str]):
        """Assign a specific agent and switch to human mode. Support ID or Email lookup."""
        if not raw_agent_value:
            return
        conversation_id = self.extract_field(event, "conversation.id")
        workspace_id = self.extract_field(event, "conversation.workspace_id")
        if not conversation_id:
            return
            
        from app.models.user import User

        # Try to resolve agent_id
        agent_id = None
        try:
            agent_id = uuid.UUID(raw_agent_value)
        except ValueError:
            # Fallback: Look up by email
            res = await db.execute(
                select(User).where(User.email == raw_agent_value)
            )
            user = res.scalar_one_or_none()
            if user:
                agent_id = user.id
                logger.info(f"Action: Resolved agent email '{raw_agent_value}' to ID {agent_id}")
            else:
                logger.warning(f"Action assign_agent: Could not resolve agent '{raw_agent_value}'")
                return

        conv_result = await db.execute(
            select(Conversation).where(Conversation.id == uuid.UUID(conversation_id))
        )
        conv = conv_result.scalar_one_or_none()
        if conv:
            conv.assigned_to = agent_id
            conv.routing_mode = "human"
            db.add(conv)
            logger.info(f"Action: Assigned agent {agent_id} to conversation {conversation_id}, mode → human")

    async def action_send_message(self, db: AsyncSession, event: Dict[str, Any], message_text: Optional[str]):
        """Send an automated system/AI message to the conversation."""
        if not message_text:
            return
        conversation_id = self.extract_field(event, "conversation.id")
        workspace_id = self.extract_field(event, "conversation.workspace_id")
        if not conversation_id:
            return
        
        # Create the automated message
        auto_msg = Message(
            conversation_id=uuid.UUID(conversation_id),
            sender_type="ai",
            body=message_text,
            message_type="text"
        )
        db.add(auto_msg)
        await db.flush()
        
        # Broadcast to widget and dashboard
        from app.core.pubsub import pubsub_manager
        broadcast_payload = {
            "type": "message.new",
            "conversation_id": conversation_id,
            "workspace_id": workspace_id,
            "message": {
                "id": str(auto_msg.id),
                "body": auto_msg.body,
                "sender_type": "ai",
                "created_at": auto_msg.created_at.isoformat(),
            }
        }
        await pubsub_manager.publish(f"conv:{conversation_id}", broadcast_payload)
        if workspace_id:
            await pubsub_manager.publish(f"ws:{workspace_id}", broadcast_payload)
        
        logger.info(f"Action: Sent automated message to conversation {conversation_id}")

    async def action_set_priority(self, db: AsyncSession, event: Dict[str, Any], priority: Optional[str]):
        """Update the conversation's priority."""
        if not priority:
            return
            
        # Map 'normal' to 'medium' to align with Ticket model defaults
        if priority == "normal":
            priority = "medium"
            
        if priority not in ("low", "medium", "high", "urgent", "critical"):
            logger.warning(f"Action set_priority: Invalid priority '{priority}' ignored.")
            return
        conversation_id = self.extract_field(event, "conversation.id")
        if not conversation_id:
            return
        
        conv_result = await db.execute(
            select(Conversation).where(Conversation.id == uuid.UUID(conversation_id))
        )
        conv = conv_result.scalar_one_or_none()
        if conv:
            conv.priority = priority
            db.add(conv)
            logger.info(f"Action: Set priority of conversation {conversation_id} to '{priority}'")

    async def action_close_conversation(self, db: AsyncSession, event: Dict[str, Any]):
        """Close the conversation."""
        conversation_id = self.extract_field(event, "conversation.id")
        if not conversation_id:
            return
        
        conv_result = await db.execute(
            select(Conversation).where(Conversation.id == uuid.UUID(conversation_id))
        )
        conv = conv_result.scalar_one_or_none()
        if conv:
            conv.status = "closed"
            db.add(conv)
            logger.info(f"Action: Closed conversation {conversation_id}")

    async def action_create_ticket(self, db: AsyncSession, event: Dict[str, Any], raw_value = None):
        """Explicitly create a support ticket for the conversation if one doesn't exist."""
        conversation_id = self.extract_field(event, "conversation.id")
        workspace_id = self.extract_field(event, "conversation.workspace_id")
        if not conversation_id or not workspace_id:
            logger.warning("RuleEngine: action_create_ticket called without conversation_id or workspace_id")
            return
            
        from app.models.ticket import Ticket
        from app.models.team import Team

        # 1. Check if ticket already exists
        logger.info(f"RuleEngine: action_create_ticket checking for existing ticket in conv {conversation_id}...")
        result = await db.execute(
            select(Ticket).where(Ticket.conversation_id == uuid.UUID(conversation_id))
        )
        existing_ticket = result.scalars().first()
        
        # 2. Extract settings from raw_value (could be a dict from JSON column or a JSON string)
        title = None
        priority = "medium" # 'normal' removed, defaulting to 'medium'
        assigned_team_id = None
        
        if raw_value:
            data = None
            # Handle both dict (auto-deserialized from JSON column) and string
            if isinstance(raw_value, dict):
                data = raw_value
                logger.info(f"RuleEngine: raw_value is already a dict: {data}")
            elif isinstance(raw_value, str):
                try:
                    parsed = json.loads(raw_value)
                    if isinstance(parsed, dict):
                        data = parsed
                        logger.info(f"RuleEngine: Parsed raw_value JSON string: {data}")
                    else:
                        # Not a dict, treat as title
                        title = raw_value.strip()
                        logger.info(f"RuleEngine: raw_value is plain string, using as title: {title}")
                except (json.JSONDecodeError, ValueError) as e:
                    # Not valid JSON, treat as plain-text title
                    title = raw_value.strip() if raw_value.strip() else None
                    logger.info(f"RuleEngine: raw_value is not JSON, using as title: {title} (parse error: {e})")
            
            if data:
                title = data.get("title") or None
                
                # Priority Mapping: Remove 'normal', use 'medium'
                raw_priority = data.get("priority")
                if raw_priority:
                    priority = "medium" if str(raw_priority).lower() == "normal" else str(raw_priority).lower()
                
                # Robust Team Resolution (checks 'team_id' or 'team')
                raw_team = data.get("team_id") or data.get("team")
                if raw_team:
                    try:
                        team_uuid = uuid.UUID(str(raw_team))
                        assigned_team_id = team_uuid
                        logger.info(f"RuleEngine: Resolved team_id as UUID: {assigned_team_id}")
                    except (ValueError, TypeError):
                        # Fallback: name lookup (case-insensitive)
                        res = await db.execute(
                            select(Team).where(
                                sa.func.lower(Team.name) == str(raw_team).lower().strip(), 
                                Team.workspace_id == uuid.UUID(workspace_id)
                            )
                        )
                        team = res.scalar_one_or_none()
                        if team:
                            assigned_team_id = team.id
                            logger.info(f"RuleEngine: Resolved team name '{raw_team}' to ID {assigned_team_id}")
                        else:
                            logger.error(f"RuleEngine: Could not resolve team '{raw_team}' in workspace {workspace_id}")

        logger.info(f"RuleEngine: Parsed action config — title={title}, priority={priority}, team={assigned_team_id}")

        # 3. Handle Existing vs New
        from app.services.ticket_service import TicketService
        from app.schemas.ticket import TicketCreate

        if existing_ticket:
            logger.info(f"Action create_ticket: Ticket EXISTS (ID: {existing_ticket.id}). UPDATING metadata instead.")
            if title: existing_ticket.title = title
            if priority: existing_ticket.priority = priority
            if assigned_team_id: existing_ticket.assigned_team_id = assigned_team_id
            db.add(existing_ticket)
            await db.flush()
            
            # BROADCAST UPDATE
            await self.broadcast_ticket_update(db, existing_ticket.id, uuid.UUID(workspace_id), is_new=False)
            logger.info(f"Action: Updated existing ticket {existing_ticket.id}")
            return

        logger.info(f"RuleEngine: No existing ticket found for {conversation_id}. PROCEEDING TO CREATE.")
            
        # 4. Get conversation for context
        conv_result = await db.execute(
            select(Conversation).where(Conversation.id == uuid.UUID(conversation_id))
        )
        conv = conv_result.scalar_one_or_none()
        if not conv:
            logger.warning(f"RuleEngine: Conversation {conversation_id} not found, cannot create ticket")
            return

        # 5. Gate by Identity
        if not conv.identified:
            logger.info(f"RuleEngine: Identity check failed for action_create_ticket. Gating creation for conv {conversation_id}.")
            conv.pending_ticket_data = {
                "title": title or f"Ticket for: Web Visitor",
                "priority": priority,
                "assigned_team_id": str(assigned_team_id) if assigned_team_id else None,
                "created_by_ai": True
            }
            db.add(conv)
            
            # Optionally notify the user via a system message
            await self.action_send_message(db, event, "I'm setting up a support ticket for you. To complete the request and connect you with our team, please provide your name and email address.")
            return

        # 6. Create ticket
        ticket_in = TicketCreate(
            workspace_id=uuid.UUID(workspace_id),
            conversation_id=uuid.UUID(conversation_id),
            title=title or f"Ticket for: Web Visitor",
            priority=priority,
            status="open",
            assigned_team_id=assigned_team_id,
            created_by_ai=True
        )
        logger.info(f"RuleEngine: Creating ticket with payload: {ticket_in.model_dump()}")
        ticket = await TicketService.create_ticket(db, ticket_in, trigger_ai=True)
        
        # BROADCAST NEW TICKET
        await self.broadcast_ticket_update(db, ticket.id, uuid.UUID(workspace_id), is_new=True)
        logger.info(f"Action: Explicitly created ticket for conversation {conversation_id} (Title: {title}, Team: {assigned_team_id})")

def initialize_rule_engine():
    """Hook to ensure RuleEngine is instantiated and registered."""
    global rule_engine
    if 'rule_engine' not in globals() or rule_engine is None:
        rule_engine = RuleEngine()
    return rule_engine

rule_engine = None # Will be initialized by main.py

