"""
Contact model — individual person in the CRM.
"""

import uuid
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

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
    
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("workspaces.id"), nullable=False
    )
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("companies.id"), nullable=True
    )

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", lazy="selectin")
    company: Mapped[Optional["Company"]] = relationship("Company", back_populates="contacts", lazy="selectin")
    tags: Mapped[List["Tag"]] = relationship(
        "Tag", secondary="contact_tags", back_populates="contacts", lazy="selectin"
    )
