"""
Tag model and association tables for tagging CRM entities.
"""

import uuid
from typing import TYPE_CHECKING, List

from sqlalchemy import Column, ForeignKey, String, Table, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.contact import Contact
    from app.models.workspace import Workspace

# Association tables for many-to-many relationships
contact_tags = Table(
    "contact_tags",
    Base.metadata,
    Column("contact_id", Uuid, ForeignKey("contacts.id"), primary_key=True),
    Column("tag_id", Uuid, ForeignKey("tags.id"), primary_key=True),
)

company_tags = Table(
    "company_tags",
    Base.metadata,
    Column("company_id", Uuid, ForeignKey("companies.id"), primary_key=True),
    Column("tag_id", Uuid, ForeignKey("tags.id"), primary_key=True),
)


class Tag(Base):
    __tablename__ = "tags"

    name: Mapped[str] = mapped_column(String(50), nullable=False)
    color: Mapped[str] = mapped_column(String(7), default="#6366f1")  # Hex color code
    
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("workspaces.id"), nullable=False
    )

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", lazy="selectin")
    
    contacts: Mapped[List["Contact"]] = relationship(
        "Contact", secondary=contact_tags, back_populates="tags"
    )
    companies: Mapped[List["Company"]] = relationship(
        "Company", secondary=company_tags, back_populates="tags"
    )
