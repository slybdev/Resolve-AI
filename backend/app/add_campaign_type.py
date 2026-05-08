
import asyncio
from sqlalchemy import text
from app.db.session import async_session_factory

async def add_column():
    async with async_session_factory() as db:
        try:
            # Check if column exists first
            # Since we are using Postgres in docker-compose, we should check postgres tables
            result = await db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='campaigns' AND column_name='type'"))
            exists = result.scalar()
            
            if not exists:
                print("Adding 'type' column to campaigns table...")
                await db.execute(text("ALTER TABLE campaigns ADD COLUMN type VARCHAR(50) DEFAULT 'news' NOT NULL"))
                await db.commit()
                print("Column added successfully.")
            else:
                print("Column 'type' already exists.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(add_column())
