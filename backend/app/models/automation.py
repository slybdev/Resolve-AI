import uuid
from datetime import datetime
from sqlalchemy import ForeignKey, JSON, String, Uuid, Boolean, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class AutomationRule(Base):
    __tablename__ = "automation_rules"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("workspaces.id"), nullable=False
    )
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    
    trigger_type: Mapped[str] = mapped_column(String(50), nullable=False)  # message_received, conversation_created, etc.
    
    conditions: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    actions: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # AI Enhancements
    use_ai_matching: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ai_intent_prompt: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    # Tracking & Analytics
    created_by: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id"), nullable=True)
    hit_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_triggered_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    workspace = relationship("Workspace", backref="automation_rules")
    creator = relationship("User", foreign_keys=[created_by])
