import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import Column, ForeignKey, String, Table, Uuid, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.workspace import Workspace
    from app.models.ticket import Ticket


class Team(Base):
    __tablename__ = "teams"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("workspaces.id"), nullable=False
    )
    
    allowed_pages: Mapped[list] = mapped_column(
        JSON, default=list, nullable=True
    )

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", lazy="selectin")
    members: Mapped[List["TeamMember"]] = relationship(
        "TeamMember", back_populates="team", cascade="all, delete-orphan", lazy="selectin"
    )
    tickets: Mapped[List["Ticket"]] = relationship(
        "Ticket", back_populates="assigned_team", lazy="selectin"
    )


class TeamMember(Base):
    __tablename__ = "team_members"

    team_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("teams.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=False
    )
    role: Mapped[str] = mapped_column(
        String(50), default="member", nullable=False
    )  # member, lead

    # Relationships
    team: Mapped["Team"] = relationship("Team", back_populates="members", lazy="selectin")
    user: Mapped["User"] = relationship("User", lazy="selectin")
