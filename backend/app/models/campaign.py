import uuid
from datetime import datetime
from sqlalchemy import ForeignKey, JSON, String, Uuid, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Campaign(Base):
    __tablename__ = "campaigns"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("workspaces.id"), nullable=False
    )
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(String(5000), nullable=False)
    
    audience_filters: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)  # draft, scheduled, running, paused, completed
    channel: Mapped[str] = mapped_column(String(50), default="email", nullable=False)
    
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    
    # Tracking & Analytics
    sent_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    delivered_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    opened_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    replied_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    workspace = relationship("Workspace", backref="campaigns")
