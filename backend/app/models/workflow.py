import uuid
from datetime import datetime
from sqlalchemy import ForeignKey, JSON, String, Uuid, Boolean, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Workflow(Base):
    __tablename__ = "workflows"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("workspaces.id"), nullable=False
    )
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    
    graph: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    trigger_type: Mapped[str] = mapped_column(String(50), nullable=False)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    run_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    workspace = relationship("Workspace", backref="workflows")
