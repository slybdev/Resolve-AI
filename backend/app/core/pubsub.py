import json
import logging
import asyncio
from redis import asyncio as aioredis
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class PubSubManager:
    def __init__(self):
        self._redis = None

    async def get_redis(self):
        if self._redis is None:
            self._redis = aioredis.from_url(
                settings.REDIS_URL, 
                decode_responses=True,
                # Health checks to prevent stale connections
                socket_connect_timeout=5,
                retry_on_timeout=True
            )
        return self._redis

    async def publish(self, channel: str, message: dict):
        """Publishes a JSON-encoded message to a Redis channel."""
        try:
            r = await self.get_redis()
            await r.publish(channel, json.dumps(message))
        except Exception as e:
            logger.error(f"Failed to publish to Redis channel {channel}: {e}")

    async def subscribe(self, channel: str):
        """Subscribes to a Redis channel and returns the pubsub object."""
        r = await self.get_redis()
        pubsub = r.pubsub()
        await pubsub.subscribe(channel)
        return pubsub

# Global instance
pubsub_manager = PubSubManager()
