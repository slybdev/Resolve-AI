import asyncio
import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

async def probe_model(client, model_name):
    try:
        response = await client.aio.models.generate_content(
            model=model_name,
            contents="hi"
        )
        return True, None
    except Exception as e:
        return False, str(e)

async def main():
    api_key = os.getenv("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)
    
    test_models = [
        "models/gemini-2.0-flash-lite-preview-09-2025",
        "models/gemini-flash-latest",
        "models/gemini-2.0-flash",
        "models/gemini-flash-lite-latest",
        "models/gemini-2.0-flash-lite",
        "models/gemma-3-4b-it",
        "models/gemini-2.0-flash-exp",
        "models/gemini-1.5-flash-8b",
        "models/gemini-1.5-pro-latest"
    ]
    
    results = []
    for m in test_models:
        success, err = await probe_model(client, m)
        status = "SUCCESS" if success else f"FAILED: {err[:100]}"
        results.append(f"{m} -> {status}")
        print(f"Tested {m}: {status}")
        
    with open('probe_results.txt', 'w') as f:
        f.write('\n'.join(results))

if __name__ == "__main__":
    asyncio.run(main())
