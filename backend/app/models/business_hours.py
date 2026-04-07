"""
BusinessHours model — workspace-level operating hours.
"""

import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, Integer, String, Time, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.workspace import Workspace


class BusinessHours(Base):
    __tablename__ = "business_hours"

    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    open_time: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # "HH:MM:SS"
    close_time: Mapped[Optional[str]] = mapped_column(String(10), nullable=True) # "HH:MM:SS"
    is_closed: Mapped[bool] = mapped_column(default=False)
    
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("workspaces.id"), nullable=False
    )

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", lazy="selectin")
