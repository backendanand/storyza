import pytest

from storyza_backend.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_hash_roundtrip() -> None:
    hashed = hash_password("correct horse battery staple")
    assert verify_password("correct horse battery staple", hashed)
    assert not verify_password("wrong password", hashed)


def test_password_hash_salts() -> None:
    assert hash_password("same") != hash_password("same")


def test_access_token_roundtrip() -> None:
    token = create_access_token("user-123")
    payload = decode_token(token, "access")
    assert payload["sub"] == "user-123"
    assert payload["type"] == "access"


def test_refresh_token_not_valid_as_access() -> None:
    token = create_refresh_token("user-123")
    with pytest.raises(ValueError):
        decode_token(token, "access")
    assert decode_token(token, "refresh")["sub"] == "user-123"