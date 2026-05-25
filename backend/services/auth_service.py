from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import time

from config import get_settings

settings = get_settings()
_bearer = HTTPBearer()


def get_current_pinterest_token(
    credentials: HTTPAuthorizationCredentials = Security(_bearer),
) -> str:
    """
    FastAPI dependency — validates our JWT and extracts the Pinterest access token.
    Inject with:  pinterest_token: str = Depends(get_current_pinterest_token)
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired — please reconnect Pinterest")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    pinterest_token = payload.get("pinterest_token")
    if not pinterest_token:
        raise HTTPException(status_code=401, detail="No Pinterest token in session")

    return pinterest_token
