"""Import all mapped models so SQLAlchemy and Alembic see complete metadata."""

from app.modules.history.models import BackgroundJob
from app.modules.investment_profiles.models import InvestmentProfile
from app.modules.market_regimes.models import MarketRegime, ModelVersion
from app.modules.notifications.models import Notification
from app.modules.portfolios.models import (
    Portfolio,
    PortfolioAllocation,
    PortfolioSnapshot,
    PortfolioVersion,
)
from app.modules.recommendations.models import Recommendation, RecommendationAllocation
from app.modules.stocks.models import Stock, StockFeature, StockPrice
from app.modules.users.models import PasswordResetToken, RefreshToken, User, UserPreference

__all__ = [
    "BackgroundJob",
    "InvestmentProfile",
    "MarketRegime",
    "ModelVersion",
    "Notification",
    "PasswordResetToken",
    "Portfolio",
    "PortfolioAllocation",
    "PortfolioSnapshot",
    "PortfolioVersion",
    "Recommendation",
    "RecommendationAllocation",
    "RefreshToken",
    "Stock",
    "StockFeature",
    "StockPrice",
    "User",
    "UserPreference",
]
