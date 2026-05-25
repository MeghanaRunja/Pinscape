import os
import uuid
import base64
import mimetypes
from pathlib import Path

from Pinscape.backend.config import get_settings

settings = get_settings()
UPLOAD_DIR = Path(settings.upload_dir)
UPLOAD_DIR.mkdir(exist_ok=True)


async def save_upload(data: bytes, content_type: str, category: str) -> str:
    """
    Save raw bytes to local disk and return a storage key.
    In production: upload to S3/GCS and return the object key.
    """
    ext = mimetypes.guess_extension(content_type) or ".bin"
    if ext == ".jpe":
        ext = ".jpg"
    key = f"{category}/{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / key
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return key


def get_upload_url(key: str) -> str:
    """Return a public URL for a stored file (local dev returns a file path stub)."""
    return f"/uploads/{key}"


async def load_as_base64(key: str) -> tuple[str, str]:
    """
    Load a stored file and return (base64_string, media_type).
    Used when sending images to the Claude vision API.
    """
    path = UPLOAD_DIR / key
    if not path.exists():
        raise FileNotFoundError(f"Upload not found: {key}")
    data = path.read_bytes()
    media_type, _ = mimetypes.guess_type(str(path))
    media_type = media_type or "image/jpeg"
    return base64.standard_b64encode(data).decode(), media_type


async def fetch_url_as_base64(url: str) -> tuple[str, str]:
    """
    Download a remote URL (e.g. Pinterest CDN) and return (base64, media_type).
    """
    import httpx
    async with httpx.AsyncClient(follow_redirects=True, timeout=15) as client:
        resp = await client.get(url)
    resp.raise_for_status()
    media_type = resp.headers.get("content-type", "image/jpeg").split(";")[0]
    return base64.standard_b64encode(resp.content).decode(), media_type
