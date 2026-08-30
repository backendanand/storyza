import uuid

import pytest
from fastapi.testclient import TestClient

from storyza_backend.core.config import settings
from storyza_backend.main import app


def _email(name: str) -> str:
    return f"{name}.{uuid.uuid4().hex[:8]}@example.com"


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


def test_health(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == settings.app_name
    assert body["environment"] == settings.app_env


def test_register_login_me(client: TestClient) -> None:
    email = _email("pilot.teacher")
    payload = {
        "email": email,
        "full_name": "Pilot Teacher",
        "password": "supersecret",
        "role": "teacher",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.text
    user = response.json()
    assert user["email"] == email
    assert user["role"] == "teacher"

    login = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "supersecret"},
    )
    assert login.status_code == 200, login.text
    tokens = login.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens

    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    me = client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["email"] == email


def test_me_requires_auth(client: TestClient) -> None:
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_register_rejects_duplicate_email(client: TestClient) -> None:
    payload = {
        "email": _email("dup"),
        "full_name": "Dup User",
        "password": "supersecret",
        "role": "student",
    }
    first = client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 201
    second = client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 409


def test_admin_route_denied_for_teacher(client: TestClient) -> None:
    email = _email("teacher2")
    client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "full_name": "Teacher",
            "password": "supersecret",
            "role": "teacher",
        },
    )
    login = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "supersecret"},
    )
    token = login.json()["access_token"]
    response = client.get(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_health_unknown_route_404(client: TestClient) -> None:
    response = client.get("/api/v1/does-not-exist")
    assert response.status_code == 404