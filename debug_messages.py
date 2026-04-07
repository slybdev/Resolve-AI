
import asyncio
import uuid
from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.message import Message
from app.models.conversation import Conversation
from app.models.ticket import Ticket

async def check():
    async with SessionLocal() as db:
        # 1. Total conversations
        res = await db.execute(select(Conversation).order_by(Conversation.updated_at.desc()).limit(5))
        convs = res.scalars().all()
        print(f"--- RECENT CONVERSATIONS ---")
        for c in convs:
            # Check for ticket
            tres = await db.execute(select(Ticket).where(Ticket.conversation_id == c.id))
            t = tres.scalar_one_or_none()
            print(f"Conv: {c.id} | Status: {c.status} | Updated: {c.updated_at} | Ticket: {t.id if t else 'NONE'}")
            
            # messages
            mres = await db.execute(select(Message).where(Message.conversation_id == c.id).order_by(Message.created_at.desc()).limit(5))
            msgs = mres.scalars().all()
            for m in msgs:
                print(f"  [{m.sender_type}] {m.body[:50]} | Created: {m.created_at}")

if __name__ == "__main__":
    asyncio.run(check())
