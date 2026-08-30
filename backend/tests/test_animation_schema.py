import pytest
from pydantic import ValidationError

from storyza_backend.schemas.project import (
    AnimationTrack,
    Keyframe,
    ProjectDocument,
    ProjectObject,
    SceneObject,
)


def _doc(**overrides) -> ProjectDocument:
    values = {"title": "Test", **overrides}
    return ProjectDocument(**values)


def test_keyframe_times_must_be_sorted() -> None:
    with pytest.raises(ValidationError):
        AnimationTrack(
            id="t1",
            object_id="o1",
            property="x",
            keyframes=[Keyframe(t=1, value=10), Keyframe(t=0, value=0)],
        )


def test_keyframe_time_non_negative() -> None:
    with pytest.raises(ValidationError):
        Keyframe(t=-1, value=5)


def test_invalid_property_rejected() -> None:
    with pytest.raises(ValidationError):
        AnimationTrack(id="t1", object_id="o1", property="opacity", keyframes=[])


def test_renderer_version_must_be_v1() -> None:
    with pytest.raises(ValidationError):
        _doc(renderer_version="v2")


def test_duration_computed_from_tracks() -> None:
    doc = _doc(
        animation_tracks=[
            AnimationTrack(
                id="t1",
                object_id="o1",
                property="x",
                keyframes=[Keyframe(t=0, value=0), Keyframe(t=3.5, value=120)],
            ),
            AnimationTrack(
                id="t2",
                object_id="o1",
                property="visible",
                keyframes=[Keyframe(t=2, value=False)],
            ),
        ]
    )
    assert doc.duration == 3.5


def test_duration_zero_with_no_tracks() -> None:
    assert _doc().duration == 0.0


def test_scene_object_round_trip_with_asset() -> None:
    doc = _doc(
        scenes=[
            SceneObject(
                id="s1",
                background_id="bg-sky",
                objects=[ProjectObject(id="o1", kind="character", name="Fox", asset_id="a1")],
            )
        ]
    )
    data = doc.model_dump(mode="json")
    assert data["scenes"][0]["objects"][0]["asset_id"] == "a1"
    assert data["scenes"][0]["objects"][0]["scale"] == 1.0
    # reload from the stored JSON stays valid
    reloaded = ProjectDocument.model_validate(data)
    assert reloaded.scenes[0].objects[0].asset_id == "a1"