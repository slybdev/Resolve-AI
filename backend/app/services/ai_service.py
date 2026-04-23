import logging
import uuid
import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from openai import AsyncOpenAI
from google import genai

from app.core.config import get_settings
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.team import Team
from app.models.knowledge import KnowledgeSource
from app.services.knowledge_service import KnowledgeService

logger = logging.getLogger(__name__)
settings = get_settings()

class AIService:
    IDENTITY_TOOL_DEFINITION = {
        "name": "identify_contact",
        "description": "Collects and saves the user's email address (and optionally their name) to their support profile. Only include the name if the user explicitly provided it.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "The user's full name. Only provide this if the user explicitly stated their name."},
                "email": {"type": "string", "description": "The user's email address"}
            },
            "required": ["email"]
        }
    }

    @staticmethod
    def _detect_simple_greeting(text: str) -> bool:
        """Fast heuristic check to prevent wasting LLM credits on simple greetings."""
        import re
        clean_text = re.sub(r'[^a-zA-Z0-9\s]', '', text.strip().lower())
        greetings = {"hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening", "howdy", "wassup", "sup"}
        return clean_text in greetings

    @staticmethod
    async def process_message(
        db: AsyncSession,
        workspace_id: uuid.UUID,
        conversation_id: uuid.UUID,
        user_text: str,
        openai_client: Optional[AsyncOpenAI] = None,
        gemini_client: Optional[genai.Client] = None
    ) -> str:
        """Main AI response loop with Memory, Intent, RAG and Tools."""
        from app.services.identity_service import IdentityService
        from app.services.intent_service import IntentService
        from app.services.prompt_engine import PromptEngine
        from app.models.ai_configuration import AIConfiguration
        from app.models.message import Message
        from app.models.conversation import Conversation

        # 1. Get Conversation first (to have access to workspace name)
        conv_result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
        conversation = conv_result.scalar_one_or_none()
        if not conversation:
            return "Internal error: Conversation not found."

        # 2. Get Configuration
        config_result = await db.execute(select(AIConfiguration).where(AIConfiguration.workspace_id == workspace_id))
        ai_config = config_result.scalar_one_or_none()
        
        # Fallback to sensible defaults if no config exists
        if not ai_config:
            ai_config = AIConfiguration(
                workspace_id=workspace_id,
                company_name=conversation.workspace.name if conversation.workspace else "this company",
                personality="professional",
                tone="formal"
            )

        # 2. Load Conversation History (Last 10 messages)
        history_result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(10)
        )
        history_objs = history_result.scalars().all()
        history = [{"role": "assistant" if m.sender_type in ["ai", "agent"] else "user", "content": m.body} for m in reversed(history_objs)]

        # 3. Detect Intent
        intent, confidence = IntentService.detect_intent(user_text, history)
        
        # Fast-track off-topic responses to ensure domain steering
        if intent == "off_topic":
             return {
                 "answer": f"I appreciate the inquiry, but I'm here to help with {ai_config.company_name} business needs! How may I assist you today?",
                 "intent": "off_topic",
                 "confidence": confidence,
                 "needs_identity": False,
                 "kb_chunks": []
             }
        
        # Fast-track simple greetings if configured to save tokens (optional but keeping for performance)
        if intent == "greeting" and AIService._detect_simple_greeting(user_text):
             return {
                 "answer": ai_config.greeting_message or "Hello! How can I assist you today?",
                 "intent": "greeting",
                 "confidence": 1.0,
                 "needs_identity": False,
                 "kb_chunks": []
             }

        # 4. RAG: Search Knowledge Base (if enabled and relevant)
        context = ""
        kb_chunks = []
        if ai_config.rag_enabled and intent in ["question", "support_request", "followup"]:
            kb_results = await KnowledgeService.search(db, workspace_id, user_text, limit=ai_config.rag_top_k)
            context = "\n".join([f"Source [{r['id']}]: {r['text']}" for r in kb_results])
            kb_chunks = [r['id'] for r in kb_results]

        # 5. Build Dynamic Prompt
        system_prompt = PromptEngine.build_system_prompt(
            config=ai_config,
            user_identified=conversation.identified,
            detected_intent=intent
        )
        
        if context:
            system_prompt += f"\n\nCONTEXT FROM KNOWLEDGE BASE:\n{context}"

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(history)
        messages.append({"role": "user", "content": user_text})

        # 6. LLM Call with Tool Support
        if openai_client:
            try:
                # Define tools - identify_contact is ALWAYS available for unidentified users
                tools = []
                if not conversation.identified:
                    tools.append({"type": "function", "function": AIService.IDENTITY_TOOL_DEFINITION})
                
                # CRITICAL: response_format json_object conflicts with tool_calls.
                # Only use json_object when no tools are available.
                call_kwargs = {
                    "model": "gpt-4o-mini",
                    "messages": messages,
                }
                if tools:
                    call_kwargs["tools"] = tools
                    call_kwargs["tool_choice"] = "auto"
                else:
                    call_kwargs["response_format"] = {"type": "json_object"}
                
                response = await openai_client.chat.completions.create(**call_kwargs)
                
                choice = response.choices[0].message
                
                # Handle Tool Calls
                logger.info(f"AIService: LLM responded. Tools offered: {bool(tools)}. Tool calls returned: {bool(choice.tool_calls)}. Has content: {bool(choice.content)}")
                if choice.tool_calls:
                    for tool_call in choice.tool_calls:
                        logger.info(f"AIService: TOOL CALL DETECTED: {tool_call.function.name}({tool_call.function.arguments})")
                        if tool_call.function.name == "identify_contact":
                            args = json.loads(tool_call.function.arguments)
                            logger.info(f"AIService: Executing identify_contact with email={args.get('email')}, name={args.get('name')}")
                            identity_svc = IdentityService(db)
                            await identity_svc.identify_contact(conversation_id, args.get("email"), name=args.get("name"))
                            logger.info(f"AIService: identify_contact completed successfully")
                            return {
                                "answer": f"Perfect! I've updated your info and opened a priority ticket for you. One of our agents will reach out to you at {args.get('email')} shortly.",
                                "intent": "support_request",
                                "confidence": 1.0,
                                "needs_identity": False,
                                "kb_chunks": []
                            }

                # Handle Response Content (may be JSON or plain text depending on whether tools were offered)
                content_raw = choice.content or ""
                answer = None
                response_intent = intent
                response_confidence = confidence
                
                if content_raw:
                    try:
                        content = json.loads(content_raw)
                        answer = content.get("response", content_raw)
                        response_intent = content.get("intent", intent)
                        response_confidence = content.get("confidence", confidence)
                    except json.JSONDecodeError:
                        # Plain text response (when tools were available, no json_object format)
                        answer = content_raw
                
                if not answer:
                    answer = "I'm sorry, I couldn't process that. Could you try rephrasing?"
                
                return {
                    "answer": answer,
                    "intent": response_intent,
                    "confidence": response_confidence,
                    "needs_identity": False,
                    "kb_chunks": kb_chunks
                }
            except Exception as e:
                logger.error(f"AIService upgraded loop error: {e}")
                return {
                    "answer": "I ran into a bit of trouble processing that. Could you try rephrasing?",
                    "intent": "error",
                    "confidence": 0.0
                }

        return "I'm sorry, my AI processing is temporarily unavailable."

        return "I'm sorry, my AI processing is temporarily unavailable."

    @staticmethod
    async def query(
        db: AsyncSession,
        user_id: uuid.UUID,
        workspace_id: uuid.UUID,
        query_text: str,
        conversation_id: Optional[uuid.UUID] = None,
        folder_id: Optional[uuid.UUID] = None
    ) -> Dict[str, Any]:
        """Performs a direct RAG query."""
        
        # --- PRE-PROCESS: Fast Heuristic Greeting Classifier ---
        if AIService._detect_simple_greeting(query_text):
            return {
                "answer": "Hello! How can I assist you with our services today?",
                "intent": "Greeting",
                "sources": [],
                "confidence_score": 1.0
            }

        # --- PRE-PROCESS: AI Intent Router ---
        # Catch complex greetings ("hi hello") or completely off-topic queries ("whats 9*9")
        # before we waste time/compute on a vector DB search.
        intent_type = "RELEVANT"
        if settings.OPENAI_API_KEY:
            try:
                openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                router_response = await openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {
                            "role": "system", 
                            "content": "You are a traffic router. Read the user's message. If it is purely a greeting or small talk, output exactly 'GREETING'. If it is a completely unrelated topic like generic math, history, or out-of-bounds tasks, output exactly 'OFF_TOPIC'. If it could be related to a company's products, profile, services, support, or pricing, output exactly 'RELEVANT'."
                        },
                        {"role": "user", "content": query_text}
                    ],
                    temperature=0.0,
                    max_tokens=10
                )
                intent_type = router_response.choices[0].message.content.strip().upper()
            except Exception as e:
                logger.error(f"Intent Classifier Router Failed: {e}")

        if "GREETING" in intent_type:
            return {
                "answer": "Hello! Welcome to our support desk. How can I assist you today?",
                "intent": "Greeting",
                "sources": [],
                "confidence_score": 1.0
            }
        elif "OFF_TOPIC" in intent_type:
            return {
                "answer": "I'm a dedicated support assistant for this company. I don't have the ability to answer out-of-scope questions like that. Is there anything regarding our business services I can help you with?",
                "intent": "Out of Scope",
                "sources": [],
                "confidence_score": 1.0
            }

        # --- Proceed to Standard RAG Pipeline ---
        # Note: KnowledgeService.vector_search expects user_id. For AI automated responses, we may need to pass a system user or adapt it.
        # However, for now let's pass user_id down.
        results_raw = await KnowledgeService.vector_search(db, workspace_id, user_id, query_text)
        results = [
            {"id": str(doc.id), "title": doc.title, "text": chunk.content, "score": 1.0}
            for chunk, doc in results_raw
        ]

        
        if not results:
            return {
                "answer": "I couldn't find any information on that in our knowledge base.", 
                "sources": [],
                "confidence_score": 0.0
            }

        context = "\n".join([r['text'] for r in results])
        
        system_prompt = f"""You are a helpful knowledge base assistant. Answer the user's question based strictly on the provided context. If the answer cannot be found in the context, politely state that.
        
You must output ONLY valid JSON in the exact following format:
{{
  "answer": "your detailed conversational response here",
  "intent": "Short classification of the user's intent (e.g., Greeting, Inquiry, Support Request, Clarification)"
}}

CONTEXT:
{context}
"""
        # Debug logging for terminal visibility
        logger.info("\n========== AI PROMPT DUMP ==========")
        logger.info(f"SYSTEM PROMPT:\n{system_prompt}")
        logger.info(f"USER QUERY:\n{query_text}")
        logger.info("====================================")

        answer = "I'm sorry, I could not generate a response at this time."
        intent = "Undetermined"
        try:
            if settings.OPENAI_API_KEY:
                openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                response = await openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": query_text}
                    ],
                    temperature=0.3,
                    response_format={"type": "json_object"}
                )
                raw_text = response.choices[0].message.content
                try:
                    # Clean markdown code block formatting if present
                    if raw_text.startswith("```json"):
                        raw_text = raw_text.split("```json")[1].split("```")[0].strip()
                    elif raw_text.startswith("```"):
                        raw_text = raw_text.split("```")[1].split("```")[0].strip()
                        
                    parsed = json.loads(raw_text)
                    answer = parsed.get("answer", raw_text)
                    intent = parsed.get("intent", "Undetermined")
                except json.JSONDecodeError:
                    answer = raw_text
                    
            elif settings.GEMINI_API_KEY:
                # Fallback to Gemini if OpenAI isn't configured
                gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
                response = await asyncio.to_thread(
                    gemini_client.models.generate_content,
                    model='gemini-2.5-flash',
                    contents=f"{system_prompt}\n\nUser Question: {query_text}"
                )
                raw_text = response.text
                try:
                    if raw_text.startswith("```json"):
                        raw_text = raw_text.split("```json")[1].split("```")[0].strip()
                    elif raw_text.startswith("```"):
                        raw_text = raw_text.split("```")[1].split("```")[0].strip()
                        
                    parsed = json.loads(raw_text)
                    answer = parsed.get("answer", raw_text)
                    intent = parsed.get("intent", "Undetermined")
                except json.JSONDecodeError:
                    answer = raw_text
            else:
                answer = "AI generation is not configured. Please set an API key."
        except Exception as e:
            logger.error(f"Error generating RAG answer: {e}")
            answer = "Sorry, an error occurred while connecting to the AI provider."
        
        return {
            "answer": answer,
            "intent": intent,
            "sources": [{"document_id": r["id"], "title": r.get("title", "Document"), "score": r.get("score")} for r in results],
            "confidence_score": 0.85
        }

    @staticmethod
    async def evaluate_rule_condition(
        workspace_id: uuid.UUID,
        prompt: str,
        text: str,
        openai_client: Optional[AsyncOpenAI] = None,
        gemini_client: Optional[genai.Client] = None
    ) -> bool:
        """Evaluates a natural language rule condition."""
        if not openai_client: return False
        
        sys_msg = f"You are a logic gate. Evaluate if the following text matches this intent: '{prompt}'. Reply ONLY with 'YES' or 'NO'."
        try:
            res = await openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "system", "content": sys_msg}, {"role": "user", "content": text}]
            )
            return res.choices[0].message.content.strip().upper() == "YES"
        except:
            return False

    @staticmethod
    async def analyze_ticket_triage(db: AsyncSession, workspace_id: uuid.UUID, conversation_id: uuid.UUID) -> Dict[str, Any]:
        """Summarizes a conversation and suggests the best team for assignment."""
        # 1. Fetch recent messages
        stmt = select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at.desc()).limit(15)
        res = await db.execute(stmt)
        msg_objs = res.scalars().all()
        history = "\n".join([f"{m.sender_type}: {m.body}" for m in reversed(msg_objs)])

        # 2. Fetch available teams
        team_stmt = select(Team).where(Team.workspace_id == workspace_id)
        team_res = await db.execute(team_stmt)
        teams = team_res.scalars().all()
        team_list = "\n".join([f"- {t.name} (ID: {t.id}): {t.description or 'No description'}" for t in teams])

        # 3. Prompt LLM to analyze and pick
        settings = get_settings()
        if not settings.OPENAI_API_KEY:
             return {"suggested_title": "Automated Escalation", "suggested_priority": "medium", "summary": "Manual Keyword Trigger", "suggested_team_id": None}
        
        openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        
        prompt = f"""
You are an expert cybersecurity and support triage agent. Analyze the conversation history and pick the SINGLE MOST RELEVANT team.

CRITICAL INSTRUCTIONS:
- You MUST pick exactly ONE team from the list below. Never return null for suggested_team_id.
- If no team is a perfect match, pick the CLOSEST match.
- If you detect an ongoing "Attack", "Breach", "Hacking", or "Ransomware" event, you MUST set suggested_priority to 'urgent'.
- The "summary" MUST be a detailed technical debrief of what the user reported, so the human agent doesn't have to ask again.

AVAILABLE TEAMS:
{team_list if teams else "No specific teams found. Use default."}

CONVERSATION HISTORY:
{history}

OUTPUT ONLY VALID JSON:
{{
  "suggested_title": "Concise & professional title",
  "suggested_priority": "low|medium|high|urgent",
  "summary": "Detailed technical debrief (2-4 sentences)",
  "suggested_team_id": "the UUID of the best team",
  "suggested_team_name": "the name of the best team"
}}
"""
        try:
            res = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "system", "content": prompt}],
                response_format={"type": "json_object"}
            )
            data = json.loads(res.choices[0].message.content)
            
            # Final validation of team_id
            suggested_id = data.get("suggested_team_id")
            if suggested_id and suggested_id != "null":
                try:
                    # Validate it's a real UUID but STORE as string for JSON serialization
                    valid_uuid = uuid.UUID(str(suggested_id))
                    data["suggested_team_id"] = str(valid_uuid)
                except:
                    data["suggested_team_id"] = None
            else:
                data["suggested_team_id"] = None
            
            # FALLBACK: If LLM didn't pick a team but teams exist, pick the first one
            if not data["suggested_team_id"] and teams:
                data["suggested_team_id"] = str(teams[0].id)
                data["suggested_team_name"] = teams[0].name
                logger.warning(f"AI Triage: LLM returned no team. Falling back to first team: {teams[0].name}")
            
            return data
        except Exception as e:
            logger.error(f"Error in ticket triage analysis: {e}")
            # Even on error, try to assign the first team
            fallback_team_id = str(teams[0].id) if teams else None
            fallback_team_name = teams[0].name if teams else None
            return {
                "suggested_title": "Support Request",
                "suggested_priority": "medium",
                "summary": "The customer requested engineering/support assistance.",
                "suggested_team_id": fallback_team_id,
                "suggested_team_name": fallback_team_name
            }

    @staticmethod
    async def detect_handoff_intent(text: str, openai_client: Optional[AsyncOpenAI] = None, gemini_client: Optional[genai.Client] = None) -> bool:
        """Determines if the user wants a human."""
        keywords = ["human", "agent", "person", "manager", "representative", "help me please"]
        return any(k in text.lower() for k in keywords)

    @staticmethod
    async def detect_frustration(text: str, openai_client: Optional[AsyncOpenAI] = None, gemini_client: Optional[genai.Client] = None) -> float:
        """Detects customer frustration (0.0 to 1.0)."""
        angry_words = ["angry", "upset", "terrible", "bad", "hate", "worst", "broken"]
        if any(w in text.lower() for w in angry_words):
            return 0.9
        return 0.1
