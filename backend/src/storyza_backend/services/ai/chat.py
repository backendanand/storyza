"""Text chat with the studio's AI assistant ("Story Buddy").

Unlike the single-shot voice parser, the chat endpoint keeps a short conversation
history, returns a friendly reply, and optionally emits a scene action so a chat
message can also build the animation (FR-AI-003). Falls back to keyword parsing
and canned replies when no Groq key is configured.
"""

from __future__ import annotations

import json

import httpx

from storyza_backend.core.config import settings
from storyza_backend.services.ai.voice import (
    GROQ_URL,
    _guard_action,
    _keyword_fallback,
)

CHAT_SYSTEM_PROMPT = (
    """You are "Story Buddy", a cheerful assistant inside a kids' animation studio app.
Children type short messages to you. Help them build their scene and make their story.
You are given the list of available assets (characters, props, backgrounds).

Rules:
- Keep replies short, friendly and age-appropriate (at most 2 short sentences).
- If the child wants to change the scene (add a character or prop, change the
  background, play, stop, move, make bigger/smaller, turn, delete, reset, save),
  you MUST also emit an "action" using the exact app vocabulary below.
- Actions:
  - "add_object"      when putting a character or prop on the scene
  - "set_background"  ONLY when changing the background/backdrop/scene
  - "play" | "stop" | "delete" | "bigger" | "smaller" | "turn" | "move" | "reset" | "save"
  - "move" includes "direction" (left/right/up/down)
  - "none" when the child is just asking a question or chatting
- If the child names an asset that exists in the provided assets list, pick the
  best match by name and put it in "asset" as {"id", "kind", "name"}.
- "asset" must be null when no asset is mentioned or no match exists.
- Answer questions about storytelling and animation kindly.

Respond with ONLY a JSON object, no prose, no markdown fences, in this exact shape:
{"reply": "<your friendly reply>", "action": "add_object",
 "asset": {"id": "...", "kind": "...", "name": "..."} | null,
 "direction": "left" | null}
"""
)

FALLBACK_REPLIES = {
    "add_object": "Done! I put that on your scene ✨",
    "set_background": "There! I changed the background for you 🎨",
    "play": "Your animation is playing now ▶️",
    "stop": "Stopped the animation ⏹",
    "delete": "I removed that from your scene 🗑️",
    "bigger": "Made it bigger! 🔍",
    "smaller": "Made it smaller! 🔎",
    "turn": "Turned it around ↻",
    "move": "Moved it for you 🎈",
    "reset": "Fresh scene, all ready to go ✨",
    "save": "Saved! 💾",
    "none": "I'm not sure what you mean. Try 'add a fox' or ask me for a story idea!",
}


def _reply_for_action(action: dict | None, message: str, assets: list[dict]) -> str:
    action_name = (action or {}).get("action")
    asset = (action or {}).get("asset") if isinstance((action or {}).get("asset"), dict) else None
    name = (asset or {}).get("name") if asset else None

    if action_name == "add_object" and name:
        return f"Done! I put {name} on your scene ✨"
    if action_name == "set_background" and name:
        return f"There! I changed the background to {name} 🎨"
    return FALLBACK_REPLIES.get(action_name or "none", FALLBACK_REPLIES["none"])


def _fallback(message: str, assets: list[dict]) -> dict:
    action = _keyword_fallback(message, assets)
    return {
        "reply": _reply_for_action(action, message, assets),
        "action": action,
        "provider": "keyword",
    }


async def _groq_complete(messages: list[dict]) -> str:
    payload = {
        "model": settings.groq_model,
        "temperature": 0.7,
        "max_tokens": 600,
        "messages": messages,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {settings.groq_api_key}"},
            json=payload,
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def chat_with_assistant(message: str, history: list[dict], assets: list[dict]) -> dict:
    if not settings.groq_api_key:
        return _fallback(message, assets)

    messages = [
        {"role": "system", "content": CHAT_SYSTEM_PROMPT},
        *[
            {"role": m.get("role", "user"), "content": m.get("content", "")}
            for m in history
            if m.get("content")
        ],
        {
            "role": "user",
            "content": json.dumps({"message": message, "assets": assets}, ensure_ascii=False),
        },
    ]

    try:
        content = await _groq_complete(messages)
        raw = json.loads(content)
    except (httpx.HTTPError, KeyError, IndexError, ValueError, json.JSONDecodeError):
        return _fallback(message, assets)

    if not isinstance(raw, dict):
        return _fallback(message, assets)

    reply = str(raw.get("reply") or "").strip()
    action = _guard_action(raw, message, assets) if raw.get("action") else None
    if not reply:
        reply = _reply_for_action(action or _keyword_fallback(message, assets), message, assets)
    return {"reply": reply, "action": action, "provider": "groq"}