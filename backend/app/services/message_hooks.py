import logging
from typing import Callable, List, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.message import Message

logger = logging.getLogger(__name__)

# List of registered message handlers
_handlers: List[Callable[[AsyncSession, Message], Any]] = []

def register_handler(fn: Callable[[AsyncSession, Message], Any]):
    """Registers a new handler to be called when a message is received."""
    if fn not in _handlers:
        _handlers.append(fn)
        logger.info(f"Registered message handler: {fn.__name__}")

async def on_message_received(db: AsyncSession, message: Message):
    """
    The central hook for message reception. 
    Divides message ingestion from downstream processing (AI, Automations, Workflows).
    """
    logger.debug(f"Message received hook triggered for message: {message.id}")
    for handler in _handlers:
        try:
            await handler(db, message)
        except Exception as e:
            logger.error(f"Error in message handler {handler.__name__}: {str(e)}")
