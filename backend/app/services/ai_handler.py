import logging
import uuid
import asyncio
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.message import Message
from app.models.conversation import Conversation
from app.services.message_hooks import register_handler
from app.services.ai_service import AIService
from app.core.config import get_settings
from openai import AsyncOpenAI
from google import genai

logger = logging.getLogger(__name__)
settings = get_settings()

class AIHandler:
    def __init__(self):
        # Register this handler to be called for every new message
        register_handler(self.handle_message)

    async def handle_message(self, db: AsyncSession, message: Message):
        """
        The main automated response loop.
        """
        # 1. Skip if not from customer
        if message.sender_type != "customer":
            return
            
        # 2. Skip if it's a system/init message with no text
        if not message.body and message.message_type == "system":
            return

        conversation = message.conversation
        if not conversation:
            from sqlalchemy import select
            from app.models.workspace import Workspace
            result = await db.execute(select(Conversation, Workspace).join(Workspace, Workspace.id == Conversation.workspace_id).where(Conversation.id == message.conversation_id))
            row = result.first()
            if not row:
                logger.error(f"AIHandler: Conversation {message.conversation_id} not found.")
                return
            conversation, workspace = row
        else:
            from sqlalchemy import select
            from app.models.workspace import Workspace
            res = await db.execute(select(Workspace).where(Workspace.id == conversation.workspace_id))
            workspace = res.scalar_one_or_none()

        if not workspace:
            # AI is disabled for this workspace
            return

        # CRITICAL: Since this may be running inside a long-lived WebSocket session, 
        # we MUST actively refresh the workspace object to catch recent dashboard toggle changes.
        await db.refresh(workspace)

        if not workspace.is_ai_enabled:
            return

        # 3. Branch based on Routing Mode
        mode = conversation.routing_mode
        assignee_id = conversation.assigned_to
        
        # --- THE FINAL WALL OF DEFENSE ---
        # If an agent is assigned, AI Assistant MUST BE SILENT. 
        # No exceptions, regardless of mode column in DB.
        if assignee_id:
            logger.info(f"AIHandler: Managed by human agent ({assignee_id}). Silence absolute.")
            return

        if mode == "human":
            # Managed by agent, AI stays quiet
            logger.info(f"AIHandler: Conversation is in HUMAN mode. Skipping automated response.")
            return
            
        logger.info(f"AIHandler: Processing AI response (Mode: {mode}) for conversation {conversation.id}")
            
        # 4. Prepare AI Clients
        openai_client = None
        if settings.OPENAI_API_KEY:
            openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        
        gemini_client = None
        if settings.GEMINI_API_KEY:
            gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)

        response_text = None
        
        # --- Autonomous Escalation Evaluation ---
        ai_settings = workspace.ai_settings or {}
        should_escalate = False
        escalation_reason = ""
        user_text = message.body.lower()

        if ai_settings.get("escalateOnHandoff", True):
            is_handoff_intent = await AIService.evaluate_rule_condition(
                workspace.id,
                "The user is explicitly asking to speak to a human, a real person, an agent, a representative, or requesting to be escalated or transferred to customer support.",
                message.body,
                openai_client,
                gemini_client
            )
            if is_handoff_intent:
                should_escalate = True
                escalation_reason = "Customer explicitly requested human routing."

        if not should_escalate and ai_settings.get("highRiskKeywords", ""):
            risk_keywords = [k.strip().lower() for k in ai_settings["highRiskKeywords"].split(",") if k.strip()]
            if any(k in user_text for k in risk_keywords):
                should_escalate = True
                escalation_reason = "Customer message contained high-risk keyword."
        
        if not should_escalate and ai_settings.get("escalateOnSentiment", False):
            sentiment_score = await AIService.detect_frustration(message.body, openai_client, gemini_client)
            if sentiment_score >= 0.8:
                should_escalate = True
                escalation_reason = "High customer frustration detected."

        async def execute_escalation(reason: str, reply: str):
            logger.info(f"AIHandler: Triggering autonomous escalation. Reason: {reason}")
            try:
                triage_data = await AIService.analyze_ticket_triage(db, workspace.id, conversation.id)
                from app.schemas.ticket import TicketCreate
                from app.services.ticket_service import TicketService
                import uuid
                
                team_id = triage_data.get("suggested_team_id")
                # Ensure team_id is a valid UUID or None
                if team_id:
                    try:
                        team_id = uuid.UUID(str(team_id))
                    except:
                        team_id = None
                
                # FIX: Check for existing ticket to avoid DuplicateResults error in conversations.py
                ex_ticket = await TicketService.get_ticket_by_conversation(db, conversation.id)
                if not ex_ticket:
                    ticket_req = TicketCreate(
                        conversation_id=conversation.id,
                        workspace_id=workspace.id,
                        title=triage_data.get("suggested_title", "Escalated Support Request"),
                        summary=triage_data.get("summary", reason),
                        priority=triage_data.get("suggested_priority", "high"),
                        status="open",
                        assigned_team_id=team_id,
                        created_by_ai=True
                    )
                    await TicketService.create_ticket(db, obj_in=ticket_req, trigger_ai=False)
                else:
                    from app.schemas.ticket import TicketUpdate
                    
                    old_summary = ex_ticket.summary or ""
                    ai_triage_summary = triage_data.get("summary", reason)
                    new_summary = f"{old_summary}\n\n--- AI ESCALATION SUMMARY ---\n{ai_triage_summary}" if old_summary else ai_triage_summary
                    
                    update_req = TicketUpdate(
                        priority=triage_data.get("suggested_priority", "high"),
                        title=triage_data.get("suggested_title", ex_ticket.title),
                        summary=new_summary,
                        assigned_team_id=team_id,
                        status="open"
                    )
                    await TicketService.update_ticket(db, ex_ticket.id, update_req, user_id=None)
                    
                    from app.models.ticket_update import TicketUpdate as DBTicketUpdate
                    note = DBTicketUpdate(
                        ticket_id=ex_ticket.id,
                        user_id=None,
                        update_type="escalated",
                        note=f"AI automatically escalated conversation: {reason}",
                    )
                    db.add(note)
                
                conversation.routing_mode = "human"
                db.add(conversation)
                return reply
            except Exception as e:
                logger.error(f"Failed to smoothly execute escalation: {e}")
                return "I've notified my human team to step in."

        try:
            if should_escalate:
                response_text = await execute_escalation(escalation_reason, "I've escalated this issue to our team and opened a support ticket for you. An agent will follow up shortly.")
                
            elif mode == "offline_collection":
                # Execute Offline State Machine
                response_text = await AIService.process_offline_collection(
                    db=db,
                    conversation=conversation,
                    user_message=message.body,
                    openai_client=openai_client,
                    gemini_client=gemini_client
                )
            elif mode == "ai":
                # Execute Standard RAG Pipeline
                ai_res = await AIService.query(
                    db=db,
                    user_id=None, # System query
                    workspace_id=conversation.workspace_id,
                    query_text=message.body,
                    conversation_id=conversation.id
                )
                
                confidence = float(ai_res.get("confidence_score", 1.0))
                if ai_settings.get("escalateOnKBMiss", False) and confidence < 0.4:
                    response_text = await execute_escalation(
                        "Knowledge Base Miss (Low Confidence)", 
                        "I don't have that specific information, but I've escalated your issue and opened a priority support ticket for you. An agent will step in shortly."
                    )
                else:
                    response_text = ai_res.get("answer")
                    
                    # Respect Show Sources toggle
                    if ai_settings.get("showSources", True) and ai_res.get("sources"):
                        sources_list = []
                        seen_titles = set()
                        for s in ai_res.get("sources"):
                            if s["title"] not in seen_titles:
                                sources_list.append(s["title"])
                                seen_titles.add(s["title"])
                        
                        if sources_list:
                            sources_md = "\n\n**Sources:**\n"
                            for title in sources_list[:2]:
                                sources_md += f"- 📄 {title}\n"
                            response_text += sources_md
            
            if response_text:
                # 5. Create AI Message
                ai_message = Message(
                    conversation_id=conversation.id,
                    sender_type="ai",
                    body=response_text,
                    channel_id=message.channel_id,
                    message_type="text"
                )
                db.add(ai_message)
                # Flush to trigger secondary hooks and get IDs
                await db.flush()
                
                # 6. Broadcast to Widget & Dashboard
                from app.core.pubsub import pubsub_manager
                broadcast_payload = {
                    "type": "message.new",
                    "conversation_id": str(conversation.id),
                    "workspace_id": str(conversation.workspace_id),
                    "message": {
                        "id": str(ai_message.id),
                        "body": ai_message.body,
                        "sender_type": "ai",
                        "created_at": ai_message.created_at.isoformat(),
                    }
                }
                # Publish to conversation room (Widget)
                await pubsub_manager.publish(f"conv:{conversation.id}", broadcast_payload)
                # Publish to workspace room (Dashboard)
                await pubsub_manager.publish(f"ws:{conversation.workspace_id}", broadcast_payload)

                # Commit is handled by the primary caller (routing_service or websocket)
                logger.info(f"AIHandler: Sent and broadcasted automated response ({mode}) to conversation {conversation.id}")

        except Exception as e:
            logger.error(f"AIHandler: Automated response failed: {e}")
            import traceback
            logger.error(traceback.format_exc())

# Instantiate to register
ai_handler = AIHandler()
