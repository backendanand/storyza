import uuid

import pytest
from fastapi.testclient import TestClient

from storyza_backend.main import app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


def _student_token(client: TestClient) -> str:
    email = f"asset.student.{uuid.uuid4().hex[:8]}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": email, "full_name": "Asset Student", "password": "supersecret",
            "role": "student"},
    )
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "supersecret"})
    return login.json()["access_token"]


def test_list_assets_requires_auth(client: TestClient) -> None:
    response = client.get("/api/v1/assets")
    assert response.status_code == 401


def test_list_assets_published_and_filtered(client: TestClient) -> None:
    token = _student_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    all_assets = client.get("/api/v1/assets", headers=headers)
    assert all_assets.status_code == 200
    body = all_assets.json()
    assert body["total"] >= 29

    backgrounds = client.get("/api/v1/assets?kind=background", headers=headers)
    assert backgrounds.status_code == 200
    kinds = {item["kind"] for item in backgrounds.json()["items"]}
    assert kinds == {"background"}

    water = client.get("/api/v1/assets?tag=water-cycle", headers=headers)
    assert water.status_code == 200
    assert water.json()["total"] >= 1

    search = client.get("/api/v1/assets?q=fox", headers=headers)
    assert search.status_code == 200
    names = {item["name"] for item in search.json()["items"]}
    assert "Fox" in names


def test_get_asset_detail(client: TestClient) -> None:
    token = _student_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    assets = client.get("/api/v1/assets?q=tree", headers=headers).json()["items"]
    assert assets
    detail = client.get(f"/api/v1/assets/{assets[0]['id']}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["media_url"].startswith("/media/assets/")
    assert detail.json()["source"] == "platform"


def test_get_missing_asset_404(client: TestClient) -> None:
    token = _student_token(client)
    response = client.get(
        f"/api/v1/assets/{uuid.uuid4()}", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404