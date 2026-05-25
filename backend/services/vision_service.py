import json
import httpx
from typing import Any

from Pinscape.backend.config import get_settings
from Pinscape.backend.models.schemas import AnalysisResult
from Pinscape.backend.services.storage_service import load_as_base64, fetch_url_as_base64

settings = get_settings()

ANTHROPIC_API = "https://api.anthropic.com/v1/messages"
MODEL = "claude-sonnet-4-20250514"

# Category-specific instructions for the prompt
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


def _build_image_block(b64: str, media_type: str) -> dict:
    return {
        "type": "image",
        "source": {
            "type": "base64",
            "media_type": media_type,
            "data": b64,
        },
    }


async def analyze_with_claude(
    category: str,
    photo_keys: list[str],
    pin_image_urls: list[str],
    angles: list[str],
) -> list[AnalysisResult]:
    """
    Sends user photos + pin images to Claude claude-sonnet-4-20250514 (vision) and returns
    3 structured AnalysisResult objects.
    """
    system_prompt = CATEGORY_PROMPTS.get(category, CATEGORY_PROMPTS["bedroom"])

    content: list[dict] = []

    # -- Section 1: user's photos
    content.append({"type": "text", "text": f"## User's {category} photos ({len(photo_keys)} image{'s' if len(photo_keys) > 1 else ''})"})
    if angles:
        content.append({"type": "text", "text": f"Angles covered: {', '.join(angles)}"})

    for key in photo_keys:
        b64, mt = await load_as_base64(key)
        content.append(_build_image_block(b64, mt))

    # -- Section 2: pin inspiration images
    content.append({"type": "text", "text": f"\n## Pin inspiration images ({len(pin_image_urls)} image{'s' if len(pin_image_urls) > 1 else ''})"})

    for url in pin_image_urls:
        if url.startswith("http"):
            b64, mt = await fetch_url_as_base64(url)
        else:
            b64, mt = await load_as_base64(url)
        content.append(_build_image_block(b64, mt))

    # -- Section 3: task
    content.append({
        "type": "text",
        "text": f"\n## Your task\n{RESPONSE_SCHEMA}",
    })

    # -- Call Claude
    payload = {
        "model": MODEL,
        "max_tokens": 1500,
        "system": system_prompt,
        "messages": [{"role": "user", "content": content}],
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            ANTHROPIC_API,
            json=payload,
            headers={
                "x-api-key": settings.anthropic_api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
        )

    if resp.status_code != 200:
        raise RuntimeError(f"Claude API error {resp.status_code}: {resp.text}")

    raw_text = resp.json()["content"][0]["text"].strip()

    # Strip accidental markdown fences
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
    raw_text = raw_text.strip()

    items: list[dict] = json.loads(raw_text)

    results = []
    for i, item in enumerate(items[:3]):
        results.append(
            AnalysisResult(
                rank=item.get("rank", i + 1),
                title=item["title"],
                description=item["description"],
                tags=item.get("tags", []),
                badge=BADGES[i],
                reasoning=item.get("reasoning", ""),
            )
        )

    return sorted(results, key=lambda r: r.rank)
