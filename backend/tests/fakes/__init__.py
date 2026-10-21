"""Explicit test-only doubles; production dependency wiring never imports this package."""

from tests.fakes.ai_core import FakeMarketRegimeDetector
from tests.fakes.market_data import FakeMarketDataProvider

__all__ = ["FakeMarketDataProvider", "FakeMarketRegimeDetector"]
