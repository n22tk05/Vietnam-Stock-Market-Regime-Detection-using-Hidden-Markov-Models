from abc import ABC, abstractmethod
from datetime import date

from app.integrations.ai_core.schemas import AICoreHealth, MarketRegimeResult


class MarketRegimeDetector(ABC):
    @abstractmethod
    async def detect_current_regime(
        self,
        *,
        as_of_date: date | None = None,
    ) -> MarketRegimeResult:
        raise NotImplementedError

    @abstractmethod
    async def health_check(self) -> AICoreHealth:
        raise NotImplementedError
