import discord
import asyncio
import logging
from typing import Dict, Optional, Set
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.channel import Channel, ChannelType

logger = logging.getLogger(__name__)

class DiscordBotManager:
    def __init__(self):
        self.active_clients: Dict[str, discord.Client] = {}
        self.bot_tasks: Dict[str, asyncio.Task] = {}
        self.channel_to_token: Dict[str, str] = {} # Map channel_id -> token
        self.bot_errors: Dict[str, str] = {} # Map token -> last error message
        self._db_factory = None # Will be set by app initialization

    def set_db_factory(self, db_factory):
        self._db_factory = db_factory

    async def start_all_bots(self, db: AsyncSession):
        """Load all active Discord channels and start their bots."""
        result = await db.execute(
            select(Channel).where(
                Channel.type == ChannelType.DISCORD,
                Channel.is_active == True
            )
        )
        channels = result.scalars().all()
        logger.info(f"Starting {len(channels)} Discord bots from database...")
        
        for channel in channels:
            token = channel.config.get("token") or channel.config.get("bot_token")
            if token:
                await self.start_bot(token, channel.id)

    async def start_bot(self, token: str, channel_id):
        """Start a single Discord bot if not already running."""
        channel_id_str = str(channel_id)  # String for dict keys
        try:
            logger.info(f"Discord Bot: Initializing for channel {channel_id_str}...")
            
            # Check if this channel is already running with a DIFFERENT token
            old_token = self.channel_to_token.get(channel_id_str)
            if old_token and old_token != token:
                logger.info(f"Channel {channel_id_str} token changed. Stopping old bot...")
                await self.stop_bot(old_token)

            # If already running with the SAME token, do nothing
            if token in self.active_clients:
                logger.info(f"Bot with token {token[:10]}... already running for channel {channel_id_str}.")
                return

            # Enable necessary intents
            intents = discord.Intents.default()
            intents.message_content = True
            intents.messages = True
            intents.dm_messages = True
            intents.guild_messages = True
            
            client = discord.Client(intents=intents)
            
            # Define event handlers
            @client.event
            async def on_ready():
                logger.info(f"SUCCESS: Discord Bot {client.user} (ID: {client.user.id}) is ONLINE and LISTENING for channel {channel_id_str}")

            @client.event
            async def on_message(message):
                try:
                    # Ignore own messages and other bots
                    if message.author == client.user or message.author.bot:
                        return
                    
                    logger.info(f"Discord Bot ({channel_id_str}) received message: {message.id} from {message.author.name}")
                    
                    from app.services.channels.discord import discord_service
                    import uuid as uuid_mod
                    if self._db_factory:
                        async with self._db_factory() as db:
                            # Use UUID object for SQLAlchemy query
                            result = await db.execute(select(Channel).where(Channel.id == uuid_mod.UUID(channel_id_str)))
                            channel_obj = result.scalar_one_or_none()
                            
                            if not channel_obj:
                                logger.error(f"Discord Bot: Channel {channel_id_str} no longer in DB")
                                return

                            if not channel_obj.is_active:
                                logger.warning(f"Discord Bot: Channel {channel_id_str} is now inactive")
                                return

                            # Construct payload for DiscordService
                            payload = {
                                "guild_id": str(message.guild.id) if message.guild else "dm",
                                "channel_id": str(message.channel.id),
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
                                        "duration": getattr(att, "duration", None) or getattr(att, "duration_seconds", None)
                                    } for att in message.attachments
                                ]
                            }
                            
                            await discord_service.handle_incoming_from_channel(db, channel_obj, payload)
                            await db.commit()
                            logger.info(f"Discord Bot: Successfully routed message {message.id}")
                    else:
                        logger.error("Discord Bot: No db_factory configured!")
                except Exception as e:
                    logger.exception(f"Discord Bot processing error (Channel: {channel_id_str}): {e}")

            # Register and start
            self.active_clients[token] = client
            self.channel_to_token[channel_id_str] = token
            self.bot_tasks[token] = asyncio.create_task(self._run_client(client, token, channel_id_str))
            logger.info(f"Discord Bot task created for channel {channel_id_str}")
            
        except Exception as e:
            logger.exception(f"Discord Bot: Failed to initialize channel {channel_id_str}: {e}")
            self.bot_errors[token] = str(e)

    async def restart_bot(self, old_token: Optional[str], new_token: str, channel_id: str):
        """Stop the old bot (if any) and start the new one."""
        if old_token:
            await self.stop_bot(old_token)
        await self.start_bot(new_token, channel_id)

    async def _run_client(self, client: discord.Client, token: str, channel_id: str):
        try:
            await client.start(token)
        except asyncio.CancelledError:
            logger.info(f"Discord bot task cancelled for channel {channel_id}.")
        except discord.errors.PrivilegedIntentsRequired:
            error_msg = ("Missing 'Message Content Intent'. Go to Discord Developer Portal -> Bot tab -> Enable 'Message Content Intent'.")
            logger.error(f"Discord Bot Error: {error_msg}")
            self.bot_errors[token] = error_msg
        except Exception as e:
            error_msg = f"Error running Discord bot: {e}"
            logger.error(error_msg)
            self.bot_errors[token] = error_msg
        finally:
            self.active_clients.pop(token, None)
            self.bot_tasks.pop(token, None)
            for ch_id, tok in list(self.channel_to_token.items()):
                if tok == token:
                    self.channel_to_token.pop(ch_id, None)

    async def stop_bot(self, token: str):
        """Stop a running Discord bot."""
        client = self.active_clients.get(token)
        task = self.bot_tasks.get(token)
        
        if client:
            try:
                await client.close()
            except Exception as e:
                logger.error(f"Error closing Discord client: {e}")
        
        if task and not task.done():
            task.cancel()
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass
        
        self.active_clients.pop(token, None)
        self.bot_tasks.pop(token, None)

    async def stop_all(self):
        """Stop all active bots."""
        tokens = list(self.active_clients.keys())
        for token in tokens:
            await self.stop_bot(token)

discord_bot_manager = DiscordBotManager()
