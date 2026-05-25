from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Pinterest OAuth
    pinterest_client_id: str = ""
    pinterest_client_secret: str = ""
    pinterest_redirect_uri: str = "http://localhost:8000/auth/pinterest/callback"

    # Anthropic (Claude vision + generation)
    anthropic_api_key: str = ""

    # Security
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # Storage (local for dev; swap for S3 in prod)
    upload_dir: str = "uploads"
    max_upload_mb: int = 20

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
