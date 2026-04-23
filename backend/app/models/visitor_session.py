"""
VisitorSession model — tracks detailed engagement for anonymous and identified visitors.
"""

import uuid
from typing import TYPE_CHECKING, Optional
from datetime import datetime

from sqlalchemy import ForeignKey, String, Uuid, DateTime, Text, JSON, Integer, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.workspace import Workspace
    from app.models.contact import Contact


class VisitorSession(Base):
    __tablename__ = "visitor_sessions"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("workspaces.id"), nullable=False
    )
    visitor_id: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    session_id: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    
    contact_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("contacts.id"), nullable=True
    )
    
    # Engagement Tracking
    fingerprint: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    referrer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    landing_page: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Marketing / Attribution
    utm_source: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    utm_medium: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    utm_campaign: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Stats
    page_views: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    
    # Timestamps
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    identified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", lazy="selectin")
    contact: Mapped[Optional["Contact"]] = relationship("Contact", lazy="selectin")

    # Indexes
    __table_args__ = (
        Index("ix_visitor_sessions_v_s", "visitor_id", "session_id"),
    )
