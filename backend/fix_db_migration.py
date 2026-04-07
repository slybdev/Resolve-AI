
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Update with Docker internal URL if running from host, or just keep as is if testing locally
DATABASE_URL = "postgresql+psycopg://xentraldesk:xentraldesk_dev@localhost:5432/xentraldesk"

async def migrate():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        print("Adding column is_ai_enabled to workspaces table...")
        try:
            # Add the column with a default value of False
            await conn.execute(text("ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS is_ai_enabled BOOLEAN DEFAULT FALSE NOT JOIN NULL"))
            # Note: NOT NULL with DEFAULT is standard for a toggle
            await conn.execute(text("ALTER TABLE workspaces ALTER COLUMN is_ai_enabled SET NOT NULL"))
            print("Successfully added is_ai_enabled column.")
        except Exception as e:
            print(f"Error adding column: {e}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate())
