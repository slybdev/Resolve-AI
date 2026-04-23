import re
from typing import Tuple, List, Optional
import uuid
import logging

logger = logging.getLogger(__name__)

class IntentService:
    """
    Detects user intent with high accuracy.
    Uses pattern matching + transition-based rules.
    """
    
    # Intent patterns
    GREETING_PATTERNS = [
        r'\b(hi|hello|hey|good\s+(morning|afternoon|evening)|greetings)\b',
        r'\bhow\s+are\s+you\b',
        r'\bwhat\'?s\s+up\b'
    ]
    
    SUPPORT_PATTERNS = [
        r'\b(help|support|assist|problem|issue|trouble|error|broken|not\s+working|fail|login|access)\b',
        r'\bi\s+need\s+help\b',
        r'\bcan\s+you\s+help\b',
        r'\bhaving\s+(issues?|problems?|trouble)\b',
        # Human handoff patterns
        r'\b(speak|talk|connect|transfer)\s+(to|with)\s+(a\s+)?(human|agent|person|someone|representative|rep)\b',
        r'\b(real|actual|live)\s+(human|agent|person)\b',
        r'\bneed\s+a\s+(human|agent|person)\b',
        r'\bescalate\b',
        r'\bjust\s+connect\s+me\b'
    ]

    URGENT_SUPPORT_PATTERNS = [
        r'\b(breach|attack|incident|hacked|ransomware|emergency|critical|urgent|vulnerability|leak|stolen)\b',
        r'\bsecurity\s+(incident|emergency|breach)\b',
        r'\bincident\s+response\b'
    ]
    
    OFF_TOPIC_PATTERNS = [
        r'\b(weather|joke|story|politics|religion|sports|crypto|stocks)\b',
        r'\bwho\s+(is|was)\b(?!.*your\s+company|at\s+xentraldesk)',
        r'\btell\s+me\s+(a|about)\s+(joke|story)\b',
        r'\b(what\s+is|whats|calculate)\s+\d+\s*[\+\-\*\/x]\s*\d+\b', # Math: 9*9, 10+10
        r'\b(capital\s+of|meaning\s+of\s+life|time\s+is\s+it)\b',
        r'\b(poem|song|recipe)\b',
        r'\b(suicide|kill\s+myself|harm\s+myself|want\s+to\s+die)\b', # Explicit self-harm
        r'\b(hate\s+you|marry\s+me|date\s+me|do\s+you\s+love\s+me)\b', # Personal/Inappropriate
    ]
    
    QUESTION_PATTERNS = [
        r'\b(what|how|when|where|why|which|who)\b',
        r'\?$',  # Ends with question mark
        r'\b(explain|tell\s+me|show\s+me|describe|price|pricing|cost|offer)\b'
    ]

    @staticmethod
    def _matches_patterns(text: str, patterns: List[str]) -> bool:
        """Check if text matches any pattern."""
        return any(re.search(pattern, text, re.IGNORECASE) for pattern in patterns)

    @classmethod
    def detect_intent(
        cls, 
        message: str, 
        conversation_history: Optional[List[dict]] = None
    ) -> Tuple[str, float]:
        """
        Detect intent using pattern matching + context.
        
        Returns: (intent, confidence)
        """
        message_lower = message.lower().strip()
        
        # 1. Check for urgent support (highest priority)
        if cls._matches_patterns(message_lower, cls.URGENT_SUPPORT_PATTERNS):
            return ("support_request", 1.0) # Maximum confidence

        # 2. Check for greeting (high confidence if very short or contains key words)
        if cls._matches_patterns(message_lower, cls.GREETING_PATTERNS):
            # Special case: "Hi, I need help" -> Support Request takes priority usually
            if cls._matches_patterns(message_lower, cls.SUPPORT_PATTERNS):
                return ("support_request", 0.9)
            return ("greeting", 0.95)
        
        # 3. Check for support request (standard)
        if cls._matches_patterns(message_lower, cls.SUPPORT_PATTERNS):
            return ("support_request", 0.85)
        
        # 3. Check for off-topic (block early)
        if cls._matches_patterns(message_lower, cls.OFF_TOPIC_PATTERNS):
            return ("off_topic", 0.8)
        
        # 4. Check for followup (short message + conversation history)
        # Handle "the soc", "that one", "it", "tell me more"
        words = message_lower.split()
        if len(words) <= 3 and conversation_history and len(conversation_history) > 0:
            followup_indicators = ["the", "that", "it", "more", "and", "but", "what"]
            if any(w in words for w in followup_indicators):
                return ("followup", 0.75)
        
        # 5. Check for question
        if cls._matches_patterns(message_lower, cls.QUESTION_PATTERNS):
            return ("question", 0.8)
        
        # 6. Default to question/inquiry if unsure
        return ("question", 0.4)

    @classmethod
    def should_collect_identity(
        cls,
        intent: str,
        user_identified: bool,
        config: any
    ) -> bool:
        """
        Determine if we should ask for user identity now.
        'config' is an AIConfiguration object.
        """
        if user_identified:
            return False
        
        trigger = getattr(config, 'collect_email_trigger', 'on_support_request')
        
        if trigger == "never":
            return False
        
        if trigger == "always":
            # Ask on first meaningful interaction (not just a greeting)
            return intent != "greeting"
        
        if trigger == "on_support_request":
            return intent in ["support_request"]
        
        return False
