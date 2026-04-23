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


class Contact(Base):
    __tablename__ = "contacts"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), index=True, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
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
    channel_data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", lazy="selectin")
    company: Mapped[Optional["Company"]] = relationship("Company", back_populates="contacts", lazy="selectin")
    tags: Mapped[List["Tag"]] = relationship(
        "Tag", secondary="contact_tags", back_populates="contacts", lazy="selectin"
    )
