import redis.asyncio as aioredis
from .config import settings

_redis_client: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        if not settings.redis_url:
            raise ValueError("REDIS_URL not set. Configure Upstash Redis.")
        _redis_client = await aioredis.from_url(
            settings.redis_url,
            decode_responses=True,
        )
    return _redis_client


async def close_redis():
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None
