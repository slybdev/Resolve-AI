import logging
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.message import Message
from app.models.channel import ChannelType
from app.models.ticket import Ticket
from app.models.conversation import Conversation
from app.services.ticket_service import TicketService
from app.schemas.ticket import TicketCreate
from app.services.message_hooks import register_handler

logger = logging.getLogger(__name__)

async def widget_auto_ticket_handler(db: AsyncSession, message: Message):
    """
    Automatically creates a Support Ticket when a new message 
    is received via the Chat Widget channel.
    """
    # 1. Check if it's a widget message from a customer
    if message.sender_type != "customer":
        return

    result = await db.execute(
        select(Conversation).where(Conversation.id == message.conversation_id)
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        return
        
    # We need the channel to check the channel type
    from app.models.channel import Channel
    result = await db.execute(
        select(Channel).where(Channel.id == message.channel_id)
    )
    channel = result.scalar_one_or_none()
    
    if not channel or channel.channel_type != ChannelType.WIDGET:
        return

    # 3. Check if ticket already exists for this conversation
    result = await db.execute(
        select(Ticket).where(Ticket.conversation_id == message.conversation_id).order_by(Ticket.created_at.desc())
    )
    existing_ticket = result.scalars().first()
    
    if not existing_ticket:
        logger.info(f"Auto-creating ticket for Widget conversation: {message.conversation_id}")
        
        # 4. Create the Ticket (with AI Triage enabled)
        customer_name = conversation.meta_data.get("customer_name", "Web Visitor") if conversation.meta_data else "Web Visitor"
        
        ticket_in = TicketCreate(
            workspace_id=conversation.workspace_id,
            conversation_id=conversation.id,
            title=f"Widget Support: {customer_name}",
            priority="medium",
            status="open",
            created_by_ai=True # Mark as automated
        )
        
        await TicketService.create_ticket(db, ticket_in, trigger_ai=True)
        logger.info(f"Ticket auto-created with AI triage for conv {conversation.id}")

# Register the handler globally
def initialize_ticket_automation():
    register_handler(widget_auto_ticket_handler)
