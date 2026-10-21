from fastapi import APIRouter

from app.api.v1 import (
    auth,
    health,
    history,
    investment_profiles,
    market,
    notifications,
    portfolios,
    recommendations,
    stocks,
    users,
)

api_v1_router = APIRouter()
api_v1_router.include_router(health.router)
api_v1_router.include_router(auth.router)
api_v1_router.include_router(users.router)
api_v1_router.include_router(investment_profiles.router)
api_v1_router.include_router(market.router)
api_v1_router.include_router(stocks.router)
api_v1_router.include_router(recommendations.router)
api_v1_router.include_router(portfolios.router)
api_v1_router.include_router(notifications.router)
api_v1_router.include_router(history.router)
