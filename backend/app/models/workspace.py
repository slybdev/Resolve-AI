import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, JSON, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Workspace(Base):
    __tablename__ = "workspaces"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    plan: Mapped[str] = mapped_column(String(50), default="free", nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False
    )
    ai_system_prompt: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    ai_tone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Relationships
    owner = relationship("User", back_populates="owned_workspaces", lazy="selectin")
    members = relationship(
        "WorkspaceMember", back_populates="workspace", lazy="selectin"
    )
    invites = relationship("Invite", back_populates="workspace", lazy="selectin")


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("workspaces.id"), nullable=False
    )
    role: Mapped[str] = mapped_column(
        String(50), default="member", nullable=False
    )  # owner, admin, member
    allowed_pages: Mapped[list] = mapped_column(
        JSON, default=list, nullable=True
    )  # empty list = full access (for owners/admins)

    # Relationships
    user = relationship("User", back_populates="memberships", lazy="selectin")
    workspace = relationship(
        "Workspace", back_populates="members", lazy="selectin"
    )
