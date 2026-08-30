import uuid

import pytest
from fastapi.testclient import TestClient

from storyza_backend.main import app
from storyza_backend.schemas.project import (
    AnimationTrack,
    Keyframe,
    ProjectDocument,
    ProjectObject,
    SceneObject,
)


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


def _auth_headers(client: TestClient) -> dict:
    email = f"proj.{uuid.uuid4().hex[:8]}@example.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": email, "full_name": "Proj User", "password": "supersecret",
            "role": "student"},
    )
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "supersecret"})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def _doc(title: str) -> dict:
    return ProjectDocument(
        title=title,
        scenes=[
            SceneObject(
                id="s1",
                objects=[ProjectObject(id="o1", kind="character", name="Fox", x=10, y=20)],
            )
        ],
        animation_tracks=[
            AnimationTrack(
                id="t1",
                object_id="o1",
                property="x",
                keyframes=[Keyframe(t=0, value=10), Keyframe(t=2, value=200)],
            )
        ],
    ).model_dump(mode="json")


def test_project_round_trip_with_tracks(client: TestClient) -> None:
    headers = _auth_headers(client)
    created = client.post(
        "/api/v1/projects", json={"title": "Cycle", "document": _doc("Cycle")}, headers=headers
    )
    assert created.status_code == 201, created.text
    project_id = created.json()["id"]

    detail = client.get(f"/api/v1/projects/{project_id}", headers=headers)
    assert detail.status_code == 200
    doc = detail.json()["document"]
    assert doc["animation_tracks"][0]["keyframes"][1]["value"] == 200
    assert doc["duration"] == 2.0
    assert doc["scenes"][0]["objects"][0]["asset_id"] is None


def test_version_list_and_restore(client: TestClient) -> None:
    headers = _auth_headers(client)
    created = client.post(
        "/api/v1/projects", json={"title": "V", "document": _doc("V")}, headers=headers
    )
    project_id = created.json()["id"]

    v2_doc = _doc("V2")
    client.post(f"/api/v1/projects/{project_id}/save", json=v2_doc, headers=headers)

    versions = client.get(f"/api/v1/projects/{project_id}/versions", headers=headers)
    assert versions.status_code == 200
    items = versions.json()
    assert [v["version"] for v in items] == [2, 1]

    restore = client.post(
        f"/api/v1/projects/{project_id}/restore", json={"version": 1}, headers=headers
    )
    assert restore.status_code == 200

    detail = client.get(f"/api/v1/projects/{project_id}", headers=headers).json()
    assert detail["document"]["title"] == "V"

    after = client.get(f"/api/v1/projects/{project_id}/versions", headers=headers).json()
    assert [v["version"] for v in after] == [3, 2, 1]


def test_restore_missing_version_404(client: TestClient) -> None:
    headers = _auth_headers(client)
    created = client.post(
        "/api/v1/projects", json={"title": "V", "document": _doc("V")}, headers=headers
    )
    response = client.post(
        f"/api/v1/projects/{created.json()['id']}/restore", json={"version": 99}, headers=headers
    )
    assert response.status_code == 404