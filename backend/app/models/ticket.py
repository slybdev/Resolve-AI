import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Column, ForeignKey, String, Table, Uuid, DateTime, func, Boolean, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.conversation import Conversation
    from app.models.team import Team
    from app.models.user import User
    from app.models.ticket_update import TicketUpdate
    from app.models.ticket_tag import TicketTag
    from app.models.sla_policy import TicketSLATracking


class Ticket(Base):
    __tablename__ = "tickets"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("conversations.id"), nullable=False
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("workspaces.id"), nullable=False
    )
    
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    status: Mapped[str] = mapped_column(
        String(50), default="open", nullable=False
    )  # open, in_progress, resolved, closed
    
    priority: Mapped[str] = mapped_column(
        String(50), default="medium", nullable=False
    )  # low, medium, high, critical
    
    assigned_team_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("teams.id"), nullable=True
    )
    
    assigned_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=True
    )
    
    assignment_status: Mapped[str] = mapped_column(
        String(50), default="none", nullable=False
    )  # none, pending, accepted, rejected
    
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=True
    )
    
    created_by_ai: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    ai_metadata: Mapped[dict | None] = mapped_column(JSON, default=dict, nullable=True)
    
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    conversation: Mapped["Conversation"] = relationship("Conversation", lazy="selectin")
    assigned_team: Mapped[Optional["Team"]] = relationship("Team", back_populates="tickets", lazy="selectin")
    assigned_user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assigned_user_id], lazy="selectin")
    creator: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by_id], lazy="selectin")
    
    updates: Mapped[List["TicketUpdate"]] = relationship(
        "TicketUpdate", back_populates="ticket", cascade="all, delete-orphan", lazy="selectin"
    )
    tags: Mapped[List["TicketTag"]] = relationship(
        "TicketTag", back_populates="ticket", cascade="all, delete-orphan", lazy="selectin"
    )
    
    sla_tracking: Mapped[Optional["TicketSLATracking"]] = relationship(
        "TicketSLATracking", back_populates="ticket", uselist=False, lazy="selectin"
    )
