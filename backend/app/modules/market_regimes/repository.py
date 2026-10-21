from __future__ import annotations

from collections.abc import Sequence
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.enums import MarketRegimeCode
from app.integrations.ai_core.schemas import MarketRegimeResult
from app.modules.market_regimes.models import MarketRegime

_REGIME_SYNC_ADVISORY_LOCK = 4_283_771_001


class MarketRegimeRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def acquire_sync_lock(self) -> None:
        """Serialize the single-current-row transition on PostgreSQL.

        SQLite is used by tests and serializes writes itself.  PostgreSQL needs
        a transaction-scoped advisory lock for the first insert, when there is
        no current row available for ``SELECT ... FOR UPDATE`` yet.
        """

        bind = self.session.get_bind()
        if bind.dialect.name == "postgresql":
            await self.session.execute(
                select(func.pg_advisory_xact_lock(_REGIME_SYNC_ADVISORY_LOCK))
            )

    async def get_current(self, *, lock: bool = False) -> MarketRegime | None:
        statement = select(MarketRegime).where(MarketRegime.is_current.is_(True))
        if lock:
            statement = statement.with_for_update()
        return (await self.session.scalars(statement)).first()

    async def list_regimes(self, *, offset: int, limit: int) -> Sequence[MarketRegime]:
        statement = (
            select(MarketRegime)
            .order_by(
                MarketRegime.data_date.desc().nullslast(),
                MarketRegime.detected_at.desc(),
                MarketRegime.created_at.desc(),
            )
            .offset(offset)
            .limit(limit)
        )
        return (await self.session.scalars(statement)).all()

    async def count(self) -> int:
        value = await self.session.scalar(select(func.count()).select_from(MarketRegime))
        return int(value or 0)

    async def find_artifact_result(
        self,
        *,
        code: MarketRegimeCode,
        data_date: date | None,
        model_version: str | None,
    ) -> MarketRegime | None:
        statement = select(MarketRegime).where(
            MarketRegime.code == code,
            MarketRegime.data_date == data_date,
            MarketRegime.model_version == model_version,
        )
        return (
            await self.session.scalars(statement.order_by(MarketRegime.created_at.desc()).limit(1))
        ).first()

    async def persist_result(
        self, result: MarketRegimeResult, *, make_current: bool
    ) -> tuple[MarketRegime, bool]:
        await self.acquire_sync_lock()
        current = await self.get_current(lock=True)
        if current is not None and self._is_same_result(current, result):
            return current, False

        matching = await self.find_artifact_result(
            code=result.regime,
            data_date=result.data_date,
            model_version=result.model_version,
        )
        if not make_current:
            if matching is not None:
                return matching, False
            entity = MarketRegime(**self._entity_values(result), is_current=False)
            self.session.add(entity)
            await self.session.flush()
            return entity, True

        await self.session.execute(
            update(MarketRegime).where(MarketRegime.is_current.is_(True)).values(is_current=False)
        )

        values = self._entity_values(result)
        if matching is not None:
            for attribute, value in values.items():
                setattr(matching, attribute, value)
            matching.is_current = True
            await self.session.flush()
            return matching, False

        entity = MarketRegime(**values, is_current=True)
        self.session.add(entity)
        await self.session.flush()
        return entity, True

    @staticmethod
    def _is_same_result(entity: MarketRegime, result: MarketRegimeResult) -> bool:
        metadata = entity.regime_metadata or {}
        return (
            entity.code == result.regime
            and entity.data_date == result.data_date
            and entity.model_version == result.model_version
            and metadata.get("rawState") == result.state_id
        )

    @staticmethod
    def _entity_values(result: MarketRegimeResult) -> dict[str, object]:
        names = {
            MarketRegimeCode.BULL: "Bull market",
            MarketRegimeCode.BEAR: "Bear market",
            MarketRegimeCode.SIDEWAY: "Sideway market",
            MarketRegimeCode.UNKNOWN: "Unknown market regime",
        }
        descriptions = {
            MarketRegimeCode.BULL: "HMM output indicates a rising market regime.",
            MarketRegimeCode.BEAR: "HMM output indicates a declining market regime.",
            MarketRegimeCode.SIDEWAY: "HMM output indicates a range-bound market regime.",
            MarketRegimeCode.UNKNOWN: "The AI Core label could not be normalized.",
        }
        return {
            "code": result.regime,
            "name": names[result.regime],
            "description": descriptions[result.regime],
            "probability": (
                Decimal(str(result.confidence)) if result.confidence is not None else None
            ),
            "detected_at": result.detected_at,
            "data_date": result.data_date,
            "model_version": result.model_version,
            "regime_metadata": {
                "rawState": result.state_id,
                "probabilities": result.probabilities,
                "features": result.features,
                "aiCore": result.metadata,
                "sourceOperation": "READ_ONLY_ARTIFACT_SYNC",
                "liveInferencePerformed": False,
            },
        }
