from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api.dependencies import DbSession, get_regime_detector
from app.core.responses import success_response
from app.integrations.ai_core.base import MarketRegimeDetector

router = APIRouter(prefix="/health", tags=["system"])


@router.get("")
async def application_health(request: Request, db: DbSession) -> dict[str, object]:
    database_status = "healthy"
    try:
        await db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        database_status = "unavailable"
    status = "healthy" if database_status == "healthy" else "degraded"
    return success_response(
        request,
        {"status": status, "service": "astera-api", "database": database_status},
    )


@router.get("/ai-core")
async def ai_core_health(
    request: Request,
    detector: Annotated[MarketRegimeDetector, Depends(get_regime_detector)],
) -> dict[str, object]:
    health = await detector.health_check()
    return success_response(request, health)
