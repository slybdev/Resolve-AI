import asyncio
import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

async def main():
    api_key = os.getenv("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)
    print(f"Checking models with API key starting with: {api_key[:10]}...")
    
    try:
        models = await client.aio.models.list()
        print("\nAvailable Models:")
        for m in models:
            print(f"- {m.name} (DisplayName: {m.display_name})")
    except Exception as e:
        print(f"Failed to list models: {e}")

if __name__ == "__main__":
    asyncio.run(main())
