from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from .config import settings


class Base(DeclarativeBase):
    pass


def get_engine():
    if not settings.database_url:
        raise ValueError("DATABASE_URL not set. Configure Neon PostgreSQL.")
    return create_async_engine(
        settings.database_url,
        echo=settings.environment == "development",
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,       # test connection before use — fixes stale pool on Fly.io
        pool_recycle=300,         # recycle connections every 5 min to prevent timeouts
    )


engine = None
AsyncSessionLocal = None


def init_db():
    global engine, AsyncSessionLocal
    engine = get_engine()
    AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db():
    if AsyncSessionLocal is None:
        raise RuntimeError("DB not initialized. Call init_db() first.")
    async with AsyncSessionLocal() as session:
        yield session
