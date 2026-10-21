from __future__ import annotations

import uuid
from datetime import datetime
from typing import cast

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.models import PasswordResetToken, RefreshToken
from app.repositories.base import AsyncRepository


class RefreshTokenRepository(AsyncRepository[RefreshToken]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, RefreshToken)

    async def get_by_hash_for_update(self, token_hash: str) -> RefreshToken | None:
        statement = (
            select(RefreshToken).where(RefreshToken.token_hash == token_hash).with_for_update()
        )
        return cast(RefreshToken | None, await self.session.scalar(statement))

    async def revoke_all_for_user(self, user_id: uuid.UUID, revoked_at: datetime) -> None:
        statement = (
            update(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked_at.is_(None),
            )
            .values(revoked_at=revoked_at)
        )
        await self.session.execute(statement)


class PasswordResetTokenRepository(AsyncRepository[PasswordResetToken]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, PasswordResetToken)

    async def get_by_hash_for_update(self, token_hash: str) -> PasswordResetToken | None:
        statement = (
            select(PasswordResetToken)
            .where(PasswordResetToken.token_hash == token_hash)
            .with_for_update()
        )
        return cast(PasswordResetToken | None, await self.session.scalar(statement))

    async def invalidate_active_for_user(self, user_id: uuid.UUID, used_at: datetime) -> None:
        statement = (
            update(PasswordResetToken)
            .where(
                PasswordResetToken.user_id == user_id,
                PasswordResetToken.used_at.is_(None),
            )
            .values(used_at=used_at)
        )
        await self.session.execute(statement)
