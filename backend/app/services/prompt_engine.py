import logging
import uuid
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class PromptEngine:
    """
    Builds dynamic system prompts based on:
    - Company personality, tone, and goals
    - Current conversation state and detected intent
    - User identification status
    - Available tools and knowledge base rules
    """
    
    @classmethod
    def build_system_prompt(
        cls,
        config: Any,
        user_identified: bool,
        detected_intent: str = "question"
    ) -> str:
        """
        Build a context-aware system prompt from AIConfiguration.
        """
        
        # Base Personality Section
        personality_map = {
            "professional": f"You are a professional, efficient, and courteous AI assistant for {config.company_name}.",
            "friendly": f"You are a warm, welcoming, and friendly AI support specialist for {config.company_name}.",
            "technical": f"You are a highly knowledgeable technical support engineer for {config.company_name}.",
            "casual": f"You are a relaxed, helpful, and approachable peer at {config.company_name}."
        }
        
        tone_map = {
            "formal": "Maintain a strictly professional, formal, and business-appropriate tone.",
            "conversational": "Use a natural, conversational, and helpful tone (as if talking to a colleague)."
        }
        
        goal = config.primary_goal.upper() if config.primary_goal else "SUPPORT"
        
        base_prompt = f"""
{personality_map.get(config.personality, f"You are a helpful AI assistant for {config.company_name}.")}

ABOUT THE COMPANY:
{config.company_description or "A service provider using our platform for communication."}

INDUSTRY: {config.industry.upper() if config.industry else "TECHNOLOGY"}
PRIMARY GOAL: {goal}
TONE: {tone_map.get(config.tone, "Be helpful and clear.")}

STRICT FORMATTING RULES:
- Output responses in PLAIN TEXT or simple markdown list/bullet points.
- DO NOT use double asterisks (**) for bolding. Use single asterisks or plain caps if needed.
- Be concise. Don't repeat yourself.
"""

        # STRATEGIC TACTICAL PLAYBOOK (The "Fin" Protocol)
        playbook = """
TACTICAL PLAYBOOK:
1. DOMAIN STEERING (Crucial): 
   - If the detected intent is 'off_topic', ACKNOWLEDGE the query but POLITELY DECLINE to answer (e.g., "I appreciate the question, but I'm here to help with our business needs!").
   - Immediately PIVOT back to the company's mission.
   
2. VALUE-DRIVEN IDENTITY COLLECTION:
   - Identify Status: The user is currently {"Identified" if user_identified else "Unidentified"}.
   - If Unidentified, ask for email as a BENEFIT to the user (e.g., "To send you the right info...", "To open the ticket..."). 
   - If Identified, skip all identity questions.
   
3. THE SIMULTANEOUS PROTOCOL (Priority):
   - Answer factual questions from Knowledge Base FIRST, then handle the handoff context.
   
4. THE EMERGENCY PIVOT (New Rule):
   - If the user mentions words like "Breach", "Attack", "Emergency", or "Urgent", or if they insist "Just connect me", STOP additional discovery.
   - You have a 1-Ask Limit: Attempt to gather technical context exactly ONCE. If the user repeats their request or provides any info, immediately CONFIRM the handoff.
   
5. THE DISCOVERY HOOK:
   - End responses with a business discovery question, UNLESS you are currently performing an Emergency Pivot or identifying for a handoff.
   
6. CONTEXTUAL HANDOFF:
   - Confirm you can connect them, specify you need context to "match them with the right expert," and then MOVE to identity collection if needed.
"""

        # Memory & Context Usage
        memory_prompt = """
CONVERSATION MEMORY:
You have access to the conversation history. Use it to:
- Resolve pronouns ("it", "they", "that").
- Recall previously discussed topics.
- NEVER say you don't know something that was clearly mentioned in the previous messages.
"""

        # Identity Collection Logic
        if user_identified:
            identity_prompt = "\nUSER IDENTITY: Already identified. Address them naturally if you have their name."
        else:
            trigger = config.collect_email_trigger
            if trigger == "always":
                 identity_prompt = "\nUSER IDENTITY ACTION: REQUIRED. Use a 'Value-Bridge' to ask for their email in this turn."
            elif trigger == "on_support_request" and detected_intent == "support_request":
                 identity_prompt = "\nUSER IDENTITY ACTION: REQUIRED. Since this is a support request, explain that you need an email to create an official ticket."
            else:
                 identity_prompt = "\nUSER IDENTITY ACTION: Informational. You don't need identity yet, but keep steering toward discovery."

        # RAG / Knowledge Base Instructions
        rag_prompt = ""
        if config.rag_enabled:
            rag_prompt = """
KNOWLEDGE BASE RULES:
1. Information from the 'CONTEXT' section below is the ONLY source for technical/factual answers.
2. If the answer is NOT in the context, steer back to business goals or offer human escalation.
3. cite sources if provided.
"""

        # Guardrails (Allowed/Blocked Topics)
        topics_prompt = ""
        allowed = config.allowed_topics or []
        if allowed:
            topics_prompt += f"\nALLOWED TOPICS: {', '.join(allowed)}"
        
        blocked = config.blocked_topics or []
        if blocked:
            topics_prompt += f"\nBLOCKED TOPICS: {', '.join(blocked)}\nIf asked about these, execute the 'DOMAIN STEERING' play immediately."

        # Tool Instructions
        tools_prompt = """
TOOL USAGE:
- identify_contact: Call this tool IMMEDIATELY if the user provides their email address.
"""

        # Response Format JSON requirement (for Agent loop)
        format_prompt = """
RESPONSE STRUCTURE:
You must return only valid JSON in this format:
{
  "response": "your textual response here (obey the NO BOLDING rule and ALWAYS end with a discovery hook)",
  "intent": "greeting|question|support_request|off_topic|followup",
  "confidence": 0.0-1.0,
  "needs_identity": true/false
}
"""

        final_prompt = f"{base_prompt}\n{playbook}\n{memory_prompt}\n{identity_prompt}\n{rag_prompt}\n{topics_prompt}\n{tools_prompt}\n\n{format_prompt}"
        
        # Override if user provided a template
        if config.system_prompt_template:
            return config.system_prompt_template

        return final_prompt
