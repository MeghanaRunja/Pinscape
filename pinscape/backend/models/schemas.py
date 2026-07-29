from pydantic import BaseModel
from typing import Optional
from enum import Enum


# ── Auth ────────────────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PinterestUser(BaseModel):
    id: str
    username: str
    profile_image: Optional[str] = None


# ── Pinterest ────────────────────────────────────────────────────────────────

class Board(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    pin_count: int
    cover_image_url: Optional[str] = None


class Pin(BaseModel):
    id: str
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: str
    link: Optional[str] = None
    board_id: str


class BoardsResponse(BaseModel):
    boards: list[Board]
    user: PinterestUser


class PinsResponse(BaseModel):
    pins: list[Pin]
    board_id: str


# ── Analyze ──────────────────────────────────────────────────────────────────

class CategoryKey(str, Enum):
    """
    Validated set of analysis categories, kept in sync with
    mobile/src/config/categories.ts.

    Using an Enum means FastAPI/Pydantic rejects unknown values with a
    clean 422 at the boundary — previously a typo (e.g. "bedrooms") would
    silently fall back to the bedroom prompt with no error at all.
    """
    BEDROOM = "bedroom"
    NAILS   = "nails"
    OUTFIT  = "outfit"
    HAIR    = "hair"
    MAKEUP  = "makeup"
    LIVING  = "living"


class AnalyzeRequest(BaseModel):
    category: CategoryKey
    photo_keys: list[str]          # storage keys returned by /upload-photos
    pin_image_urls: list[str]      # http(s) Pinterest CDN URLs or storage keys
    angles_covered: list[str] = []


class AnalysisResult(BaseModel):
    rank: int
    title: str
    description: str
    tags: list[str]
    badge: str                     # "Best match" | "Bold option" | "Minimalist pick"
    visualization_url: Optional[str] = None
    reasoning: str


class AnalyzeResponse(BaseModel):
    category: CategoryKey
    results: list[AnalysisResult]
    processing_time_ms: int
