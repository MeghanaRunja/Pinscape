from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
import httpx
import jwt
import time
import secrets

from config import get_settings
from models.schemas import TokenResponse

router = APIRouter()
settings = get_settings()

# In production replace with Redis / DB
_state_store: dict[str, float] = {}  # state -> expires_at


PINTEREST_AUTH_URL = "https://www.pinterest.com/oauth/"
PINTEREST_TOKEN_URL = "https://api.pinterest.com/v5/oauth/token"
SCOPES = "boards:read,pins:read,user_accounts:read"


@router.get("/pinterest/login")
def pinterest_login():
    """
    Step 1 — redirect user to Pinterest OAuth consent screen.
    Frontend should open this URL in a popup or redirect.
    """
    state = secrets.token_urlsafe(32)
    _state_store[state] = time.time() + 300  # 5-minute TTL

    params = {
        "client_id": settings.pinterest_client_id,
        "redirect_uri": settings.pinterest_redirect_uri,
        "response_type": "code",
        "scope": SCOPES,
        "state": state,
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(f"{PINTEREST_AUTH_URL}?{query}")


@router.get("/pinterest/callback")
async def pinterest_callback(code: str, state: str):
    """
    Step 2 — Pinterest redirects here with an auth code.
    We exchange it for tokens, issue our own JWT, and redirect to the frontend.
    """
    # Validate state
    expires_at = _state_store.pop(state, None)
    if not expires_at or time.time() > expires_at:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")

    # Exchange code for Pinterest access token
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            PINTEREST_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.pinterest_redirect_uri,
            },
            auth=(settings.pinterest_client_id, settings.pinterest_client_secret),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

    if token_resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Pinterest token exchange failed")

    token_data = token_resp.json()
    pinterest_access_token = token_data["access_token"]

    # Fetch basic user info to embed in our JWT
    async with httpx.AsyncClient() as client:
        user_resp = await client.get(
            "https://api.pinterest.com/v5/user_account",
            headers={"Authorization": f"Bearer {pinterest_access_token}"},
        )
    user_data = user_resp.json()

    # Issue our own short-lived JWT that carries the Pinterest token
    payload = {
        "sub": user_data.get("username"),
        "pinterest_token": pinterest_access_token,
        "exp": time.time() + settings.access_token_expire_minutes * 60,
    }
    our_token = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

    # Redirect to frontend with token in fragment (never in query string)
    frontend_url = f"http://localhost:3000/auth-success#{our_token}"
    return RedirectResponse(frontend_url)


@router.post("/refresh")
async def refresh_token(request: Request):
    """
    Accepts a still-valid JWT and issues a fresh one.
    Call this ~1 hour before expiry.
    """
    body = await request.json()
    token = body.get("token")
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    payload["exp"] = time.time() + settings.access_token_expire_minutes * 60
    new_token = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
    return TokenResponse(access_token=new_token)
