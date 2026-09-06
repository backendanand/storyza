import asyncio

import pytest

from storyza_backend.services.ai.chat import _fallback, _reply_for_action, chat_with_assistant
from storyza_backend.services.ai.voice import _keyword_fallback

ASSETS = [
    {"id": "fox-1", "kind": "character", "name": "Fox", "slug": "fox"},
    {"id": "tree-1", "kind": "prop", "name": "Tree", "slug": "tree"},
    {"id": "forest-1", "kind": "background", "name": "Forest", "slug": "bg-forest"},
]


def test_reply_for_action_names_asset() -> None:
    action = {"action": "add_object", "asset": ASSETS[0]}
    assert "Fox" in _reply_for_action(action, "add a fox", ASSETS)


def test_reply_for_action_play() -> None:
    assert "playing" in _reply_for_action({"action": "play"}, "play", ASSETS)


def test_reply_for_action_none() -> None:
    reply = _reply_for_action({"action": "none"}, "hello", ASSETS)
    assert "not sure" in reply


def test_fallback_builds_action_and_reply() -> None:
    result = _fallback("add a fox", ASSETS)
    assert result["provider"] == "keyword"
    assert result["action"] == _keyword_fallback("add a fox", ASSETS)
    assert "Fox" in result["reply"]


def test_chat_with_assistant_uses_fallback_without_key(monkeypatch: pytest.MonkeyPatch) -> None:
    from storyza_backend.services.ai.chat import settings

    monkeypatch.setattr(settings, "groq_api_key", "")

    async def run() -> dict:
        return await chat_with_assistant("forest background", [], ASSETS)

    result = asyncio.run(run())
    assert result["provider"] == "keyword"
    assert result["action"]["action"] == "set_background"
    assert result["action"]["asset"]["id"] == "forest-1"