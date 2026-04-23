"""
AIConfiguration model — handles workspace-specific AI settings, 
personality, RAG configuration, and tool availability.
"""

import uuid
from typing import TYPE_CHECKING, Optional, List

from sqlalchemy import ForeignKey, String, Uuid, Text, Boolean, Integer, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.workspace import Workspace


class AIConfiguration(Base):
    __tablename__ = "ai_configurations"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("workspaces.id"), nullable=False, unique=True
    )
    
    # Personality & Brand
    company_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    company_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    industry: Mapped[str] = mapped_column(String(100), default="saas")
    personality: Mapped[str] = mapped_column(String(50), default="professional") # professional, friendly, technical, casual
    tone: Mapped[str] = mapped_column(String(50), default="formal") # formal, conversational
    primary_goal: Mapped[str] = mapped_column(String(50), default="support") # support, sales, lead_gen
    
    # Messaging
    greeting_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fallback_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Data Collection Rules
    collect_email_trigger: Mapped[str] = mapped_column(String(50), default="on_support_request") # always, on_support_request, never
    collect_name_trigger: Mapped[str] = mapped_column(String(50), default="with_email") # always, with_email, never
    
    # Context & Memory
    max_context_messages: Mapped[int] = mapped_column(Integer, default=10)
    
    # RAG Configuration
    rag_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    rag_top_k: Mapped[int] = mapped_column(Integer, default=3)
    rag_min_similarity: Mapped[float] = mapped_column(Float, default=0.7)
    
    # Guardrails
    allowed_topics: Mapped[Optional[list]] = mapped_column(JSON, nullable=True) # ["pricing", "features", "support"]
    blocked_topics: Mapped[Optional[list]] = mapped_column(JSON, nullable=True) # ["politics", "religion"]
    escalation_keywords: Mapped[Optional[list]] = mapped_column(JSON, nullable=True) # ["speak to human", "urgent"]
    
    # Advanced
    system_prompt_template: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tools_enabled: Mapped[dict] = mapped_column(JSON, default=lambda: {"identify_contact": True, "create_ticket": True})
    
    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="ai_config")


# Add relationship to Workspace model (I will do this in the next step)
