import asyncio

import pytest

from storyza_backend.services.ai.voice import _guard_action, _keyword_fallback

ASSETS = [
    {"id": "fox-1", "kind": "character", "name": "Fox", "slug": "fox"},
    {"id": "tree-1", "kind": "prop", "name": "Tree", "slug": "tree"},
    {"id": "forest-1", "kind": "background", "name": "Forest", "slug": "bg-forest"},
]


@pytest.mark.parametrize(
    ("transcript", "expected"),
    [
        ("add a fox", {"action": "add_object", "asset": ASSETS[0]}),
        ("put a cute fox in my scene", {"action": "add_object", "asset": ASSETS[0]}),
        ("add a tree", {"action": "add_object", "asset": ASSETS[1]}),
        ("forest background", {"action": "set_background", "asset": ASSETS[2]}),
        ("set the scene to forest", {"action": "set_background", "asset": ASSETS[2]}),
        ("play", {"action": "play"}),
        ("stop", {"action": "stop"}),
        ("make it bigger", {"action": "bigger"}),
        ("make it smaller", {"action": "smaller"}),
        ("turn it", {"action": "turn"}),
        ("delete that", {"action": "delete"}),
        ("clear everything", {"action": "reset"}),
        ("move left", {"action": "move", "direction": "left"}),
        ("move right", {"action": "move", "direction": "right"}),
        ("hello there", {"action": "none"}),
    ],
)
def test_keyword_fallback(transcript: str, expected: dict) -> None:
    result = _keyword_fallback(transcript, ASSETS)
    assert result == expected


@pytest.mark.parametrize(
    ("raw", "transcript", "expected"),
    [
        # LLM says set_background for a character -> must become add_object
        (
            {
                "action": "set_background",
                "asset": {"id": "fox-1", "kind": "character", "name": "Fox"},
            },
            "put a cute fox in my scene please",
            {"action": "add_object", "asset": ASSETS[0]},
        ),
        # LLM says add_object for a background -> must become set_background
        (
            {
                "action": "add_object",
                "asset": {"id": "forest-1", "kind": "background", "name": "Forest"},
            },
            "forest background please",
            {"action": "set_background", "asset": ASSETS[2]},
        ),
        # Non-asset actions pass through
        ({"action": "bigger"}, "make it bigger", {"action": "bigger"}),
        (
            {"action": "move", "direction": "left"},
            "move left",
            {"action": "move", "direction": "left"},
        ),
    ],
)
def test_guard_action(raw: dict, transcript: str, expected: dict) -> None:
    assert _guard_action(raw, transcript, ASSETS) == expected


@pytest.mark.parametrize(
    ("raw", "transcript"),
    [
        ({"action": "set_background", "asset": None}, "hello"),
        (
            {"action": "add_object", "asset": {"id": "unknown", "kind": "character"}},
            "add a unicorn",
        ),
    ],
)
def test_guard_action_falls_back_when_asset_missing(raw: dict, transcript: str) -> None:
    assert _guard_action(raw, transcript, ASSETS) is None


def test_parse_voice_command_is_async_callable() -> None:
    from storyza_backend.services.ai.voice import parse_voice_command

    assert asyncio.iscoroutinefunction(parse_voice_command)