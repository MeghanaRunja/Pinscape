import sys
from functools import lru_cache
from pydantic_settings import BaseSettings

# Single source of truth for the Claude model — imported by vision_service.py
# so the model name never needs to be hardcoded in two places.
CLAUDE_MODEL = "claude-sonnet-4-20250514"

_INSECURE_DEFAULT = "change-me-in-production"


class Settings(BaseSettings):
    # Pinterest OAuth
    pinterest_client_id: str = ""
    pinterest_client_secret: str = ""
    pinterest_redirect_uri: str = "http://localhost:8000/auth/pinterest/callback"

    # Where the backend redirects after a successful OAuth callback.
    # For the mobile app this MUST be the custom deep-link scheme so that
    # expo-web-browser's openAuthSessionAsync can intercept it and return
    # the token to the app.  Change to e.g. "http://localhost:3000/auth-success"
    # only when driving the OAuth flow from a web frontend instead.
    oauth_success_redirect: str = "pinscape://auth-success"

    # Anthropic
    anthropic_api_key: str = ""

    # JWT
    secret_key: str = _INSECURE_DEFAULT
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # Storage
    upload_dir: str = "uploads"
    max_upload_mb: int = 20

    # CORS — comma-separated list; extend in .env for prod domains
    cors_origins: str = (
        "http://localhost:3000,"
        "http://localhost:5173,"
        "http://127.0.0.1:5500"
    )

    # Set to "production" to enable strict startup checks
    environment: str = "development"

    class Config:
        env_file = ".env"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.environment == "production" and s.secret_key == _INSECURE_DEFAULT:
        print(
            "FATAL: SECRET_KEY is still the insecure default. "
            "Set a real SECRET_KEY before running in production.",
            file=sys.stderr,
        )
        sys.exit(1)
    if s.environment == "development" and s.secret_key == _INSECURE_DEFAULT:
        print(
            "WARNING: Using the default insecure SECRET_KEY — fine for local dev only.",
            file=sys.stderr,
        )
    return s
