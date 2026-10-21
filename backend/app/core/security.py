from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import jwt
from pwdlib import PasswordHash

from app.core.config import Settings
from app.core.exceptions import AuthenticationError

password_hasher = PasswordHash.recommended()


@dataclass(frozen=True, slots=True)
class EncodedToken:
    token: str
    jti: uuid.UUID
    expires_at: datetime


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_hasher.verify(password, password_hash)


def _encode_token(
    *,
    user_id: uuid.UUID,
    token_type: Literal["access", "refresh"],
    lifetime: timedelta,
    settings: Settings,
) -> EncodedToken:
    issued_at = datetime.now(UTC)
    expires_at = issued_at + lifetime
    jti = uuid.uuid4()
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "jti": str(jti),
        "type": token_type,
        "iat": issued_at,
        "exp": expires_at,
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return EncodedToken(token=token, jti=jti, expires_at=expires_at)


def create_access_token(user_id: uuid.UUID, settings: Settings) -> EncodedToken:
    return _encode_token(
        user_id=user_id,
        token_type="access",  # noqa: S106 - JWT claim type, not a credential
        lifetime=timedelta(minutes=settings.jwt_access_token_expire_minutes),
        settings=settings,
    )


def create_refresh_token(user_id: uuid.UUID, settings: Settings) -> EncodedToken:
    return _encode_token(
        user_id=user_id,
        token_type="refresh",  # noqa: S106 - JWT claim type, not a credential
        lifetime=timedelta(days=settings.jwt_refresh_token_expire_days),
        settings=settings,
    )


def decode_token(token: str, settings: Settings, *, expected_type: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError as exc:
        raise AuthenticationError("Token has expired") from exc
    except jwt.PyJWTError as exc:
        raise AuthenticationError("Token is invalid") from exc
    if payload.get("type") != expected_type or not payload.get("sub") or not payload.get("jti"):
        raise AuthenticationError("Token type or claims are invalid")
    return payload
