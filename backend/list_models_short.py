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
        print("\nAvailable Models (First 10):")
        count = 0
        for m in models:
            print(f"- {m.name}")
            count += 1
            if count >= 10: break
    except Exception as e:
        print(f"Failed to list models: {e}")

if __name__ == "__main__":
    asyncio.run(main())
