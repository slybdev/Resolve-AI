import uuid
from datetime import datetime
from sqlalchemy import ForeignKey, JSON, String, Uuid, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class AutomationLog(Base):
    __tablename__ = "automation_logs"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("workspaces.id"), nullable=False
    )
    
    rule_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("automation_rules.id"), nullable=True
    )
    workflow_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("workflows.id"), nullable=True
    )
    
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    triggered_by: Mapped[str] = mapped_column(String(50), default="message", nullable=False)  # message, manual, schedule
    input_snapshot: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    
    result: Mapped[str] = mapped_column(String(50), nullable=False)  # matched, skipped, executed, failed
    
    actions_executed: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    error_message: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    # Relationships
    workspace = relationship("Workspace", backref="automation_logs")
    rule = relationship("AutomationRule", backref="logs")
    workflow = relationship("Workflow", backref="logs")
