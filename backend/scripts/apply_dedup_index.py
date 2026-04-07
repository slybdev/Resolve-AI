"""Apply the dedup unique index migration."""
import asyncio
from sqlalchemy import text
from app.db.session import async_session_factory

async def main():
    async with async_session_factory() as db:
        await db.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS uq_channel_external_id 
            ON messages (channel_id, external_id) 
            WHERE channel_id IS NOT NULL AND external_id IS NOT NULL
        """))
        await db.commit()
        print("✅ Dedup index created successfully")

asyncio.run(main())
