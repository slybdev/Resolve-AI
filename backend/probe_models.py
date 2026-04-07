import asyncio
import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

async def probe_model(client, model_name):
    try:
        print(f"Probing {model_name}...")
        response = await client.aio.models.generate_content(
            model=model_name,
            contents="hi"
        )
        print(f"  SUCCESS: {model_name}")
        return True
    except Exception as e:
        print(f"  FAILED: {model_name} -> {str(e)[:100]}")
        return False

async def main():
    api_key = os.getenv("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)
    
    # Models to test based on full_models_list.txt
    test_models = [
        "models/gemini-flash-latest",
        "models/gemini-flash-lite-latest",
        "models/gemini-2.0-flash-lite-001",
        "models/gemini-2.0-flash-lite",
        "models/gemma-3-4b-it",
        "models/gemini-2.0-flash-exp",
        "models/gemini-1.5-flash-8b",
        "models/gemini-1.5-pro-latest"
    ]
    
    print("Starting model probe...")
    for m in test_models:
        if await probe_model(client, m):
            print(f"\nFOUND WORKING MODEL: {m}")
            # return # Keep probing to see options
    print("\nProbe finished.")

if __name__ == "__main__":
    asyncio.run(main())
