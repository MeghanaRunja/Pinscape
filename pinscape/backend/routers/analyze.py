from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Annotated
import time

from models.schemas import AnalyzeRequest, AnalyzeResponse, CategoryKey
from services.storage_service import save_upload
from services.vision_service import analyze_with_claude, VisionAnalysisError

router = APIRouter()


@router.post("/upload-photos")
async def upload_photos(
    files:    Annotated[list[UploadFile], File(description="Room / body / hand photos")],
    category: Annotated[str, Form()],
):
    """
    Upload one or more photos (JPEG/PNG/HEIC/WEBP).
    Returns storage keys the client passes back to /analyze.
    """
    # Validate category at the upload boundary too, so the error surfaces
    # immediately rather than at analysis time.
    try:
        CategoryKey(category)
    except ValueError:
        valid = ", ".join(k.value for k in CategoryKey)
        raise HTTPException(
            status_code=422,
            detail=f"Unknown category '{category}'. Valid values: {valid}",
        )

    allowed_types = {"image/jpeg", "image/png", "image/heic", "image/webp"}
    keys = []

    for file in files:
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported file type: {file.content_type}",
            )
        data = await file.read()
        if len(data) > 20 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File exceeds 20 MB limit")

        key = await save_upload(data, file.content_type, category)
        keys.append(key)

    return {"keys": keys, "count": len(keys)}


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    """
    Core endpoint — runs Claude vision over uploaded photos + pin images
    and returns 3 ranked visualisation suggestions.

    Both photo_keys and pin_image_urls must be storage keys returned by
    /upload-photos (for user-uploaded images) or http(s) Pinterest CDN
    URLs (for board pins imported directly from Pinterest).  Raw local
    file:// URIs are NOT valid — the mobile client must call /upload-photos
    on any locally-picked pin images before passing them here.
    """
    if not req.photo_keys:
        raise HTTPException(status_code=422, detail="At least one photo_key is required")
    if not req.pin_image_urls:
        raise HTTPException(status_code=422, detail="At least one pin_image_url is required")

    start = time.monotonic()
    try:
        results = await analyze_with_claude(
            category=req.category,
            photo_keys=req.photo_keys,
            pin_image_urls=req.pin_image_urls,
            angles=req.angles_covered,
        )
    except VisionAnalysisError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Storage key not found: {e}. "
                "Make sure all pin images from local picks are uploaded via "
                "/upload-photos before calling /analyze."
            ),
        )

    elapsed_ms = int((time.monotonic() - start) * 1000)
    return AnalyzeResponse(category=req.category, results=results, processing_time_ms=elapsed_ms)
