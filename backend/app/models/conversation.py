"""
Conversation model — handles chat threads with customers.
"""

import uuid
from typing import TYPE_CHECKING, Optional

import sqlalchemy as sa
from sqlalchemy import ForeignKey, String, Uuid, DateTime, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.workspace import Workspace
    from app.models.contact import Contact
    from app.models.user import User


class Conversation(Base):
    __tablename__ = "conversations"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("workspaces.id"), nullable=False
    )
    contact_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("contacts.id"), nullable=True
    )
    
    status: Mapped[str] = mapped_column(String(50), default="open", nullable=False) # open, closed, snoozed
    priority: Mapped[str] = mapped_column(String(50), default="normal", nullable=False) # low, normal, high, urgent
    
    assigned_to: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=True
    )
    
    # Pro Routing Fields
    routing_mode: Mapped[str] = mapped_column(String(50), default="ai", nullable=False) # ai, human, offline_collection
    # Session & Identity Tracking
    visitor_id: Mapped[Optional[str]] = mapped_column(String(255), index=True, nullable=True)
    session_id: Mapped[Optional[str]] = mapped_column(String(255), index=True, nullable=True)
    
    identified: Mapped[bool] = mapped_column(sa.Boolean, default=False, nullable=False)
    identified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Verification Flow (for email claim/collision prevention)
    pending_verification: Mapped[bool] = mapped_column(sa.Boolean, default=False, nullable=False)
    claimed_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    claimed_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    offline_state: Mapped[Optional[dict]] = mapped_column(sa.JSON, default=dict, nullable=True) # { "missing_fields": ["email"], "collected_data": {"name": "..."} }
    pending_ticket_data: Mapped[Optional[dict]] = mapped_column(sa.JSON, default=None, nullable=True)
    meta_data: Mapped[Optional[dict]] = mapped_column(sa.JSON, default=dict, nullable=True) # { "customer_name": "...", "visitor_id": "..." }

    # Session Management
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Multi-Channel Tracking
    primary_channel: Mapped[str] = mapped_column(String(50), default="widget", nullable=False)
    channels_used: Mapped[Optional[list]] = mapped_column(sa.JSON, default=list, nullable=True)
    external_conversation_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Indexes
    __table_args__ = (
        Index("ix_conversations_updated_desc", "updated_at"),
    )

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", lazy="selectin")
    contact: Mapped[Optional["Contact"]] = relationship("Contact", lazy="selectin")
    assignee: Mapped[Optional["User"]] = relationship("User", lazy="selectin")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", lazy="selectin")
