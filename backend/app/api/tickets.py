import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.ticket import (
    TicketCreate, 
    TicketUpdate, 
    TicketResponse, 
    TicketUpdateResponse, 
    TicketNoteCreate,
    TicketBulkUpdate,
    TicketEscalate
)
from app.services.ticket_service import TicketService
from app.services.macro_service import MacroService
from app.schemas.macro import MacroResponse

router = APIRouter(prefix="/api/v1/tickets", tags=["Tickets"])

@router.get("/{workspace_id}/macros", response_model=List[MacroResponse])
async def list_macros(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List available macros for the workspace."""
    return await MacroService.list_macros(db, workspace_id)


@router.post("/", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    ticket_in: TicketCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new ticket."""
    # Ensure user has access to workspace
    # (In a real app, we'd have a check_workspace_access dependency)
    return await TicketService.create_ticket(db, ticket_in)


@router.get("/{workspace_id}", response_model=List[TicketResponse])
async def list_tickets(
    workspace_id: uuid.UUID,
    team_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    assigned_user_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List tickets for a workspace with optional filters, respecting team isolation."""
    return await TicketService.list_tickets(
        db, 
        workspace_id, 
        team_id, 
        status, 
        user_id=current_user.id, 
        is_admin=current_user.is_superuser,
        assigned_user_id=assigned_user_id
    )


@router.post("/{ticket_id}/notes", response_model=TicketUpdateResponse)
async def add_ticket_note(
    ticket_id: uuid.UUID,
    note_in: TicketNoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add an internal note/comment to a ticket."""
    return await TicketService.add_note(db, ticket_id, current_user.id, note_in.note)


@router.get("/detail/{ticket_id}", response_model=TicketResponse)
async def get_ticket_detail(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get full ticket details including tags and updates."""
    ticket = await TicketService.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.patch("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: uuid.UUID,
    ticket_in: TicketUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a ticket and log changes."""
    ticket = await TicketService.update_ticket(db, ticket_id, ticket_in, user_id=current_user.id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket
@router.post("/{ticket_id}/analyze", response_model=TicketResponse)
async def analyze_ticket(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger AI triage analysis for a ticket."""
    ticket = await TicketService.perform_ai_triage(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.post("/{ticket_id}/claim", response_model=TicketResponse)
async def claim_ticket(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Claim a ticket for the current user."""
    ticket = await TicketService.claim_ticket(db, ticket_id, current_user.id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.post("/{workspace_id}/bulk")
async def bulk_update_tickets(
    workspace_id: uuid.UUID,
    obj_in: TicketBulkUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bulk update multiple tickets."""
    count = await TicketService.bulk_update_tickets(
        db, 
        obj_in.ticket_ids, 
        workspace_id,
        status=obj_in.status,
        assigned_team_id=obj_in.assigned_team_id,
        priority=obj_in.priority
    )
    return {"updated": count}
    

@router.get("/conversation/{conversation_id}", response_model=Optional[TicketResponse])
async def get_ticket_by_conversation(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check if a ticket exists for a conversation and return it if it does."""
    return await TicketService.get_ticket_by_conversation(db, conversation_id)


@router.post("/{ticket_id}/escalate", response_model=TicketResponse)
async def escalate_ticket(
    ticket_id: uuid.UUID,
    escalate_in: TicketEscalate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Escalate a ticket to a new team with an optional note."""
    ticket = await TicketService.get_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    if ticket.assigned_team_id == escalate_in.assigned_team_id:
        raise HTTPException(
            status_code=400, 
            detail="This ticket is already assigned to this team"
        )
        
    updated = await TicketService.escalate_ticket(
        db, 
        ticket_id, 
        escalate_in.assigned_team_id, 
        current_user.id, 
        escalate_in.note
    )
    return updated


@router.post("/{ticket_id}/accept", response_model=TicketResponse)
async def accept_ticket_assignment(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Accept a pending ticket assignment."""
    ticket = await TicketService.accept_assignment(db, ticket_id, current_user.id)
    if not ticket:
        raise HTTPException(status_code=403, detail="Not assigned to you or ticket not found")
    return ticket


@router.post("/{ticket_id}/reject", response_model=TicketResponse)
async def reject_ticket_assignment(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reject a pending ticket assignment."""
    ticket = await TicketService.reject_assignment(db, ticket_id, current_user.id)
    if not ticket:
        raise HTTPException(status_code=403, detail="Not assigned to you or ticket not found")
    return ticket
@router.post("/{ticket_id}/handoff", response_model=TicketResponse)
async def handoff_ticket_to_ai(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Hand off a ticket back to AI and unassign the agent."""
    ticket = await TicketService.handoff_to_ai(db, ticket_id, current_user.id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket
