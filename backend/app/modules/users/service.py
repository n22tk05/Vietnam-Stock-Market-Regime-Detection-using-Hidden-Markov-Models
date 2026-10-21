from __future__ import annotations

import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, ResourceNotFoundError
from app.modules.users.models import User, UserPreference
from app.modules.users.repository import UserPreferenceRepository, UserRepository
from app.modules.users.schemas import UserPreferenceUpdate, UserUpdate


class UserService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.preferences = UserPreferenceRepository(session)

    async def update_user(self, *, user_id: uuid.UUID, payload: UserUpdate) -> User:
        user = await self.users.get_by_id_for_update(user_id)
        if user is None:
            raise ResourceNotFoundError("User was not found")

        changes = payload.model_dump(exclude_unset=True)
        new_email = changes.get("email")
        if new_email is not None and new_email != user.email:
            other = await self.users.get_by_email(new_email)
            if other is not None and other.id != user.id:
                raise ConflictError("An account with this email already exists")
            user.email = new_email
            user.email_verified_at = None
        if "full_name" in changes:
            user.full_name = changes["full_name"]

        try:
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            raise ConflictError("An account with this email already exists") from exc
        await self.session.refresh(user)
        return user

    async def get_preferences(self, *, user_id: uuid.UUID) -> UserPreference:
        preference = await self.preferences.get_by_user_id(user_id)
        if preference is not None:
            return preference

        preference = UserPreference(user_id=user_id)
        await self.preferences.add(preference)
        try:
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            preference = await self.preferences.get_by_user_id(user_id)
            if preference is None:
                raise
        return preference

    async def update_preferences(
        self, *, user_id: uuid.UUID, payload: UserPreferenceUpdate
    ) -> UserPreference:
        preference = await self.preferences.get_by_user_id_for_update(user_id)
        if preference is None:
            preference = UserPreference(user_id=user_id)
            await self.preferences.add(preference)

        for name, value in payload.model_dump(exclude_unset=True).items():
            setattr(preference, name, value)
        await self.session.commit()
        await self.session.refresh(preference)
        return preference
