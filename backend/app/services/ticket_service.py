import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.ticket import Ticket
from app.models.ticket_update import TicketUpdate
from app.models.ticket_tag import TicketTag
from app.models.conversation import Conversation
from app.models.user import User
from app.models.team import Team, TeamMember
from app.schemas.ticket import TicketCreate, TicketUpdate as TicketUpdateSchema


class TicketService:
    @staticmethod
    async def create_ticket(
        db: AsyncSession,
        obj_in: TicketCreate,
        trigger_ai: bool = False
    ) -> Ticket:
        """Create a new ticket from a conversation."""
        ticket = Ticket(
            conversation_id=obj_in.conversation_id,
            workspace_id=obj_in.workspace_id,
            title=obj_in.title,
            summary=obj_in.summary,
            status=obj_in.status,
            priority=obj_in.priority,
            assigned_team_id=obj_in.assigned_team_id,
            created_by_id=obj_in.created_by_id,
            created_by_ai=obj_in.created_by_ai
        )
        db.add(ticket)
        
        # Add initial update entry
        update_entry = TicketUpdate(
            ticket=ticket,
            user_id=obj_in.created_by_id,
            update_type="created",
            new_value=obj_in.status,
            note="Ticket created manually" if not obj_in.created_by_ai else "Ticket created automatically"
        )
        db.add(update_entry)
        
        await db.commit()
        await db.refresh(ticket)

        # Apply SLA logic
        await TicketService.apply_sla_to_ticket(db, ticket.id)
        await db.refresh(ticket)

        if trigger_ai:
            await TicketService.perform_ai_triage(db, ticket.id)
            await db.refresh(ticket)

        return ticket

    @staticmethod
    async def perform_ai_triage(
        db: AsyncSession,
        ticket_id: uuid.UUID
    ) -> Optional[Ticket]:
        """Triggers AI analysis for a ticket and updates ai_metadata."""
        from app.services.ai_service import AIService
        from app.models.ticket_update import TicketUpdate
        
        ticket = await TicketService.get_ticket(db, ticket_id)
        if not ticket:
            return None
            
        # Get AI Suggestions
        suggestions = await AIService.analyze_ticket_triage(
            db, ticket.workspace_id, ticket.conversation_id
        )
        
        if suggestions:
            ticket.ai_metadata = suggestions
            # Log that AI analysis was performed
            db.add(TicketUpdate(
                ticket_id=ticket.id,
                update_type="ai_analysis",
                note="AI Triage analysis completed."
            ))
            db.add(ticket)
            await db.commit()
            await db.refresh(ticket)
            
        return ticket

    @staticmethod
    async def get_ticket(
        db: AsyncSession,
        ticket_id: uuid.UUID
    ) -> Optional[Ticket]:
        """Get a ticket by ID with tags and updates."""
        result = await db.execute(
            select(Ticket)
            .options(
                selectinload(Ticket.tags),
                selectinload(Ticket.updates).selectinload(TicketUpdate.user),
                selectinload(Ticket.sla_tracking),
                selectinload(Ticket.assigned_user),
                selectinload(Ticket.assigned_team).selectinload(Team.members).selectinload(TeamMember.user)
            )
            .where(Ticket.id == ticket_id)
        )
        return result.scalars().first()
    @staticmethod
    async def get_ticket_by_conversation(
        db: AsyncSession,
        conversation_id: uuid.UUID
    ) -> Optional[Ticket]:
        """Get a ticket for a conversation."""
        result = await db.execute(
            select(Ticket)
            .where(Ticket.conversation_id == conversation_id)
            .order_by(Ticket.created_at.desc())
        )
        return result.scalars().first()

    @staticmethod
    async def escalate_ticket(
        db: AsyncSession,
        ticket_id: uuid.UUID,
        new_team_id: uuid.UUID,
        user_id: uuid.UUID,
        note: Optional[str] = None
    ) -> Optional[Ticket]:
        """Escalate a ticket to a new team and log activity."""
        ticket = await TicketService.get_ticket(db, ticket_id)
        if not ticket:
            return None

        # Fetch old team name
        old_team_name = ticket.assigned_team.name if ticket.assigned_team else "Unassigned"
        
        # Update ticket
        if ticket.assigned_team_id == new_team_id:
            return ticket # No change needed, or raise error? User said 'cannot escalate to same team'
        
        ticket.assigned_team_id = new_team_id
        ticket.assigned_user_id = None # Clear and allow new team to claim
        
        # Get new team name
        new_team_res = await db.execute(select(Team).where(Team.id == new_team_id))
        new_team = new_team_res.scalar_one_or_none()
        new_team_name = new_team.name if new_team else "New Team"

        # Log change
        update_entry = TicketUpdate(
            ticket_id=ticket_id,
            user_id=user_id,
            update_type="escalated",
            old_value=old_team_name,
            new_value=new_team_name,
            note=note
        )
        db.add(update_entry)
        await db.commit()
        await db.refresh(ticket)
        return ticket

    @staticmethod
    async def list_tickets(
        db: AsyncSession,
        workspace_id: uuid.UUID,
        team_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        user_id: Optional[uuid.UUID] = None,
        is_admin: bool = False,
        assigned_user_id: Optional[uuid.UUID] = None
    ) -> List[Ticket]:
        """List tickets with optional team and status filters, respecting functional team isolation."""
        query = select(Ticket).where(Ticket.workspace_id == workspace_id)
        
        # 1. Expressed Filter: Specific assigned user (e.g. 'Assigned to Me')
        if assigned_user_id:
            query = query.where(Ticket.assigned_user_id == assigned_user_id)
        
        # 2. Team Isolation: If not admin and not filtering for a specific assignment, show tickets for user's teams
        elif not is_admin and user_id:
            from app.models.team import TeamMember
            user_teams_subquery = (
                select(TeamMember.team_id)
                .where(TeamMember.user_id == user_id)
            )
            # Tickets assigned to their teams OR unassigned (but in workspace)
            query = query.where(
                (Ticket.assigned_team_id.in_(user_teams_subquery)) | 
                (Ticket.assigned_team_id.is_(None))
            )
        
        if team_id:
            query = query.where(Ticket.assigned_team_id == team_id)
        if status:
            query = query.where(Ticket.status == status)
            
        result = await db.execute(query.order_by(Ticket.created_at.desc()))
        return result.scalars().all()

    @staticmethod
    async def update_ticket(
        db: AsyncSession,
        ticket_id: uuid.UUID,
        obj_in: TicketUpdateSchema,
        user_id: Optional[uuid.UUID] = None
    ) -> Optional[Ticket]:
        """Update ticket metadata and log the change."""
        ticket = await TicketService.get_ticket(db, ticket_id)
        if not ticket:
            return None
            
        update_data = obj_in.model_dump(exclude_unset=True)
        
        # Log changes
        for field, new_value in update_data.items():
            old_value = getattr(ticket, field)
            if old_value != new_value:
                # Type conversion for logging
                log_old = str(old_value) if old_value is not None else "None"
                log_new = str(new_value) if new_value is not None else "None"
                
                # Fetch human-readable names for assignment logs
                if field == 'assigned_user_id':
                    if old_value:
                        old_user = await db.get(User, old_value)
                        log_old = old_user.full_name if old_user else str(old_value)
                    if new_value:
                        new_user = await db.get(User, new_value)
                        log_new = new_user.full_name if new_user else str(new_value)
                
                elif field == 'assigned_team_id':
                    from app.models.team import Team
                    if old_value:
                        old_team = await db.get(Team, old_value)
                        log_old = old_team.name if old_team else str(old_value)
                    if new_value:
                        new_team = await db.get(Team, new_value)
                        log_new = new_team.name if new_team else str(new_value)

                db.add(TicketUpdate(
                    ticket_id=ticket.id,
                    user_id=user_id,
                    update_type=f"{field}_changed",
                    old_value=log_old,
                    new_value=log_new
                ))
            
            setattr(ticket, field, new_value)
            
            # If user is reassigned, set status to pending for handoff flow
            if field == 'assigned_user_id' and new_value is not None:
                ticket.assignment_status = "pending"
            elif field == 'assigned_user_id' and new_value is None:
                ticket.assignment_status = "none"
            
        if "status" in update_data and update_data["status"] in ["resolved", "closed"]:
            ticket.resolved_at = datetime.now()
            
            # Unlock conversation when ticket is closed
            if ticket.conversation_id:
                from sqlalchemy import select as sa_select
                from app.models.conversation import Conversation
                conv_res = await db.execute(sa_select(Conversation).where(Conversation.id == ticket.conversation_id))
                conv = conv_res.scalar_one_or_none()
                if conv:
                    conv.assigned_to = None
                    conv.routing_mode = "ai"
                    db.add(conv)
                    
        elif "status" in update_data:
            ticket.resolved_at = None
            
        db.add(ticket)
        await db.commit()
        await db.refresh(ticket)
        return ticket

    @staticmethod
    async def claim_ticket(
        db: AsyncSession,
        ticket_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> Optional[Ticket]:
        """Assign a ticket to a specific user and mark as in_progress."""
        ticket = await TicketService.get_ticket(db, ticket_id)
        if not ticket:
            return None
            
        # Locking: if assigned to another user and not in rejected state, prevent claim
        # Allow taking over closed/resolved tickets to reopen them.
        if ticket.assigned_user_id and ticket.assigned_user_id != user_id and ticket.assignment_status not in ["rejected", "none"] and ticket.status not in ["resolved", "closed"]:
             raise ValueError(f"This ticket is already assigned to another agent")

        old_user_id = ticket.assigned_user_id
            
        ticket.assigned_user_id = user_id
        ticket.assignment_status = "accepted" # Claiming implies immediate acceptance
        if ticket.status in ["open", "resolved", "closed"]:
            ticket.status = "in_progress"
            ticket.resolved_at = None
        
        # Sync the conversation: assign agent and switch to human mode
        if ticket.conversation_id:
            from sqlalchemy import select as sa_select
            conv_res = await db.execute(sa_select(Conversation).where(Conversation.id == ticket.conversation_id))
            conv = conv_res.scalar_one_or_none()
            if conv:
                conv.assigned_to = user_id
                conv.routing_mode = "human"
                db.add(conv)
            
        # Only log assignment if the agent actually changed
        if old_user_id != user_id:
            user_res = await db.execute(select(User.full_name).where(User.id == user_id))
            agent_name = user_res.scalar_one_or_none() or "Agent"
    
            # Log the assignment
            db.add(TicketUpdate(
                ticket_id=ticket.id,
                user_id=user_id,
                update_type="assignment",
                old_value=str(old_user_id) if old_user_id else "Unassigned",
                new_value=f"Claimed by {agent_name}",
                note="Ticket claimed by agent"
            ))
            
            if ticket.conversation_id:
                from app.models.message import Message
                from app.core.pubsub import pubsub_manager
                sys_msg = Message(
                    conversation_id=ticket.conversation_id,
                    sender_type="system",
                    message_type="system",
                    body=f"{agent_name} joined the chat"
                )
                db.add(sys_msg)
                await db.flush()
                
                event_data = {
                    "type": "message.new",
                    "conversation_id": str(ticket.conversation_id),
                    "message": {
                        "id": str(sys_msg.id),
                        "sender_type": "system",
                        "body": sys_msg.body,
                        "created_at": datetime.now().isoformat(),
                        "message_type": "system"
                    }
                }
                await pubsub_manager.publish(f"ws:{ticket.workspace_id}", event_data)
                await pubsub_manager.publish(f"conv:{ticket.conversation_id}", event_data)
        
        db.add(ticket)
        await db.commit()
        await db.refresh(ticket)
        return ticket

    @staticmethod
    async def apply_sla_to_ticket(
        db: AsyncSession,
        ticket_id: uuid.UUID
    ) -> Optional["TicketSLATracking"]:
        """
        Calculates and applies SLA deadlines to a ticket based on priority.
        If no workspace-specific policy exists, uses system defaults.
        """
        from app.models.sla_policy import SLAPolicy, TicketSLATracking
        from datetime import timedelta
        
        ticket = await TicketService.get_ticket(db, ticket_id)
        if not ticket:
            return None
            
        # 1. Look for matching policy (prefer team-specific, then workspace default)
        query = (
            select(SLAPolicy)
            .where(SLAPolicy.workspace_id == ticket.workspace_id)
            .where(SLAPolicy.priority == ticket.priority)
        )
        
        if ticket.assigned_team_id:
            # Try to find a policy for this specific team first
            team_query = query.where(SLAPolicy.team_id == ticket.assigned_team_id)
            result = await db.execute(team_query)
            policy = result.scalars().first()
            
            if not policy:
                # Fallback to workspace default (no team_id)
                default_query = query.where(SLAPolicy.team_id.is_(None))
                result = await db.execute(default_query)
                policy = result.scalars().first()
        else:
            # Just workspace default
            result = await db.execute(query.where(SLAPolicy.team_id.is_(None)))
            policy = result.scalars().first()
        
        # Final fallback: just get any matching policy if the above failed
        if not policy:
            result = await db.execute(query)
            policy = result.scalars().first()
        
        # If no SLA policy exists, skip tracking entirely
        if not policy:
            return None
        
        # 2. Create Tracking Record
        now = datetime.now()
        tracking = TicketSLATracking(
            ticket_id=ticket.id,
            sla_policy_id=policy.id,
            first_response_due=now + timedelta(minutes=policy.first_response_time),
            resolution_due=now + timedelta(minutes=policy.resolution_time)
        )
        
        db.add(tracking)
        await db.commit()
        await db.refresh(tracking)
        return tracking

    @staticmethod
    async def add_note(
        db: AsyncSession,
        ticket_id: uuid.UUID,
        user_id: uuid.UUID,
        note: str
    ) -> TicketUpdate:
        """Add an internal note/comment to the ticket timeline."""
        update_entry = TicketUpdate(
            ticket_id=ticket_id,
            user_id=user_id,
            update_type="comment",
            note=note
        )
        db.add(update_entry)
        await db.commit()
        await db.refresh(update_entry)
        
        # Tick the ticket's updated_at
        await db.commit()
        
        # Satisfy SLA if this is the first engagement
        await TicketService.satisfy_first_response(db, ticket_id)

        return update_entry

    @staticmethod
    async def satisfy_first_response(
        db: AsyncSession,
        ticket_id: uuid.UUID
    ) -> None:
        """Marks the first response as satisfied in the SLA tracking if not already set."""
        from app.models.sla_policy import TicketSLATracking
        
        res = await db.execute(
            select(TicketSLATracking).where(TicketSLATracking.ticket_id == ticket_id)
        )
        tracking = res.scalar_one_or_none()
        
        if tracking and not tracking.first_response_at:
            tracking.first_response_at = datetime.now()
            # Check if it breached
            if tracking.first_response_at > tracking.first_response_due:
                tracking.first_response_breached = True
            db.add(tracking)
            await db.commit()

    @staticmethod
    async def bulk_update_tickets(
        db: AsyncSession,
        ticket_ids: List[uuid.UUID],
        workspace_id: uuid.UUID,
        status: Optional[str] = None,
        assigned_team_id: Optional[uuid.UUID] = None,
        priority: Optional[str] = None
    ) -> int:
        """Update multiple tickets at once."""
        values = {}
        if status: values['status'] = status
        if assigned_team_id: values['assigned_team_id'] = assigned_team_id
        if priority: values['priority'] = priority
        
        if not values:
            return 0
            
        values['updated_at'] = datetime.now()
        
        query = (
            update(Ticket)
            .where(Ticket.id.in_(ticket_ids))
            .where(Ticket.workspace_id == workspace_id)
            .values(**values)
        )
        
        result = await db.execute(query)
        await db.commit()
        
        return result.rowcount

    @staticmethod
    async def accept_assignment(
        db: AsyncSession,
        ticket_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> Optional[Ticket]:
        """Accept a pending assignment."""
        ticket = await TicketService.get_ticket(db, ticket_id)
        if not ticket or str(ticket.assigned_user_id) != str(user_id):
            return None
        
        ticket.assignment_status = "accepted"
        if ticket.status == "open":
            ticket.status = "in_progress"
            
        db.add(TicketUpdate(
            ticket_id=ticket.id,
            user_id=user_id,
            update_type="assignment_accepted",
            note="Assignment accepted by agent"
        ))
        
        db.add(ticket)
        await db.commit()
        await db.refresh(ticket)
        return ticket

    @staticmethod
    async def reject_assignment(
        db: AsyncSession,
        ticket_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> Optional[Ticket]:
        """Reject a pending assignment, making it open for others."""
        ticket = await TicketService.get_ticket(db, ticket_id)
        if not ticket or str(ticket.assigned_user_id) != str(user_id):
            return None
        
        ticket.assigned_user_id = None
        ticket.assignment_status = "rejected"
        
        db.add(TicketUpdate(
            ticket_id=ticket.id,
            user_id=user_id,
            update_type="assignment_rejected",
            note="Assignment rejected by agent. Ticket is now unassigned."
        ))
        
        db.add(ticket)
        await db.commit()
        await db.refresh(ticket)
        return ticket
    @staticmethod
    async def handoff_to_ai(
        db: AsyncSession,
        ticket_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> Optional[Ticket]:
        """Release agent ownership and hand back to AI."""
        from sqlalchemy import select
        from app.models.conversation import Conversation
        
        ticket = await TicketService.get_ticket(db, ticket_id)
        if not ticket:
            return None
            
        old_user_id = ticket.assigned_user_id
        ticket.assigned_user_id = None
        ticket.assignment_status = "none" # This triggers AI mode in RoutingService
        
        # ALSO clear the conversation's assignment
        if ticket.conversation_id:
             conv_res = await db.execute(select(Conversation).where(Conversation.id == ticket.conversation_id))
             conv = conv_res.scalar_one_or_none()
             if conv:
                 conv.assigned_to = None
                 conv.routing_mode = "ai" # Force sync column for AI Handler
                 db.add(conv)
        
        # Log the handoff
        db.add(TicketUpdate(
            ticket_id=ticket.id,
            user_id=user_id,
            update_type="ai_handoff",
            old_value=str(old_user_id) if old_user_id else "Unassigned",
            new_value="Handed back to AI Assistant",
            note="Agent released control to AI"
        ))
        
        db.add(ticket)
        await db.commit()
        await db.refresh(ticket)
        return ticket
