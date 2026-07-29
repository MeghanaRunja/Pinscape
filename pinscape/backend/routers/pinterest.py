from fastapi import APIRouter, Depends, HTTPException
import httpx

from models.schemas import BoardsResponse, PinsResponse, Board, Pin, PinterestUser
from services.auth_service import get_current_pinterest_token

router = APIRouter()

PINTEREST_API = "https://api.pinterest.com/v5"


async def _pinterest_get(path: str, token: str, params: dict | None = None) -> dict:
    """GET from Pinterest API with auth header. params=None avoids mutable default."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{PINTEREST_API}{path}",
            headers={"Authorization": f"Bearer {token}"},
            params=params or {},
            timeout=10,
        )
    if resp.status_code == 401:
        raise HTTPException(status_code=401, detail="Pinterest token expired — please reconnect")
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Pinterest API error: {resp.text}")
    return resp.json()


@router.get("/boards", response_model=BoardsResponse)
async def get_boards(pinterest_token: str = Depends(get_current_pinterest_token)):
    """Return all boards + user info for the authenticated Pinterest user."""
    user_data   = await _pinterest_get("/user_account", pinterest_token)
    boards_data = await _pinterest_get("/boards", pinterest_token, {"page_size": 50})

    user = PinterestUser(
        id=user_data.get("id", ""),
        username=user_data.get("username", ""),
        profile_image=user_data.get("profile_image", {}).get("medium"),
    )
    boards = [
        Board(
            id=b["id"],
            name=b["name"],
            description=b.get("description"),
            pin_count=b.get("pin_count", 0),
            cover_image_url=(b.get("media", {}) or {}).get("image_cover_url"),
        )
        for b in boards_data.get("items", [])
    ]
    return BoardsResponse(user=user, boards=boards)


@router.get("/boards/{board_id}/pins", response_model=PinsResponse)
async def get_board_pins(
    board_id: str,
    page_size: int = 25,
    cursor: str | None = None,
    pinterest_token: str = Depends(get_current_pinterest_token),
):
    """Return pins for a specific board with cursor-based pagination."""
    params: dict = {"page_size": min(page_size, 100)}
    if cursor:
        params["bookmark"] = cursor

    data = await _pinterest_get(f"/boards/{board_id}/pins", pinterest_token, params)

    pins = [
        Pin(
            id=p["id"],
            title=p.get("title"),
            description=p.get("description"),
            image_url=_best_image(p),
            link=p.get("link"),
            board_id=board_id,
        )
        for p in data.get("items", [])
        if _best_image(p)
    ]
    return PinsResponse(pins=pins, board_id=board_id)


def _best_image(pin: dict) -> str:
    """Pick the highest-resolution image URL from a pin object."""
    media  = pin.get("media", {}) or {}
    images = media.get("images", {}) or {}
    for size in ("original", "1200x", "736x", "400x300", "150x150"):
        if size in images and images[size].get("url"):
            return images[size]["url"]
    return ""
