from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    get_current_user,
    get_db,
    get_regime_detector,
    require_admin,
)
from app.common.pagination import PaginationParams, pagination_params
from app.core.responses import success_response
from app.integrations.ai_core.base import MarketRegimeDetector
from app.modules.market_regimes.schemas import (
    MarketRegimeDetectionRequest,
    MarketRegimeSyncView,
)
from app.modules.market_regimes.service import MarketRegimeService
from app.modules.users.models import User

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/regime/current")
async def get_current_market_regime(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
    detector: Annotated[MarketRegimeDetector, Depends(get_regime_detector)],
    _user: Annotated[User, Depends(get_current_user)],
) -> dict[str, Any]:
    regime = await MarketRegimeService(session, detector).get_current()
    return success_response(request, regime)


@router.get("/regimes")
async def list_market_regimes(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
    detector: Annotated[MarketRegimeDetector, Depends(get_regime_detector)],
    _user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends(pagination_params)],
) -> dict[str, Any]:
    regimes, total = await MarketRegimeService(session, detector).list_regimes(
        offset=pagination.offset,
        limit=pagination.page_size,
    )
    return success_response(
        request,
        regimes,
        pagination={
            "page": pagination.page,
            "pageSize": pagination.page_size,
            "total": total,
        },
    )


@router.post("/regime/detect")
async def synchronize_market_regime_artifact(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
    detector: Annotated[MarketRegimeDetector, Depends(get_regime_detector)],
    _admin: Annotated[User, Depends(require_admin)],
    payload: MarketRegimeDetectionRequest | None = None,
) -> dict[str, Any]:
    """Admin-only synchronization of existing output, not a fresh HMM inference."""

    detection_request = payload or MarketRegimeDetectionRequest()
    service = MarketRegimeService(session, detector)
    entity, created = await service.synchronize_from_artifact(
        as_of_date=detection_request.as_of_date
    )
    result = MarketRegimeSyncView(
        regime=service.to_view(entity),
        record_created=created,
    )
    return success_response(request, result)
