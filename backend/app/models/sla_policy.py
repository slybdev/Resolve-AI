import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Column, ForeignKey, String, Table, Uuid, DateTime, func, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.workspace import Workspace
    from app.models.ticket import Ticket


class SLAPolicy(Base):
    __tablename__ = "sla_policies"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Applying to priority
    priority: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # critical, high, medium, low
    
    first_response_time: Mapped[int] = mapped_column(Integer, nullable=False) # minutes
    resolution_time: Mapped[int] = mapped_column(Integer, nullable=False) # minutes
    
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("workspaces.id"), nullable=False
    )
    
    team_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("teams.id"), nullable=True
    )

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", lazy="selectin")


class TicketSLATracking(Base):
    __tablename__ = "ticket_sla_tracking"

    ticket_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("tickets.id"), nullable=False
    )
    sla_policy_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("sla_policies.id"), nullable=False
    )
    
    first_response_due: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    resolution_due: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    
    first_response_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    first_response_breached: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    resolution_breached: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    ticket: Mapped["Ticket"] = relationship("Ticket", back_populates="sla_tracking", lazy="selectin")
    sla_policy: Mapped["SLAPolicy"] = relationship("SLAPolicy", lazy="selectin")
