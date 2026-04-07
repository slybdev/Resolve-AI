import uuid
import re
from typing import List, Optional, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.macro import Macro
from app.models.ticket import Ticket

class MacroService:
    @staticmethod
    async def list_macros(
        db: AsyncSession,
        workspace_id: uuid.UUID
    ) -> List[Macro]:
        """List all macros for a workspace."""
        result = await db.execute(
            select(Macro).where(Macro.workspace_id == workspace_id)
        )
        return result.scalars().all()

    @staticmethod
    async def resolve_macro(
        db: AsyncSession,
        macro_id: uuid.UUID,
        ticket_id: uuid.UUID,
        agent_name: str = "Agent"
    ) -> str:
        """
        Resolves a macro body by replacing variables with real data.
        Supported: {{customer.name}}, {{ticket.id}}, {{agent.name}}, {{workspace.name}}
        """
        from app.models.ticket import Ticket
        from app.models.workspace import Workspace
        
        macro = await db.get(Macro, macro_id)
        if not macro:
            return ""
            
        ticket = await db.get(Ticket, ticket_id)
        if not ticket:
            return macro.body
            
        workspace = await db.get(Workspace, ticket.workspace_id)
        
        body = macro.body
        
        # 1. Resolve Customer Name
        customer_name = "Customer"
        if ticket.conversation and ticket.conversation.contact:
            customer_name = ticket.conversation.contact.name or "Customer"
        elif ticket.conversation and ticket.conversation.meta_data:
            customer_name = ticket.conversation.meta_data.get("customer_name", "Customer")
            
        replacements = {
            r"\{\{customer.name\}\}": customer_name,
            r"\{\{ticket.id\}\}": f"#{str(ticket.id)[:8]}",
            r"\{\{agent.name\}\}": agent_name,
            r"\{\{workspace.name\}\}": workspace.name if workspace else "ResolveAI"
        }
        
        for pattern, value in replacements.items():
            body = re.sub(pattern, value, body, flags=re.IGNORECASE)
            
        return body

    @staticmethod
    async def create_macro(
        db: AsyncSession,
        workspace_id: uuid.UUID,
        name: str,
        shortcut: str,
        body: str,
        category: Optional[str] = "General"
    ) -> Macro:
        """Create a new operational macro."""
        macro = Macro(
            workspace_id=workspace_id,
            name=name,
            shortcut=shortcut if shortcut.startswith('/') else f"/{shortcut}",
            body=body,
            category=category
        )
        db.add(macro)
        await db.commit()
        await db.refresh(macro)
        return macro
