import asyncio
import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

async def main():
    api_key = os.getenv("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)
    
    try:
        models = await client.aio.models.list()
        print("\nAvailable Models:")
        for m in models:
            if 'flash' in m.name or '1.5' in m.name or '2.0' in m.name:
                print(f"- {m.name}")
    except Exception as e:
        print(f"Failed to list models: {e}")

if __name__ == "__main__":
    asyncio.run(main())
