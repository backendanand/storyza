import pytest

from storyza_backend.schemas.project import ProjectDocument, ProjectObject, SceneObject


def test_minimal_project_document() -> None:
    doc = ProjectDocument(title="My Story")
    assert doc.schema_version == 1
    assert doc.renderer_version == "v1"
    assert doc.scenes == []
    assert doc.animation_tracks == []


def test_scene_with_object() -> None:
    scene = SceneObject(
        id="scene-1",
        background_id="bg-sky",
        objects=[ProjectObject(id="obj-1", kind="character", name="Fox")],
    )
    assert scene.objects[0].x == 0.0
    assert scene.objects[0].visible is True


def test_schema_version_must_be_positive() -> None:
    with pytest.raises(ValueError):
        ProjectDocument(title="bad", schema_version=0)


def test_serializes_to_json() -> None:
    doc = ProjectDocument(title="JSON Round Trip")
    data = doc.model_dump(mode="json")
    assert data["title"] == "JSON Round Trip"
    assert data["schema_version"] == 1