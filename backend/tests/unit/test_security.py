from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.core.config import Settings
from app.core.exceptions import AuthenticationError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

TEST_SIGNING_MATERIAL = "unit-test-signing-material-longer-than-32-characters"


@pytest.fixture
def token_settings() -> Settings:
    return Settings(
        jwt_secret_key=TEST_SIGNING_MATERIAL,
        jwt_access_token_expire_minutes=7,
        jwt_refresh_token_expire_days=9,
    )


def test_password_hashing_is_salted_and_verifiable() -> None:
    first = hash_password("A-safe-password-123!")
    second = hash_password("A-safe-password-123!")

    assert first != second
    assert "A-safe-password-123!" not in first
    assert verify_password("A-safe-password-123!", first) is True
    assert verify_password("wrong-password", first) is False


def test_access_and_refresh_tokens_have_distinct_type_and_jti(
    token_settings: Settings,
) -> None:
    user_id = uuid.uuid4()
    access = create_access_token(user_id, token_settings)
    refresh = create_refresh_token(user_id, token_settings)

    access_claims = decode_token(access.token, token_settings, expected_type="access")
    refresh_claims = decode_token(refresh.token, token_settings, expected_type="refresh")

    assert access_claims["sub"] == str(user_id)
    assert access_claims["jti"] == str(access.jti)
    assert refresh_claims["jti"] == str(refresh.jti)
    assert access.jti != refresh.jti
    assert timedelta(minutes=6, seconds=55) <= access.expires_at - datetime.now(UTC)
    assert timedelta(days=8, hours=23) <= refresh.expires_at - datetime.now(UTC)


def test_decode_token_rejects_wrong_type(token_settings: Settings) -> None:
    refresh = create_refresh_token(uuid.uuid4(), token_settings)

    with pytest.raises(AuthenticationError, match="Token type or claims are invalid"):
        decode_token(refresh.token, token_settings, expected_type="access")


def test_decode_token_rejects_expired_and_tampered_tokens(token_settings: Settings) -> None:
    expired = jwt.encode(
        {
            "sub": str(uuid.uuid4()),
            "jti": str(uuid.uuid4()),
            "type": "access",
            "iat": datetime.now(UTC) - timedelta(minutes=2),
            "exp": datetime.now(UTC) - timedelta(minutes=1),
        },
        token_settings.jwt_secret_key,
        algorithm=token_settings.jwt_algorithm,
    )
    with pytest.raises(AuthenticationError, match="expired"):
        decode_token(expired, token_settings, expected_type="access")

    valid = create_access_token(uuid.uuid4(), token_settings).token
    header, payload, signature = valid.split(".")
    replacement = "A" if signature[0] != "A" else "B"
    tampered = ".".join((header, payload, replacement + signature[1:]))
    with pytest.raises(AuthenticationError, match="invalid"):
        decode_token(tampered, token_settings, expected_type="access")
