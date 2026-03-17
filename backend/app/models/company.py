"""
Company model — organization in the CRM.
"""

import uuid
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.contact import Contact
    from app.models.tag import Tag
    from app.models.workspace import Workspace


class Company(Base):
    __tablename__ = "companies"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("workspaces.id"), nullable=False
    )

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", lazy="selectin")
    contacts: Mapped[List["Contact"]] = relationship("Contact", back_populates="company", lazy="selectin")
    tags: Mapped[List["Tag"]] = relationship(
        "Tag", secondary="company_tags", back_populates="companies", lazy="selectin"
    )
