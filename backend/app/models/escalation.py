import uuid
from sqlalchemy import ForeignKey, JSON, String, Uuid, Boolean, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class EscalationRule(Base):
    __tablename__ = "escalation_rules"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("workspaces.id"), nullable=False
    )
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    trigger_type: Mapped[str] = mapped_column(String(50), nullable=False)  # sla_breach, ai_frustration, keyword_match, no_reply
    keywords: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    threshold_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)  # for SLA-based
    
    ai_frustration_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    frustration_sensitivity: Mapped[float] = mapped_column(Float, default=0.7, nullable=False)  # 0.0-1.0
    
    action_assign_team: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    action_priority: Mapped[str] = mapped_column(String(20), default="high", nullable=False)  # urgent, high, medium
    action_notify_emails: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    workspace = relationship("Workspace", backref="escalation_rules")
