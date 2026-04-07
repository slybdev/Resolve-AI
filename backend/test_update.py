import asyncio
from app.db.base import async_session
from app.models.workspace import Workspace
from sqlalchemy import select
async def check():
    async with async_session() as db:
        res = await db.execute(select(Workspace))
        for w in res.scalars().all():
            print(w.id, w.name, 'AI Enabled:', w.is_ai_enabled)

asyncio.run(check())
