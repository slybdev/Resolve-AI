"""
Message model — handles individual chat messages in a conversation.
"""

import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, String, Uuid, Text, UniqueConstraint, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.conversation import Conversation
    from app.models.user import User
    from app.models.channel import Channel


class Message(Base):
    __tablename__ = "messages"

    # DB-level deduplication: prevent the same external message from being stored twice per channel
    __table_args__ = (
        UniqueConstraint(
            "channel_id", "external_id",
            name="uq_channel_external_id",
        ),
    )

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("conversations.id"), nullable=False
    )
    
    sender_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("users.id"), nullable=True
    ) # If sent by agent
    
    sender_type: Mapped[str] = mapped_column(String(50), nullable=False) # agent, customer, ai, system
    body: Mapped[str] = mapped_column(Text, nullable=False)
    message_type: Mapped[str] = mapped_column(String(50), default="text", nullable=False) # text, image, file
    
    channel_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("channels.id"), nullable=True
    )
    external_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True) # Message ID in external channel
    is_read: Mapped[bool] = mapped_column(nullable=False, default=False)

    # Media Handling
    media_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    media_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True) # image, video, audio, file

    # Relationships
    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="messages", lazy="selectin")
    sender: Mapped[Optional["User"]] = relationship("User", lazy="selectin")
    channel: Mapped[Optional["Channel"]] = relationship("Channel", lazy="selectin")

    # Reasoning & Metadata
    intent: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, name="metadata", nullable=True)

