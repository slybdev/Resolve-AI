
import asyncio
import uuid
from sqlalchemy import text
from app.db.session import SessionLocal

async def add_column():
    async with SessionLocal() as db:
        try:
            # Check if column exists first
            result = await db.execute(text("PRAGMA table_info(campaigns)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'type' not in columns:
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
