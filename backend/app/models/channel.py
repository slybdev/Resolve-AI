"""
Channel model — handles external communication channels.
"""

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum as SQLEnum, ForeignKey, JSON, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.workspace import Workspace


class ChannelType(str, enum.Enum):
    TELEGRAM = "telegram"
    DISCORD = "discord"
    SLACK = "slack"
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    WIDGET = "widget"
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"


class Channel(Base):
    __tablename__ = "channels"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[ChannelType] = mapped_column(
        SQLEnum(ChannelType, values_callable=lambda x: [e.value for e in x]), 
        nullable=False
    )
    config: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("workspaces.id"), nullable=False
    )

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", lazy="selectin")
