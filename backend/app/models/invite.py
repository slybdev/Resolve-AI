"""
Invite model — team invitation system for workspaces.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, JSON, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Invite(Base):
    __tablename__ = "invites"

    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("workspaces.id"), nullable=False
    )
    invited_by: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False
    )
    token: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    role: Mapped[str] = mapped_column(String(50), default="member", nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), default="pending", nullable=False
    )  # pending, accepted, expired
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    allowed_pages: Mapped[list] = mapped_column(
        JSON, default=list, nullable=True
    )
    
    team_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("teams.id"), nullable=True
    )

    # Relationships
    workspace = relationship("Workspace", back_populates="invites", lazy="selectin")
    inviter = relationship("User", lazy="selectin")
