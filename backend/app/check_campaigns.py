
import asyncio
from sqlalchemy import text
from app.db.session import async_session_factory

async def check():
    async with async_session_factory() as db:
        result = await db.execute(text("SELECT id, name, type, status, channel FROM campaigns"))
        rows = result.fetchall()
        print("Campaigns in DB:")
        for row in rows:
            print(row)

if __name__ == "__main__":
    asyncio.run(check())
