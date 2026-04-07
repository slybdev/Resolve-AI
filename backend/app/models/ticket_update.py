import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Column, ForeignKey, String, Table, Uuid, DateTime, func, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.ticket import Ticket
    from app.models.user import User


class TicketUpdate(Base):
    __tablename__ = "ticket_updates"

    ticket_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("tickets.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=True
    )
    
    update_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # status_change, note_added, priority_change, team_reassigned
    
    old_value: Mapped[str | None] = mapped_column(String(255), nullable=True)
    new_value: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    note: Mapped[str | None] = mapped_column(Text, nullable=True) # internal notes

    # Relationships
    ticket: Mapped["Ticket"] = relationship("Ticket", back_populates="updates", lazy="selectin")
    user: Mapped[Optional["User"]] = relationship("User", lazy="selectin")
