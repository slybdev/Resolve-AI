import discord
import httpx
import asyncio
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("discord_forwarder")

# --- CONFIGURATION FROM ENV ---
DISCORD_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
RESOLVEAI_URL = os.getenv("RESOLVEAI_WEBHOOK_URL")

# Ensure intents are enabled in Discord Developer Portal (Message Content Intent)
intents = discord.Intents.default()
intents.message_content = True

client = discord.Client(intents=intents)

@client.event
async def on_ready():
    logger.info(f'Logged in as {client.user} (ID: {client.user.id})')
    logger.info('Forwarder is ACTIVE and listening for messages.')

@client.event
async def on_message(message):
    # Ignore messages from the bot itself or other bots
    if message.author == client.user or message.author.bot:
        return

    # Prepare payload for ResolveAI
    payload = {
        "guild_id": str(message.guild.id) if message.guild else "dm",
        "content": message.content,
        "author": {
            "id": str(message.author.id),
            "username": message.author.name,
            "global_name": message.author.display_name,
            "bot": message.author.bot
        },
        "id": str(message.id),
        "attachments": [
            {
                "url": att.url,
                "content_type": att.content_type,
                "filename": att.filename
            } for att in message.attachments
        ]
    }

    logger.info(f"Forwarding message from {message.author}: {message.content[:50]}...")

    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(RESOLVEAI_URL, json=payload, timeout=10.0)
            if response.status_code != 200:
                logger.error(f"Error forwarding: {response.status_code} - {response.text}")
    except Exception as e:
        logger.error(f"Failed to connect to ResolveAI: {e}")

if __name__ == "__main__":
    if not DISCORD_TOKEN or not RESOLVEAI_URL:
        logger.error("Missing DISCORD_BOT_TOKEN or RESOLVEAI_WEBHOOK_URL environment variables.")
        exit(1)
        
    client.run(DISCORD_TOKEN)
