import asyncio
from app.db.base import async_session
from app.models.workspace import Workspace
from sqlalchemy import select
async def run():
    async with async_session() as db:
        res = await db.execute(select(Workspace))
        for x in res.scalars().all():
            print(x.name, x.is_ai_enabled)
asyncio.run(run())
