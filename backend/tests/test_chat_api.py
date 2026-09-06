import uuid

import pytest
from fastapi.testclient import TestClient

from storyza_backend.main import app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


def _auth_headers(client: TestClient) -> dict:
    email = f"chat.{uuid.uuid4().hex[:8]}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "full_name": "Chat User",
            "password": "supersecret",
            "role": "student",
        },
    )
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "supersecret"})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def _create_project(client: TestClient, headers: dict) -> str:
    created = client.post(
        "/api/v1/projects",
        json={
            "title": "Chat Scene",
            "document": {
                "title": "Chat Scene",
                "scenes": [],
                "animation_tracks": [],
                "audio": [],
            },
        },
        headers=headers,
    )
    assert created.status_code == 201, created.text
    return created.json()["id"]


async def _fake_chat(message: str, history: list[dict], assets: list[dict]) -> dict:
    context = history[-1]["content"] if history else None
    if context:
        return {"reply": f"You said: {context} then {message}", "action": None, "provider": "mock"}
    return {"reply": f"Echo: {message}", "action": None, "provider": "mock"}


def test_chat_persists_and_returns_history(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from storyza_backend.api import ai as ai_api

    monkeypatch.setattr(ai_api, "chat_with_assistant", _fake_chat)
    headers = _auth_headers(client)
    project_id = _create_project(client, headers)

    first = client.post(
        "/api/v1/ai/chat",
        json={"message": "add a fox", "project_id": project_id, "assets": []},
        headers=headers,
    )
    assert first.status_code == 200, first.text
    assert first.json()["reply"] == "Echo: add a fox"
    assert len(first.json()["messages"]) == 2
    assert first.json()["messages"][0] == {"role": "user", "content": "add a fox"}
    assert first.json()["messages"][1]["role"] == "assistant"

    second = client.post(
        "/api/v1/ai/chat",
        json={"message": "make it bigger", "project_id": project_id, "assets": []},
        headers=headers,
    )
    assert second.status_code == 200
    # The mock reads the saved history, proving the assistant gets prior context.
    assert second.json()["reply"] == "You said: Echo: add a fox then make it bigger"
    assert len(second.json()["messages"]) == 4

    history = client.get(f"/api/v1/ai/chat?project_id={project_id}", headers=headers)
    assert history.status_code == 200
    assert [m["content"] for m in history.json()] == [
        "add a fox",
        "Echo: add a fox",
        "make it bigger",
        "You said: Echo: add a fox then make it bigger",
    ]


def test_chat_requires_project_and_ownership(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from storyza_backend.api import ai as ai_api

    monkeypatch.setattr(ai_api, "chat_with_assistant", _fake_chat)
    headers = _auth_headers(client)

    missing = client.post(
        "/api/v1/ai/chat",
        json={"message": "hi", "assets": []},
        headers=headers,
    )
    assert missing.status_code == 400

    other = _auth_headers(client)
    other_project = _create_project(client, other)
    forbidden = client.post(
        "/api/v1/ai/chat",
        json={"message": "hi", "project_id": other_project, "assets": []},
        headers=headers,
    )
    assert forbidden.status_code == 404