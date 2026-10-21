from __future__ import annotations

import uuid
from typing import cast

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.models import User, UserPreference
from app.repositories.base import AsyncRepository


class UserRepository(AsyncRepository[User]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, User)

    async def get_by_email(self, email: str) -> User | None:
        statement = select(User).where(func.lower(User.email) == email.lower())
        return cast(User | None, await self.session.scalar(statement))

    async def get_by_id_for_update(self, user_id: uuid.UUID) -> User | None:
        statement = select(User).where(User.id == user_id).with_for_update()
        return cast(User | None, await self.session.scalar(statement))


class UserPreferenceRepository(AsyncRepository[UserPreference]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, UserPreference)

    async def get_by_user_id(self, user_id: uuid.UUID) -> UserPreference | None:
        return cast(
            UserPreference | None,
            await self.session.scalar(
                select(UserPreference).where(UserPreference.user_id == user_id)
            ),
        )

    async def get_by_user_id_for_update(self, user_id: uuid.UUID) -> UserPreference | None:
        statement = (
            select(UserPreference).where(UserPreference.user_id == user_id).with_for_update()
        )
        return cast(UserPreference | None, await self.session.scalar(statement))
