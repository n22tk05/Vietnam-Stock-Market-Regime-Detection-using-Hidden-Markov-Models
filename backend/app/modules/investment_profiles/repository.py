from __future__ import annotations

import uuid
from typing import cast

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.investment_profiles.models import InvestmentProfile
from app.repositories.base import AsyncRepository


class InvestmentProfileRepository(AsyncRepository[InvestmentProfile]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, InvestmentProfile)

    async def get_active_by_user_id(self, user_id: uuid.UUID) -> InvestmentProfile | None:
        statement = select(InvestmentProfile).where(
            InvestmentProfile.user_id == user_id,
            InvestmentProfile.is_active.is_(True),
        )
        return cast(InvestmentProfile | None, await self.session.scalar(statement))

    async def get_active_by_user_id_for_update(
        self, user_id: uuid.UUID
    ) -> InvestmentProfile | None:
        statement = (
            select(InvestmentProfile)
            .where(
                InvestmentProfile.user_id == user_id,
                InvestmentProfile.is_active.is_(True),
            )
            .with_for_update()
        )
        return cast(InvestmentProfile | None, await self.session.scalar(statement))
