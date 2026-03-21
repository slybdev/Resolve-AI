import discord
import asyncio

# Token from DB
TOKEN = "MTM0OTgzOTAxMTM1Mzc2ODk5MA.G4scJ2.JnQxrbbbz06BBzM8BKc"

intents = discord.Intents.default()
intents.message_content = True
intents.messages = True
intents.dm_messages = True
intents.guild_messages = True

client = discord.Client(intents=intents)

@client.event
async def on_ready():
    print(f"DIAGNOSTIC BOT ONLINE: {client.user} (ID: {client.user.id})")
    print("READY TO CAPTURE MESSAGES...")

@client.event
async def on_message(message):
    if message.author == client.user:
        return
    print(f"MESSAGE CAPTURED: From {message.author.name} | Content: {message.content} | ID: {message.id}")

async def main():
    try:
        async with client:
            await client.start(TOKEN)
    except Exception as e:
        print(f"DIAGNOSTIC ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(main())
