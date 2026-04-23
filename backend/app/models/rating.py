"""
Rating model — stores customer feedback for agents and AI.
"""

import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, String, Integer, Text, Uuid, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.conversation import Conversation
    from app.models.ticket import Ticket
    from app.models.user import User
    from app.models.workspace import Workspace


class Rating(Base):
    __tablename__ = "ratings"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("conversations.id"), nullable=False
    )
    ticket_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("tickets.id"), nullable=True
    )
    agent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=True  # Nullable for AI ratings
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("workspaces.id"), nullable=False
    )

    # "agent" or "ai"
    rated_entity_type: Mapped[str] = mapped_column(
        String(20), default="agent", nullable=False
    )
    # e.g., "gpt-4", "claude-sonnet" — only set when rated_entity_type == "ai"
    ai_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    score: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    conversation: Mapped["Conversation"] = relationship("Conversation", lazy="selectin")
    ticket: Mapped[Optional["Ticket"]] = relationship("Ticket", lazy="selectin")
    agent: Mapped[Optional["User"]] = relationship("User", lazy="selectin")
    workspace: Mapped["Workspace"] = relationship("Workspace", lazy="selectin")

    # Indexes for analytics queries
    __table_args__ = (
        Index("ix_ratings_workspace_created", "workspace_id", "created_at"),
        Index("ix_ratings_agent_created", "agent_id", "created_at"),
        Index("ix_ratings_conversation", "conversation_id"),
        Index("ix_ratings_score", "score"),
    )
