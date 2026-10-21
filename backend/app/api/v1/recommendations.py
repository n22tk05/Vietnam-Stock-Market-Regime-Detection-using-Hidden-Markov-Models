from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    get_current_user,
    get_db,
    get_market_data_provider,
    get_recommendation_engine,
)
from app.common.pagination import PaginationParams, pagination_params
from app.core.config import Settings, get_settings
from app.core.responses import success_response
from app.integrations.market_data.base import MarketDataProvider
from app.modules.portfolios.service import PortfolioService
from app.modules.recommendations.engine import PortfolioRecommendationEngine
from app.modules.recommendations.schemas import RecommendationCreateRequest
from app.modules.recommendations.service import RecommendationService
from app.modules.users.models import User

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.post("")
async def generate_recommendation(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    engine: Annotated[PortfolioRecommendationEngine, Depends(get_recommendation_engine)],
    market_data: Annotated[MarketDataProvider, Depends(get_market_data_provider)],
    settings: Annotated[Settings, Depends(get_settings)],
    payload: RecommendationCreateRequest | None = None,
) -> dict[str, object]:
    request_data = payload or RecommendationCreateRequest()
    recommendation = await RecommendationService(session, settings, engine, market_data).generate(
        user_id=current_user.id, recommendation_type=request_data.type
    )
    return success_response(request, recommendation)


@router.get("")
async def list_recommendations(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends(pagination_params)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, object]:
    result = await RecommendationService(session, settings).list(
        user_id=current_user.id,
        page=pagination.page,
        page_size=pagination.page_size,
    )
    return success_response(request, result)


@router.get("/{recommendation_id}")
async def get_recommendation(
    recommendation_id: uuid.UUID,
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, object]:
    result = await RecommendationService(session, settings).get(
        recommendation_id=recommendation_id, user_id=current_user.id
    )
    return success_response(request, result)


@router.post("/{recommendation_id}/confirm")
async def confirm_recommendation(
    recommendation_id: uuid.UUID,
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, object]:
    portfolio = await PortfolioService(session, settings).confirm_recommendation(
        recommendation_id=recommendation_id, user_id=current_user.id
    )
    return success_response(request, portfolio)


@router.post("/{recommendation_id}/dismiss")
async def dismiss_recommendation(
    recommendation_id: uuid.UUID,
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, object]:
    result = await RecommendationService(session, settings).dismiss(
        recommendation_id=recommendation_id, user_id=current_user.id
    )
    return success_response(request, result)
