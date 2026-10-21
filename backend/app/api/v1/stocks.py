from __future__ import annotations

from datetime import date
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Path, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_db, get_market_data_provider
from app.common.pagination import PaginationParams, pagination_params
from app.core.responses import success_response
from app.integrations.market_data.base import MarketDataProvider
from app.modules.stocks.schemas import HistoryInterval, HistoryRange
from app.modules.stocks.service import StockService
from app.modules.users.models import User

router = APIRouter(prefix="/stocks", tags=["stocks"])


@router.get("")
async def list_stocks(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
    provider: Annotated[MarketDataProvider, Depends(get_market_data_provider)],
    _user: Annotated[User, Depends(get_current_user)],
    pagination: Annotated[PaginationParams, Depends(pagination_params)],
    search: Annotated[str | None, Query(max_length=160)] = None,
    exchange: Annotated[str | None, Query(max_length=32)] = None,
    sector: Annotated[str | None, Query(max_length=160)] = None,
) -> dict[str, Any]:
    stocks, total = await StockService(session, provider).list_stocks(
        offset=pagination.offset,
        limit=pagination.page_size,
        search=search,
        exchange=exchange,
        sector=sector,
    )
    return success_response(
        request,
        stocks,
        pagination={
            "page": pagination.page,
            "pageSize": pagination.page_size,
            "total": total,
        },
    )


@router.get("/{symbol}")
async def get_stock(
    request: Request,
    symbol: Annotated[str, Path(min_length=1, max_length=24)],
    session: Annotated[AsyncSession, Depends(get_db)],
    provider: Annotated[MarketDataProvider, Depends(get_market_data_provider)],
    _user: Annotated[User, Depends(get_current_user)],
) -> dict[str, Any]:
    stock = await StockService(session, provider).get_stock(symbol)
    return success_response(request, stock)


@router.get("/{symbol}/history")
async def get_stock_history(
    request: Request,
    symbol: Annotated[str, Path(min_length=1, max_length=24)],
    session: Annotated[AsyncSession, Depends(get_db)],
    provider: Annotated[MarketDataProvider, Depends(get_market_data_provider)],
    _user: Annotated[User, Depends(get_current_user)],
    range_value: Annotated[HistoryRange, Query(alias="range")] = "1y",
    interval: Annotated[HistoryInterval, Query()] = "1d",
    start_date: Annotated[date | None, Query()] = None,
    end_date: Annotated[date | None, Query()] = None,
) -> dict[str, Any]:
    history = await StockService(session, provider).get_history(
        symbol,
        range_value=range_value,
        interval=interval,
        start_date=start_date,
        end_date=end_date,
    )
    return success_response(request, history)
