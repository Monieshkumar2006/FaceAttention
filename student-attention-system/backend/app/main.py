from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.utils.logger import logger
from app.database.init_db import init_db
from app.api.routes.sessions import router as sessions_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.ai import router as ai_router
from app.api.routes.reports import router as reports_router
from app.api.routes.monitoring import router as monitoring_router
from app.api.routes.settings import router as settings_router

# Initialize database tables on app startup
init_db()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for AI-Based Student Attention and Distraction Detection System"
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(sessions_router, prefix=settings.API_PREFIX)
app.include_router(analytics_router, prefix=settings.API_PREFIX)
app.include_router(ai_router, prefix=settings.API_PREFIX)
app.include_router(reports_router, prefix=settings.API_PREFIX)
app.include_router(settings_router, prefix=settings.API_PREFIX)
app.include_router(monitoring_router)


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint to verify system status."""
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "ai_provider": settings.AI_PROVIDER,
        "fps_target": settings.FRAME_PROCESSING_FPS
    }

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "AI-Based Student Attention & Distraction Detection API is running",
        "docs_url": "/docs",
        "health_url": "/health"
    }

@app.get("/start-session", tags=["Session"])
async def start_session():
    """Start an attention monitoring session."""
    return {
        "status": "started",
        "message": "Attention monitoring session started"
    }

@app.get("/stop-session", tags=["Session"])
async def stop_session():
    """Stop the current attention monitoring session."""
    return {
        "status": "stopped",
        "message": "Attention monitoring session stopped"
    }

@app.get("/pause-session", tags=["Session"])
async def pause_session():
    """Pause the current attention monitoring session."""
    return {
        "status": "paused",
        "message": "Attention monitoring session paused"
    }

@app.get("/resume-session", tags=["Session"])
async def resume_session():
    """Resume the current attention monitoring session."""
    return {
        "status": "resumed",
        "message": "Attention monitoring session resumed"
    }
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
