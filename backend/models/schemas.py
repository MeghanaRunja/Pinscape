from pydantic import BaseModel, HttpUrl
from typing import Optional


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

class AnalyzeRequest(BaseModel):
    category: str                    # bedroom | nails | outfit | hair | makeup | living
    photo_keys: list[str]            # storage keys for uploaded user photos
    pin_image_urls: list[str]        # Pinterest CDN URLs  OR  uploaded pin storage keys
    angles_covered: list[str] = []   # optional metadata


class AnalysisResult(BaseModel):
    rank: int                        # 1 = best match
    title: str
    description: str
    tags: list[str]
    badge: str                       # "Best match" | "Bold option" | "Minimalist pick"
    visualization_url: Optional[str] = None   # AI-generated image URL (future)
    reasoning: str


class AnalyzeResponse(BaseModel):
    category: str
    results: list[AnalysisResult]
    processing_time_ms: int
