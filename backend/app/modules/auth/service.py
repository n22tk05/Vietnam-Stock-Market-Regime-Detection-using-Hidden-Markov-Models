from __future__ import annotations

import asyncio
import secrets
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.enums import UserStatus
from app.common.utils import hash_token, utc_now
from app.core.config import Settings
from app.core.exceptions import AuthenticationError, ConflictError
from app.core.security import (
    EncodedToken,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.modules.auth.repository import (
    PasswordResetTokenRepository,
    RefreshTokenRepository,
)
from app.modules.auth.schemas import (
    AuthSessionRead,
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    TokenPair,
)
from app.modules.users.models import PasswordResetToken, RefreshToken, User, UserPreference
from app.modules.users.repository import UserPreferenceRepository, UserRepository
from app.modules.users.schemas import UserRead

PASSWORD_RESET_TOKEN_TTL = timedelta(hours=1)


@dataclass(frozen=True, slots=True)
class PasswordResetIssue:
    """Internal hand-off to an email delivery provider; never serialize this object."""

    email: str
    token: str
    expires_at: datetime


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


class AuthService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.settings = settings
        self.users = UserRepository(session)
        self.preferences = UserPreferenceRepository(session)
        self.refresh_tokens = RefreshTokenRepository(session)
        self.reset_tokens = PasswordResetTokenRepository(session)

    async def register(self, payload: RegisterRequest) -> AuthSessionRead:
        if await self.users.get_by_email(str(payload.email)) is not None:
            raise ConflictError("An account with this email already exists")

        password_hash = await asyncio.to_thread(hash_password, payload.password)
        user = User(
            email=str(payload.email),
            password_hash=password_hash,
            full_name=payload.full_name,
        )
        await self.users.add(user)
        await self.preferences.add(UserPreference(user_id=user.id))
        token_pair = await self._issue_token_pair(user)
        try:
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            raise ConflictError("An account with this email already exists") from exc
        await self.session.refresh(user)
        return AuthSessionRead(user=UserRead.model_validate(user), tokens=token_pair)

    async def login(self, payload: LoginRequest) -> AuthSessionRead:
        user = await self.users.get_by_email(str(payload.email))
        if user is None:
            raise AuthenticationError("Invalid email or password")
        password_valid = await asyncio.to_thread(
            verify_password,
            payload.password,
            user.password_hash,
        )
        if not password_valid:
            raise AuthenticationError("Invalid email or password")
        self._require_active(user)

        user.last_login_at = utc_now()
        token_pair = await self._issue_token_pair(user)
        await self.session.commit()
        await self.session.refresh(user)
        return AuthSessionRead(user=UserRead.model_validate(user), tokens=token_pair)

    async def refresh(self, raw_token: str) -> AuthSessionRead:
        payload = decode_token(raw_token, self.settings, expected_type="refresh")
        user_id = self._claim_uuid(payload.get("sub"), "subject")
        self._claim_uuid(payload.get("jti"), "token identifier")

        stored = await self.refresh_tokens.get_by_hash_for_update(hash_token(raw_token))
        now = utc_now()
        if (
            stored is None
            or stored.user_id != user_id
            or stored.revoked_at is not None
            or _as_utc(stored.expires_at) <= now
        ):
            raise AuthenticationError("Refresh token is invalid or has been revoked")

        user = await self.users.get_by_id_for_update(user_id)
        if user is None:
            raise AuthenticationError("Refresh token subject is invalid")
        self._require_active(user)

        stored.revoked_at = now
        token_pair = await self._issue_token_pair(user)
        await self.session.commit()
        await self.session.refresh(user)
        return AuthSessionRead(user=UserRead.model_validate(user), tokens=token_pair)

    async def logout(self, raw_token: str) -> None:
        payload = decode_token(raw_token, self.settings, expected_type="refresh")
        user_id = self._claim_uuid(payload.get("sub"), "subject")
        stored = await self.refresh_tokens.get_by_hash_for_update(hash_token(raw_token))
        if stored is not None and stored.user_id == user_id and stored.revoked_at is None:
            stored.revoked_at = utc_now()
            await self.session.commit()

    async def request_password_reset(self, email: str) -> PasswordResetIssue | None:
        user = await self.users.get_by_email(email)
        if user is None or user.status != UserStatus.ACTIVE:
            return None

        now = utc_now()
        await self.reset_tokens.invalidate_active_for_user(user.id, now)
        raw_token = secrets.token_urlsafe(48)
        expires_at = now + PASSWORD_RESET_TOKEN_TTL
        await self.reset_tokens.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=hash_token(raw_token),
                expires_at=expires_at,
            )
        )
        await self.session.commit()
        return PasswordResetIssue(
            email=user.email,
            token=raw_token,
            expires_at=expires_at,
        )

    async def reset_password(self, *, raw_token: str, new_password: str) -> None:
        stored = await self.reset_tokens.get_by_hash_for_update(hash_token(raw_token))
        now = utc_now()
        if stored is None or stored.used_at is not None or _as_utc(stored.expires_at) <= now:
            raise AuthenticationError("Password reset token is invalid or expired")

        user = await self.users.get_by_id_for_update(stored.user_id)
        if user is None:
            raise AuthenticationError("Password reset token subject is invalid")
        self._require_active(user)
        user.password_hash = await asyncio.to_thread(hash_password, new_password)
        stored.used_at = now
        await self.refresh_tokens.revoke_all_for_user(user.id, now)
        await self.session.commit()

    async def change_password(self, *, user: User, payload: ChangePasswordRequest) -> None:
        locked_user = await self.users.get_by_id_for_update(user.id)
        if locked_user is None:
            raise AuthenticationError("User account no longer exists")
        current_valid = await asyncio.to_thread(
            verify_password,
            payload.current_password,
            locked_user.password_hash,
        )
        if not current_valid:
            raise AuthenticationError("Current password is incorrect")
        locked_user.password_hash = await asyncio.to_thread(
            hash_password,
            payload.new_password,
        )
        await self.refresh_tokens.revoke_all_for_user(locked_user.id, utc_now())
        await self.session.commit()

    async def _issue_token_pair(self, user: User) -> TokenPair:
        access = create_access_token(user.id, self.settings)
        refresh = create_refresh_token(user.id, self.settings)
        await self._store_refresh_token(user.id, refresh)
        return TokenPair(
            access_token=access.token,
            refresh_token=refresh.token,
            access_token_expires_at=access.expires_at,
            refresh_token_expires_at=refresh.expires_at,
        )

    async def _store_refresh_token(self, user_id: uuid.UUID, encoded: EncodedToken) -> RefreshToken:
        return await self.refresh_tokens.add(
            RefreshToken(
                user_id=user_id,
                token_hash=hash_token(encoded.token),
                expires_at=encoded.expires_at,
            )
        )

    @staticmethod
    def _claim_uuid(value: object, name: str) -> uuid.UUID:
        try:
            return uuid.UUID(str(value))
        except (TypeError, ValueError, AttributeError) as exc:
            raise AuthenticationError(f"Refresh token {name} is invalid") from exc

    @staticmethod
    def _require_active(user: User) -> None:
        if user.status != UserStatus.ACTIVE:
            raise AuthenticationError("User account is not active")
