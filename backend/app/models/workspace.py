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
    ai_agent_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ai_custom_instructions: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    ai_tone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    company_description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    industry: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ai_settings: Mapped[dict | None] = mapped_column(JSON, default=dict, nullable=True)
    is_ai_enabled: Mapped[bool] = mapped_column(default=False, nullable=False)

    # ── Pro Widget Security ──
    public_key: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=True)
    encrypted_secret_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    encrypted_previous_secret_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    secret_key_created_at: Mapped[datetime | None] = mapped_column(nullable=True)
    previous_key_expires_at: Mapped[datetime | None] = mapped_column(nullable=True)
    allowed_domains: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

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
