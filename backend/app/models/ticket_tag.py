import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Column, ForeignKey, String, Table, Uuid, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.ticket import Ticket


class TicketTag(Base):
    __tablename__ = "ticket_tags"

    ticket_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("tickets.id"), nullable=False
    )
    tag_name: Mapped[str] = mapped_column(String(50), nullable=False) # billing, bug, etc.

    # Relationships
    ticket: Mapped["Ticket"] = relationship("Ticket", back_populates="tags", lazy="selectin")
