import asyncio
import os
import sys

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from app.db.session import async_session_factory
from app.models.channel import Channel, ChannelType
from sqlalchemy import select

async def main():
    try:
        async with async_session_factory() as db:
            result = await db.execute(select(Channel).where(Channel.type == ChannelType.DISCORD))
            channels = result.scalars().all()
            with open("tokens_full.txt", "w") as f:
                for c in channels:
                    token = c.config.get("token") or c.config.get("bot_token")
                    f.write(f"{token}\n")
            print("TOKENS_SAVED")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(main())
    finally:
        loop.close()
