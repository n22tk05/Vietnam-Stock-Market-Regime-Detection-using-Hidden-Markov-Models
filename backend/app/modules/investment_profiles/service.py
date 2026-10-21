from __future__ import annotations

import uuid
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.exceptions import AppError, ConflictError, ResourceNotFoundError
from app.modules.investment_profiles.models import InvestmentProfile
from app.modules.investment_profiles.repository import InvestmentProfileRepository
from app.modules.investment_profiles.schemas import (
    InvestmentProfileCreate,
    InvestmentProfileUpdate,
)

MONEY_QUANTUM = Decimal("0.01")
RATE_QUANTUM = Decimal("0.000001")


class InvalidInvestmentProfileError(AppError):
    code = "INVALID_INVESTMENT_PROFILE"


class InvestmentProfileService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.settings = settings
        self.profiles = InvestmentProfileRepository(session)

    async def get_active(self, *, user_id: uuid.UUID) -> InvestmentProfile:
        profile = await self.profiles.get_active_by_user_id(user_id)
        if profile is None:
            raise ResourceNotFoundError("Active investment profile was not found")
        return profile

    async def create(
        self, *, user_id: uuid.UUID, payload: InvestmentProfileCreate
    ) -> InvestmentProfile:
        if await self.profiles.get_active_by_user_id(user_id) is not None:
            raise ConflictError("User already has an active investment profile")
        self._validate_capital(payload.capital)
        profile = InvestmentProfile(
            user_id=user_id,
            capital=self._money(payload.capital),
            risk_appetite=payload.risk_appetite,
            investment_horizon=payload.investment_horizon,
            expected_return=self._rate(payload.expected_return),
            maximum_drawdown=self._rate(payload.maximum_drawdown),
            is_active=True,
        )
        await self.profiles.add(profile)
        try:
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            raise ConflictError("User already has an active investment profile") from exc
        await self.session.refresh(profile)
        return profile

    async def update(
        self, *, user_id: uuid.UUID, payload: InvestmentProfileUpdate
    ) -> InvestmentProfile:
        profile = await self.profiles.get_active_by_user_id_for_update(user_id)
        if profile is None:
            raise ResourceNotFoundError("Active investment profile was not found")

        changes = payload.model_dump(exclude_unset=True)
        if "capital" in changes:
            self._validate_capital(changes["capital"])
            profile.capital = self._money(changes["capital"])
        if "risk_appetite" in changes:
            profile.risk_appetite = changes["risk_appetite"]
        if "investment_horizon" in changes:
            profile.investment_horizon = changes["investment_horizon"]
        if "expected_return" in changes:
            profile.expected_return = self._rate(changes["expected_return"])
        if "maximum_drawdown" in changes:
            profile.maximum_drawdown = self._rate(changes["maximum_drawdown"])

        await self.session.commit()
        await self.session.refresh(profile)
        return profile

    def _validate_capital(self, capital: Decimal) -> None:
        minimum = Decimal(self.settings.minimum_investment_capital)
        if capital < minimum:
            formatted = f"{minimum:,.0f}"
            raise InvalidInvestmentProfileError(
                f"Investment capital must be at least {formatted} VND"
            )

    @staticmethod
    def _money(value: Decimal) -> Decimal:
        return value.quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP)

    @staticmethod
    def _rate(value: Decimal) -> Decimal:
        return value.quantize(RATE_QUANTUM, rounding=ROUND_HALF_UP)
