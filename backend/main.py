from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
import core.database as database


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    if settings.database_url:
        database.init_db()
        import models.session  # noqa: F401
        async with database.engine.begin() as conn:
            await conn.run_sync(database.Base.metadata.create_all)
        print("Database connected and tables created")
    else:
        print("WARNING: DATABASE_URL not set")

    yield

    if database.engine:
        await database.engine.dispose()


app = FastAPI(
    title="InterviewAI API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import sessions, interview, evaluation

app.include_router(sessions.router)
app.include_router(interview.router)
app.include_router(evaluation.router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "environment": settings.environment,
        "db_configured": bool(settings.database_url),
        "elevenlabs_agent_configured": bool(settings.elevenlabs_agent_id),
    }
