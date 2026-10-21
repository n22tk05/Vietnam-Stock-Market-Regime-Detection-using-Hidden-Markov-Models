from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    get_current_user,
    get_db,
    get_market_data_provider,
    get_recommendation_engine,
)
from app.common.enums import RecommendationType
from app.core.config import Settings, get_settings
from app.core.responses import success_response
from app.integrations.market_data.base import MarketDataProvider
from app.modules.portfolios.service import PortfolioService
from app.modules.recommendations.engine import PortfolioRecommendationEngine
from app.modules.users.models import User

router = APIRouter(prefix="/portfolios", tags=["Portfolios"])


@router.get("/current")
async def get_current_portfolio(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, object]:
    portfolio = await PortfolioService(session, settings).get_current(user_id=current_user.id)
    return success_response(request, portfolio)


@router.get("/current/performance")
async def get_portfolio_performance(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    market_data: Annotated[MarketDataProvider, Depends(get_market_data_provider)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, object]:
    performance = await PortfolioService(session, settings).performance(
        user_id=current_user.id, market_data=market_data
    )
    return success_response(request, performance)


@router.get("/current/versions")
async def get_portfolio_versions(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, object]:
    versions = await PortfolioService(session, settings).get_versions(user_id=current_user.id)
    return success_response(request, versions)


@router.post("/current/recalculate")
async def recalculate_portfolio(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    engine: Annotated[PortfolioRecommendationEngine, Depends(get_recommendation_engine)],
    market_data: Annotated[MarketDataProvider, Depends(get_market_data_provider)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, object]:
    recommendation = await PortfolioService(session, settings).create_recommendation(
        user_id=current_user.id,
        recommendation_type=RecommendationType.RECALCULATION,
        engine=engine,
        market_data=market_data,
    )
    return success_response(request, recommendation)


@router.post("/current/rebalance")
async def rebalance_portfolio(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    engine: Annotated[PortfolioRecommendationEngine, Depends(get_recommendation_engine)],
    market_data: Annotated[MarketDataProvider, Depends(get_market_data_provider)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, object]:
    recommendation = await PortfolioService(session, settings).create_recommendation(
        user_id=current_user.id,
        recommendation_type=RecommendationType.REBALANCE,
        engine=engine,
        market_data=market_data,
    )
    return success_response(request, recommendation)
