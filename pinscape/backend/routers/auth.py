from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from urllib.parse import urlencode
import httpx
import jwt
import time
import secrets

from config import get_settings
from models.schemas import TokenResponse

router = APIRouter()
settings = get_settings()

# In production replace with Redis. Keyed by state -> expires_at (epoch float).
_state_store: dict[str, float] = {}
_STATE_TTL = 300  # 5 minutes

PINTEREST_AUTH_URL  = "https://www.pinterest.com/oauth/"
PINTEREST_TOKEN_URL = "https://api.pinterest.com/v5/oauth/token"
SCOPES = "boards:read,pins:read,user_accounts:read"


def _purge_expired_states() -> None:
    """
    Remove state entries whose TTL has elapsed.

    Without this, every abandoned login attempt (browser closed, consent
    denied, app crashed) leaks one entry permanently — only successful
    callbacks pop their entry.  Called on each new login so the dict stays
    bounded without requiring a background task.
    """
    now = time.time()
    for s in [k for k, exp in _state_store.items() if exp <= now]:
        _state_store.pop(s, None)


@router.get("/pinterest/login")
def pinterest_login():
    """Step 1 — redirect user to Pinterest OAuth consent screen."""
    _purge_expired_states()

    state = secrets.token_urlsafe(32)
    _state_store[state] = time.time() + _STATE_TTL

    params = {
        "client_id":    settings.pinterest_client_id,
        "redirect_uri": settings.pinterest_redirect_uri,
        "response_type": "code",
        "scope":        SCOPES,
        "state":        state,
    }
    # urlencode instead of manual string join so reserved characters in
    # redirect_uri / scope are properly percent-encoded.
    return RedirectResponse(f"{PINTEREST_AUTH_URL}?{urlencode(params)}")


@router.get("/pinterest/callback")
async def pinterest_callback(code: str, state: str):
    """Step 2 — exchange auth code for tokens and redirect to the app."""
    expires_at = _state_store.pop(state, None)
    if not expires_at or time.time() > expires_at:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")

    # Exchange code for Pinterest access token
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            PINTEREST_TOKEN_URL,
            data={
                "grant_type":   "authorization_code",
                "code":         code,
                "redirect_uri": settings.pinterest_redirect_uri,
            },
            auth=(settings.pinterest_client_id, settings.pinterest_client_secret),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

    if token_resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Pinterest token exchange failed")

    pinterest_access_token = token_resp.json()["access_token"]

    # Fetch user info to embed in our JWT
    async with httpx.AsyncClient() as client:
        user_resp = await client.get(
            "https://api.pinterest.com/v5/user_account",
            headers={"Authorization": f"Bearer {pinterest_access_token}"},
        )

    if user_resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to fetch Pinterest user info")

    user_data = user_resp.json()

    payload = {
        "sub":             user_data.get("username"),
        "pinterest_token": pinterest_access_token,
        "exp":             time.time() + settings.access_token_expire_minutes * 60,
    }
    our_token = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

    # Redirect with token in the URL fragment — never in the query string
    # (query strings appear in server logs and Referer headers).
    #
    # CRITICAL for mobile: this redirect target must match what
    # PinterestAuthScreen passes as the second argument to
    # openAuthSessionAsync("pinscape://auth-success") so the in-app
    # browser recognises the callback and hands control back to the app.
    # Configure OAUTH_SUCCESS_REDIRECT in .env to change for web clients.
    return RedirectResponse(f"{settings.oauth_success_redirect}#{our_token}")


@router.post("/refresh")
async def refresh_token(request: Request):
    """Issue a fresh JWT from a still-valid one. Call ~1 hour before expiry."""
    body = await request.json()
    token = body.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Missing 'token' in request body")

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    payload["exp"] = time.time() + settings.access_token_expire_minutes * 60
    new_token = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
    return TokenResponse(access_token=new_token)
