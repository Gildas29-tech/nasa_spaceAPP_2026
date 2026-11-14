"""Application configuration settings."""

from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Application
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "dev-secret-change-in-production"
    API_V1_PREFIX: str = "/api/v1"

    # NASA Earthdata (for GPM, SMAP, Landsat, Sentinel-2 downloads)
    EARTHDATA_USERNAME: str = ""
    EARTHDATA_PASSWORD: str = ""

    # Copernicus Data Space (for Sentinel-2)
    COPERNICUS_CLIENT_ID: str = ""
    COPERNICUS_CLIENT_SECRET: str = ""

    # NASA API (optional)
    NASA_API_KEY: Optional[str] = None

    # AWS (optional - for direct S3 access)
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_DEFAULT_REGION: str = "us-west-2"

    # OpenET (optional)
    OPENET_API_KEY: Optional[str] = None

    # Database (optional)
    DATABASE_URL: Optional[str] = None

    # Redis (optional)
    REDIS_URL: Optional[str] = None

    # Frontend
    VITE_API_BASE_URL: str = "http://localhost:8000/api/v1"
    VITE_MAPBOX_TOKEN: Optional[str] = None


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()