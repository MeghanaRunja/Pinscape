from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import Annotated
import time
import uuid
import os
import json

from models.schemas import AnalyzeRequest, AnalyzeResponse
from services.storage_service import save_upload, get_upload_url
from services.vision_service import analyze_with_claude
from services.auth_service import get_current_pinterest_token

router = APIRouter()


@router.post("/upload-photos")
async def upload_photos(
    files: Annotated[list[UploadFile], File(description="Room / body / hand photos")],
    category: Annotated[str, Form()],
):
    """
    Upload one or more photos (JPEG/PNG/HEIC).
    Returns storage keys the client passes back to /analyze.
    """
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
    Core endpoint — runs Claude vision over the uploaded photos + pin images
    and returns 3 ranked visualisation suggestions.

    Flow:
      1. Resolve storage keys → base64 blobs
      2. Build a structured prompt describing the category
      3. Call Claude claude-sonnet-4-20250514 with vision
      4. Parse + return structured results
    """
    if not req.photo_keys:
        raise HTTPException(status_code=422, detail="At least one photo is required")
    if not req.pin_image_urls:
        raise HTTPException(status_code=422, detail="At least one pin image is required")

    start = time.monotonic()
    results = await analyze_with_claude(
        category=req.category,
        photo_keys=req.photo_keys,
        pin_image_urls=req.pin_image_urls,
        angles=req.angles_covered,
    )
    elapsed_ms = int((time.monotonic() - start) * 1000)

    return AnalyzeResponse(
        category=req.category,
        results=results,
        processing_time_ms=elapsed_ms,
    )
