"""Field Shift - NASA Space Apps 2026 Backend API.

FastAPI application for crop rotation optimization and soil health analysis
using NASA Earth observation data.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router as api_router
from app.core.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    settings = get_settings()
    print(f"🚀 Starting Field Shift API in {settings.APP_ENV} mode")
    print(f"📡 NASA Earthdata: {'Configured' if settings.EARTHDATA_USERNAME else 'Not configured'}")
    yield
    # Shutdown
    print("🛑 Shutting down Field Shift API")


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="Field Shift API",
        description=(
            "NASA Space Apps Challenge 2026 - "
            "Adapting Farms with NASA Data\n\n"
            "Decision-support tool combining NASA Earth observations "
            "with local soil data, crop characteristics, and farmer priorities "
            "to explore resilient crop rotation strategies."
        ),
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if settings.DEBUG else ["https://your-frontend-domain.com"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include API routes
    app.include_router(api_router)

    # Global exception handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request, exc):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "detail": str(exc) if settings.DEBUG else "An unexpected error occurred",
            },
        )

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(
        "backend.app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info",
    )