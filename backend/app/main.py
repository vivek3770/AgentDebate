"""
AgentDebate Backend — FastAPI Application Entry Point

Initializes the FastAPI app with CORS, database, and all route handlers.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.models.database import init_db, close_db
from app.api.routes import router as api_router
from app.api.websocket import router as ws_router

# ──────────────────── Logging ──────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)-28s │ %(levelname)-7s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ──────────────────── Lifespan ─────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown events."""
    settings = get_settings()
    logger.info("═══════════════════════════════════════════")
    logger.info("  🎤  AgentDebate API Starting...")
    logger.info(f"  Debater A Model: {settings.debater_a_model}")
    logger.info(f"  Debater B Model: {settings.debater_b_model}")
    logger.info(f"  Judge Model:     {settings.judge_model}")
    logger.info("═══════════════════════════════════════════")

    # Initialize database
    await init_db()
    logger.info("Database initialized")

    yield

    # Shutdown
    await close_db()
    logger.info("Database connections closed")
    logger.info("AgentDebate API shutdown complete")


# ──────────────────── App Setup ────────────────────────────────

app = FastAPI(
    title="AgentDebate API",
    description="Multi-agent structured debate platform between LLMs",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend to connect
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api_router)
app.include_router(ws_router)


# ──────────────────── Root ─────────────────────────────────────


@app.get("/")
async def root():
    """API root — redirect info."""
    return {
        "service": "AgentDebate API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health",
    }
