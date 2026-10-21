from __future__ import annotations

from collections.abc import Sequence
from datetime import date

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, ResourceNotFoundError
from app.integrations.ai_core.base import MarketRegimeDetector
from app.integrations.ai_core.schemas import MarketRegimeResult
from app.modules.market_regimes.models import MarketRegime
from app.modules.market_regimes.repository import MarketRegimeRepository
from app.modules.market_regimes.schemas import MarketRegimeView


class MarketRegimeService:
    def __init__(self, session: AsyncSession, detector: MarketRegimeDetector) -> None:
        self.session = session
        self.detector = detector
        self.repository = MarketRegimeRepository(session)

    async def get_current(self) -> MarketRegimeView:
        current = await self.repository.get_current()
        if current is None:
            current, _ = await self.synchronize_from_artifact()
        return self.to_view(current)

    async def list_regimes(self, *, offset: int, limit: int) -> tuple[list[MarketRegimeView], int]:
        rows: Sequence[MarketRegime] = await self.repository.list_regimes(
            offset=offset, limit=limit
        )
        return [self.to_view(row) for row in rows], await self.repository.count()

    async def synchronize_from_artifact(
        self, *, as_of_date: date | None = None
    ) -> tuple[MarketRegime, bool]:
        """Read and persist an existing AI Core result; this never trains or infers."""

        result = await self.detector.detect_current_regime(as_of_date=as_of_date)
        try:
            # Explicit historical lookups are audit records and must never move
            # the database's current pointer backwards in time.
            entity, created = await self.repository.persist_result(
                result,
                make_current=as_of_date is None,
            )
            await self.session.commit()
            await self.session.refresh(entity)
            return entity, created
        except IntegrityError as exc:
            # A concurrent worker may have synchronized the same artifact.  A
            # rollback followed by an exact comparison makes the operation
            # idempotent without hiding a genuinely different current result.
            await self.session.rollback()
            matching = await self.repository.find_artifact_result(
                code=result.regime,
                data_date=result.data_date,
                model_version=result.model_version,
            )
            if matching is not None and self._matches(matching, result):
                return matching, False
            raise ConflictError("Another market regime update completed concurrently") from exc

    @staticmethod
    def _matches(entity: MarketRegime, result: MarketRegimeResult) -> bool:
        metadata = entity.regime_metadata or {}
        return (
            entity.code == result.regime
            and entity.data_date == result.data_date
            and entity.model_version == result.model_version
            and metadata.get("rawState") == result.state_id
        )

    @staticmethod
    def to_view(entity: MarketRegime | None) -> MarketRegimeView:
        if entity is None:
            raise ResourceNotFoundError("No market regime is available")
        return MarketRegimeView(
            id=entity.id,
            code=entity.code,
            name=entity.name,
            description=entity.description,
            probability=float(entity.probability) if entity.probability is not None else None,
            detected_at=entity.detected_at,
            data_date=entity.data_date,
            model_version=entity.model_version,
            is_current=entity.is_current,
            metadata=entity.regime_metadata or {},
        )
