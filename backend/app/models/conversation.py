"""
Conversation model — handles chat threads with customers.
"""

import uuid
from typing import TYPE_CHECKING, Optional

import sqlalchemy as sa
from sqlalchemy import ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

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
    offline_state: Mapped[Optional[dict]] = mapped_column(sa.JSON, default=dict, nullable=True) # { "missing_fields": ["email"], "collected_data": {"name": "..."} }
    meta_data: Mapped[Optional[dict]] = mapped_column(sa.JSON, default=dict, nullable=True) # { "customer_name": "...", "visitor_id": "..." }

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", lazy="selectin")
    contact: Mapped[Optional["Contact"]] = relationship("Contact", lazy="selectin")
    assignee: Mapped[Optional["User"]] = relationship("User", lazy="selectin")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", lazy="selectin")
