from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.integrations.market_data.provider import AICoreArtifactMarketDataProvider
from app.jobs.base import run_background_job
from app.jobs.celery_app import celery_app
from app.modules.stocks.service import StockService


async def _synchronize(session: AsyncSession) -> dict[str, Any]:
    settings = get_settings()
    result = await StockService(
        session, AICoreArtifactMarketDataProvider(settings)
    ).synchronize_catalog()
    return result.model_dump(mode="json", by_alias=True)


@celery_app.task(name="astera.sync_market_data")
def sync_market_data() -> dict[str, Any]:
    return run_background_job(job_type="sync_market_data", input_data=None, handler=_synchronize)


@celery_app.task(name="astera.calculate_stock_features")
def calculate_stock_features() -> dict[str, Any]:
    # The selected read-only artifact already contains the exact HMM ticker
    # features; synchronizing it is the safe MVP feature-calculation boundary.
    return run_background_job(
        job_type="calculate_stock_features",
        input_data={"source": "read_only_ai_core_artifact"},
        handler=_synchronize,
    )
