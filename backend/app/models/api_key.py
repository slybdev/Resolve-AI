"""
APIKey model — for external integrations.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.workspace import Workspace


class APIKey(Base):
    __tablename__ = "api_keys"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    key_prefix: Mapped[str] = mapped_column(String(8), nullable=False)  # First few chars for identification
    hashed_key: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("workspaces.id"), nullable=False
    )

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", lazy="selectin")
