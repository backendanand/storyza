"""Voice-command understanding for the studio.

Parses a raw speech transcript into a structured scene action using the Groq
LLM API (OpenAI-compatible). Falls back to a keyword matcher when no API key is
configured so the feature stays usable in dev.

The parsed action is intentionally tiny and validated server-side so the
frontend only ever applies well-formed operations (FR-AI-001).
"""

from __future__ import annotations

import json

import httpx

from storyza_backend.core.config import settings

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

ADD_VERBS = (
    "add",
    "put",
    "place",
    "show",
    "insert",
    "give",
    "make",
    "draw",
    "bring",
    "drop",
    "want",
)
BACKGROUND_WORDS = ("background", "backdrop", "wallpaper")
MOVE_WORDS = ("move", "go", "slide", "shift", "drag")
DIRECTIONS = ("left", "right", "up", "down")

SYSTEM_PROMPT = """You are a voice assistant for a kids' animation studio app.
The user speaks a short command to build their scene. You are given the transcript
and the list of available assets. Decide the single most likely intent and respond
with ONLY a JSON object, no prose, no markdown fences.

Choose one of these exact actions:
- "add_object"   when they want to put a character or prop on the scene
- "set_background" when they want to change the background/backdrop/scene
- "play" | "stop" | "delete" | "bigger" | "smaller" | "turn" | "reset" | "save"
- "move"         when they say move/go left/right/up/down (include "direction")
- "none"         when the command is unclear or just noise

Respond in this shape:
{"action": "<action>", "asset": {"id": "<asset id>", "kind": "<kind>", "name": "<name>"} | null,
 "direction": "left"|"right"|"up"|"down"|null}

Rules:
- A character or prop asset named or requested (with verbs like add/put/place/show/
  give/bring) is ALWAYS "add_object" — never "set_background".
- "set_background" is ONLY for when they explicitly say background/backdrop/scene
  keywords OR the matched asset is a background kind.
- Only use an asset that exists in the provided assets list. Pick the best match by name or topic.
- If a background asset is named, use "set_background".
- If they name an asset AND a verb like "add"/"put", use "add_object".
- If they just say an asset name with no verb, default to "add_object" for
  non-background assets, and "set_background" for backgrounds.
- Match direction only for "move" actions.
- asset must be null when no asset is mentioned or no match exists.
"""

VOICE_ACTIONS = (
    "add_object",
    "set_background",
    "play",
    "stop",
    "delete",
    "bigger",
    "smaller",
    "turn",
    "reset",
    "move",
    "save",
    "none",
)


def _clean_action(value: object) -> str:
    action = str(value or "none").strip().lower()
    if action in VOICE_ACTIONS:
        return action
    if action == "add":
        return "add_object"
    if action == "background":
        return "set_background"
    return "none"


def _clean_direction(value: object) -> str | None:
    direction = str(value or "").strip().lower()
    return direction if direction in DIRECTIONS else None


def _pick_asset(asset: object, assets: list[dict]) -> dict | None:
    if not isinstance(asset, dict):
        return None
    asset_id = asset.get("id")
    for candidate in assets:
        if candidate["id"] == asset_id:
            return candidate
    return None


def _guard_action(raw: dict, transcript: str, assets: list[dict]) -> dict | None:
    """Re-map likely LLM mistakes so a named character/prop is never a background."""
    action = _clean_action(raw.get("action"))
    asset = _pick_asset(raw.get("asset"), assets)

    asks_background = any(word in transcript.lower() for word in BACKGROUND_WORDS)

    if action in ("add_object", "set_background"):
        if asset is None:
            return None
        is_background_kind = asset.get("kind") == "background"
        if asks_background or is_background_kind:
            return {"action": "set_background", "asset": asset}
        return {"action": "add_object", "asset": asset}

    if action == "move":
        return {"action": "move", "direction": _clean_direction(raw.get("direction"))}

    return {"action": action}


def _keyword_fallback(transcript: str, assets: list[dict]) -> dict:
    """Deterministic keyword matcher used when no Groq key is configured."""
    text = transcript.strip().lower()

    if any(word in text for word in ("start over", "clear", "reset", "wipe")):
        return {"action": "reset"}

    if "save" in text and "delete" not in text:
        return {"action": "save"}

    if any(word in text for word in ("stop", "pause", "freeze")):
        return {"action": "stop"}

    if any(word in text for word in ("play", "go", "run", "animate")):
        return {"action": "play"}

    if any(word in text for word in ("delete", "remove", "trash", "get rid")):
        return {"action": "delete"}

    if any(word in text for word in ("bigger", "grow", "larger", "enlarge", "zoom in")):
        return {"action": "bigger"}

    if any(word in text for word in ("smaller", "shrink", "zoom out")):
        return {"action": "smaller"}

    if any(word in text for word in ("turn", "rotate", "spin")):
        return {"action": "turn"}

    direction = next(
        (d for d in DIRECTIONS if f"{d}" in text and any(w in text for w in MOVE_WORDS)),
        None,
    )
    if direction:
        return {"action": "move", "direction": direction}

    matched: dict | None = None
    for candidate in assets:
        name = str(candidate.get("name") or "").lower()
        slug = str(candidate.get("slug") or "").lower()
        keys = [k for k in (name, slug) if k]
        for key in keys:
            matched_name = str(matched.get("name") or "").lower() if matched else ""
            if key and key in text and (matched is None or len(key) > len(matched_name)):
                matched = candidate
                break

    if matched is not None:
        is_background = matched.get("kind") == "background"
        asks_background = any(word in text for word in BACKGROUND_WORDS)
        if is_background or asks_background:
            return {"action": "set_background", "asset": matched}
        return {"action": "add_object", "asset": matched}

    return {"action": "none"}


async def parse_voice_command(transcript: str, assets: list[dict]) -> dict:
    """Parse a transcript into a validated scene action, preferring Groq."""
    if not settings.groq_api_key:
        return _keyword_fallback(transcript, assets)

    payload = {
        "model": settings.groq_model,
        "temperature": 0.2,
        "max_tokens": 512,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": json.dumps(
                    {"transcript": transcript, "assets": assets},
                    ensure_ascii=False,
                ),
            },
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            raw = json.loads(content)
    except (httpx.HTTPError, KeyError, IndexError, ValueError, json.JSONDecodeError):
        return _keyword_fallback(transcript, assets)

    if not isinstance(raw, dict):
        return _keyword_fallback(transcript, assets)

    guarded = _guard_action(raw, transcript, assets)
    if guarded is not None:
        return guarded

    return _keyword_fallback(transcript, assets)