
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+psycopg://xentraldesk:xentraldesk_dev@localhost:5432/xentraldesk"

async def add_column():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        print("Adding column assigned_user_id to tickets table...")
        try:
            await conn.execute(text("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES users(id)"))
            print("Successfully added assigned_user_id column.")
        except Exception as e:
            print(f"Error adding column: {e}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(add_column())
