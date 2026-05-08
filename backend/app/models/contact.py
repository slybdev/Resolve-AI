"""
Contact model — individual person in the CRM.
"""

import uuid
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import ForeignKey, String, Uuid, JSON, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.tag import Tag
    from app.models.workspace import Workspace
    from app.models.user import User


class Contact(Base):
    __tablename__ = "contacts"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), index=True, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    timezone: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # CRM Status
    status: Mapped[str] = mapped_column(String(50), default="prospect", nullable=False)
    lifecycle_stage: Mapped[str] = mapped_column(String(50), default="lead", nullable=False)
    vip: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Activity
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_channel_used: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Metrics
    total_conversations: Mapped[int] = mapped_column(default=0, nullable=False)
    total_tickets: Mapped[int] = mapped_column(default=0, nullable=False)
    open_tickets_count: Mapped[int] = mapped_column(default=0, nullable=False)
    avg_response_time: Mapped[Optional[int]] = mapped_column(nullable=True)
    satisfaction_score: Mapped[Optional[float]] = mapped_column(nullable=True)
    lifetime_value: Mapped[float] = mapped_column(default=0.0, nullable=False)
    
    # Extensibility
    custom_fields: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    metadata_: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Tracking
    visitor_id: Mapped[Optional[str]] = mapped_column(String(255), index=True, nullable=True)
    
    # GDPR / Privacy
    consent_given: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    consent_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("workspaces.id"), nullable=False
    )
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("companies.id"), nullable=True
    )
    assigned_agent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=True
    )
    channel_data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", lazy="selectin")
    company: Mapped[Optional["Company"]] = relationship("Company", back_populates="contacts", lazy="selectin")
    assigned_agent: Mapped[Optional["User"]] = relationship("User", back_populates="assigned_contacts", lazy="selectin")
    tags: Mapped[List["Tag"]] = relationship(
        "Tag", secondary="contact_tags", back_populates="contacts", lazy="selectin"
    )
