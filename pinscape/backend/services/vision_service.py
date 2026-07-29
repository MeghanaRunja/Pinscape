import json
import httpx

from config import get_settings, CLAUDE_MODEL
from models.schemas import AnalysisResult, CategoryKey
from services.storage_service import load_as_base64, fetch_url_as_base64

settings = get_settings()

ANTHROPIC_API = "https://api.anthropic.com/v1/messages"

CATEGORY_PROMPTS: dict[str, str] = {
    "bedroom": (
        "You are an expert interior designer and AI stylist. "
        "Analyse the bedroom photos and the inspiration pin images. "
        "Identify: room dimensions (estimate), dominant colours, lighting direction, "
        "existing furniture placement, and wall space. "
        "Then suggest 3 distinct ways the pin aesthetics can be applied to THIS specific room."
    ),
    "nails": (
        "You are a professional nail artist and colour theorist. "
        "Analyse the hand photos: nail shape, nail bed width, finger length, skin undertone. "
        "Then suggest 3 nail looks from the pin images that best suit this person's hands."
    ),
    "outfit": (
        "You are a personal stylist with expertise in body proportions and fashion. "
        "Analyse the full-body photos: body silhouette, proportions, height estimate, colouring. "
        "Then suggest 3 outfit combinations from the pin images that flatter THIS specific person."
    ),
    "hair": (
        "You are a senior hairstylist and colour specialist. "
        "Analyse the hair photos: texture, density, current length, face shape, natural colour. "
        "Then suggest 3 hair transformations from the pin images suited to THIS person."
    ),
    "makeup": (
        "You are a professional makeup artist. "
        "Analyse the face photos: skin undertone, eye shape, face shape, lip fullness, brow arch. "
        "Then suggest 3 makeup looks from the pin images that enhance THIS person's features."
    ),
    "living": (
        "You are an expert interior designer specialising in living spaces. "
        "Analyse the living room photos: room size estimate, natural light sources, existing "
        "furniture, colour palette, architectural features. "
        "Then suggest 3 distinct ways the pin aesthetics can be applied to THIS specific room."
    ),
}

BADGES = ["Best match", "Bold option", "Minimalist pick"]

RESPONSE_SCHEMA = """
Return ONLY a valid JSON array with exactly 3 objects. No prose before or after.
Each object must have:
{
  "rank": <1|2|3>,
  "title": "<short evocative title, max 6 words>",
  "description": "<2-3 sentences explaining WHY this works for their specific space/body/features. Reference concrete details you observed.>",
  "tags": ["<tag1>", "<tag2>", "<tag3>"],
  "reasoning": "<1 sentence: the single most important observation that drives this recommendation>"
}
"""

# Simple in-memory cache for fetched remote pin images (Pinterest CDN).
# Avoids re-downloading the same image on repeated /analyze calls.
# Not bounded or persisted — fine for dev; use Redis/LRU in production.
_pin_cache: dict[str, tuple[str, str]] = {}


class VisionAnalysisError(Exception):
    """Raised when Claude's response cannot be parsed into valid results."""


def _build_image_block(b64: str, media_type: str) -> dict:
    return {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64}}


async def _resolve_image(ref: str) -> tuple[str, str]:
    """Resolve a URL (Pinterest CDN) or storage key to (base64, media_type)."""
    if ref.startswith("http"):
        if ref not in _pin_cache:
            _pin_cache[ref] = await fetch_url_as_base64(ref)
        return _pin_cache[ref]
    return await load_as_base64(ref)


async def analyze_with_claude(
    category: CategoryKey,
    photo_keys: list[str],
    pin_image_urls: list[str],
    angles: list[str],
) -> list[AnalysisResult]:
    """
    Send user photos + pin images to Claude (vision) and return 3 ranked
    AnalysisResult objects.
    """
    cat_value = category.value if isinstance(category, CategoryKey) else str(category)
    system_prompt = CATEGORY_PROMPTS[cat_value]   # KeyError impossible — validated by schema

    content: list[dict] = []

    # Section 1 — user's own photos
    n = len(photo_keys)
    content.append({"type": "text", "text": f"## User's {cat_value} photos ({n} image{'s' if n != 1 else ''})"})
    if angles:
        content.append({"type": "text", "text": f"Angles covered: {', '.join(angles)}"})
    for key in photo_keys:
        b64, mt = await _resolve_image(key)
        content.append(_build_image_block(b64, mt))

    # Section 2 — pin inspiration images
    n = len(pin_image_urls)
    content.append({"type": "text", "text": f"\n## Pin inspiration images ({n} image{'s' if n != 1 else ''})"})
    for url in pin_image_urls:
        b64, mt = await _resolve_image(url)
        content.append(_build_image_block(b64, mt))

    # Section 3 — structured output instructions
    content.append({"type": "text", "text": f"\n## Your task\n{RESPONSE_SCHEMA}"})

    payload = {
        "model": CLAUDE_MODEL,
        # 3 detailed JSON objects with descriptions can exceed 1500 tokens;
        # truncated output causes json.loads to fail.  2048 gives headroom.
        "max_tokens": 2048,
        "system": system_prompt,
        "messages": [{"role": "user", "content": content}],
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            ANTHROPIC_API,
            json=payload,
            headers={
                "x-api-key":          settings.anthropic_api_key,
                "anthropic-version":  "2023-06-01",
                "content-type":       "application/json",
            },
        )

    if resp.status_code != 200:
        raise RuntimeError(f"Claude API error {resp.status_code}: {resp.text}")

    raw = resp.json()["content"][0]["text"].strip()

    # Strip accidental markdown fences
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        items: list[dict] = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise VisionAnalysisError(f"Claude returned non-JSON output: {exc}") from exc

    if not isinstance(items, list) or not items:
        raise VisionAnalysisError("Claude returned an empty or non-list result")

    results: list[AnalysisResult] = []
    for i, item in enumerate(items[:3]):
        if not isinstance(item, dict) or "title" not in item or "description" not in item:
            continue  # skip malformed individual items rather than crashing
        results.append(AnalysisResult(
            rank=item.get("rank", i + 1),
            title=item["title"],
            description=item["description"],
            tags=item.get("tags", []),
            badge="",          # assigned after sorting — see below
            reasoning=item.get("reasoning", ""),
        ))

    if not results:
        raise VisionAnalysisError("Claude's response contained no usable results")

    # Sort by rank THEN assign badges so the badge always reflects position
    # in the final sorted order, not the arbitrary order Claude returned items.
    results.sort(key=lambda r: r.rank)
    for i, r in enumerate(results):
        r.badge = BADGES[i] if i < len(BADGES) else BADGES[-1]

    return results
