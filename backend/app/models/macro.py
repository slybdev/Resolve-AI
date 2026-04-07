import uuid
from sqlalchemy import ForeignKey, String, Uuid, Integer, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Macro(Base):
    __tablename__ = "macros"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("workspaces.id"), nullable=False
    )
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    shortcut: Mapped[str] = mapped_column(String(50), nullable=False)
    body: Mapped[str] = mapped_column(String(2000), nullable=False)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    
    attachments: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    is_shared: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    usage_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    workspace = relationship("Workspace", backref="macros")
