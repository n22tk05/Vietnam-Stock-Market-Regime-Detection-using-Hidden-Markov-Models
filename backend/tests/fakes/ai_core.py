from __future__ import annotations

from datetime import date

from app.integrations.ai_core.base import MarketRegimeDetector
from app.integrations.ai_core.schemas import AICoreHealth, MarketRegimeResult


class FakeMarketRegimeDetector(MarketRegimeDetector):
    """Deterministic test double that is deliberately kept outside application code."""

    def __init__(self, result: MarketRegimeResult, health: AICoreHealth | None = None) -> None:
        self.result = result
        self.health = health or AICoreHealth(
            status="healthy",
            integration_mode="test_fake",
            repository_exists=True,
            artifact_exists=True,
            live_inference_available=True,
        )
        self.detect_calls: list[date | None] = []

    async def detect_current_regime(self, *, as_of_date: date | None = None) -> MarketRegimeResult:
        self.detect_calls.append(as_of_date)
        return self.result.model_copy(deep=True)

    async def health_check(self) -> AICoreHealth:
        return self.health.model_copy(deep=True)
