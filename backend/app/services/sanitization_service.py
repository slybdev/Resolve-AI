import re
import logging
from typing import List, Tuple

logger = logging.getLogger(__name__)

class SanitizationService:
    """
    Service for cleaning user input and RAG context.
    - Intent-based guardrails (pre-fitler).
    - Semantic density scoring for chunks.
    - Soft-filtering instead of hard-dropping.
    """

    # --- INPUT GUARDRAILS ---
    BLOCK_PATTERNS = [
        r"ignore previous instructions",
        r"ignore all rules",
        r"act as a",
        r"pretend to be",
        r"simulate a",
        r"roleplay as",
        r"disregard all previous",
        r"bypass your constraints",
        # Language-specific or sneaky variants
        r"respond casually as",
        r"forget your identity",
    ]

    @classmethod
    def sanitize_user_input(cls, text: str) -> str:
        """
        Scan and neutralize potential prompt injection attempts.
        Returns the original text if clean, or a softened version if blocked.
        """
        if not text:
            return ""

        original_text = text
        for pattern in cls.BLOCK_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                logger.warning(f"Detected potential prompt injection: '{pattern}' in user input.")
                # We don't just block the whole query; we neutralize the specific command.
                # E.g. "Ignore previous and tell me about Silas" -> " tell me about Silas"
                text = re.sub(pattern, "[COMMAND REMOVED]", text, flags=re.IGNORECASE)
        
        return text

    # --- CONTEXT SCORING (SOFT FILTERING) ---
    NAV_KEYWORDS = [
        "Welcome", "Click here", "Sign in", "Log in", "Navigation", 
        "Dashboard", "Menu", "Follow us", "Terms of use", "Privacy Policy",
        "Copyright", "All rights reserved", "Home |", "Contact |"
    ]

    @classmethod
    def score_and_filter_chunks(cls, chunks: List[Tuple[str, str]]) -> List[dict]:
        """
        Expert-level RAG context sanitization.
        Takes a list of tuples (content, doc_title).
        Returns a list of dicts with content and priority score.
        
        Scoring Logic:
        - 1.0: High Density (Normal)
        - 0.5: Medium Density (Supplemental - lists, steps, short sentences)
        - 0.0: Low Density (Drop - Nav junk)
        """
        processed_chunks = []

        for content, title in chunks:
            # 1. Clean navigation noise (line by line)
            lines = content.split('\n')
            clean_lines = []
            for line in lines:
                if any(kw.lower() in line.lower() for kw in cls.NAV_KEYWORDS):
                    continue
                clean_lines.append(line)
            
            clean_content = "\n".join(clean_lines).strip()
            if not clean_content:
                continue

            # 2. Calculate Semantic Density
            # Heuristic: Verb count + Length + Unique Word Ratio
            # We use a simple regex-based 'verb-like' check (words ending in ing, ed, es or common short verbs)
            # and verify if it looks like a menu (lots of pipes |, few sentences).
            
            words = clean_content.split()
            word_count = len(words)
            pipe_count = clean_content.count('|')
            unique_ratio = len(set(words)) / word_count if word_count > 0 else 0
            
            # Very short chunks or pipe-heavy items are likely nav junk
            if word_count < 5 or (pipe_count > 3 and word_count < 15):
                score = 0.0 # Drop
            elif word_count < 20 or unique_ratio < 0.4:
                # Potential list or steps (Low density but possibly high value)
                score = 0.5 # Supplemental
            else:
                score = 1.0 # High quality

            if score > 0:
                processed_chunks.append({
                    "content": clean_content,
                    "title": title,
                    "score": score
                })
        
        # Sort by score so high-quality context is at the top
        return sorted(processed_chunks, key=lambda x: x['score'], reverse=True)
