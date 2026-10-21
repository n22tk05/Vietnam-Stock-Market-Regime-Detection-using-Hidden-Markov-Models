from __future__ import annotations

import asyncio
import csv
from collections import Counter
from datetime import date
from decimal import Decimal, InvalidOperation

from app.core.config import Settings
from app.core.exceptions import MarketDataUnavailableError
from app.integrations.market_data.base import (
    MarketDataProvider,
    MarketSecuritySnapshot,
    MarketSnapshot,
)


class AICoreArtifactMarketDataProvider(MarketDataProvider):
    """Read stock snapshots from AI Core output without importing AI Core code."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.artifact_path = (
            settings.ai_core_path
            / "ai_core"
            / "output"
            / "hmm_model"
            / "master_ticker_hmm_results.csv"
        )
        self._snapshot_cache: tuple[int, int, MarketSnapshot] | None = None

    async def latest_snapshot(self) -> MarketSnapshot:
        try:
            return await asyncio.wait_for(
                asyncio.to_thread(self._load_latest_snapshot),
                timeout=self.settings.ai_core_timeout_seconds,
            )
        except TimeoutError as exc:
            raise MarketDataUnavailableError(
                "Timed out reading AI Core market data artifact"
            ) from exc

    async def stock_history(
        self, symbol: str, *, start_date: date | None, end_date: date | None
    ) -> list[dict[str, object]]:
        try:
            return await asyncio.wait_for(
                asyncio.to_thread(self._load_stock_history, symbol.upper(), start_date, end_date),
                timeout=self.settings.ai_core_timeout_seconds,
            )
        except TimeoutError as exc:
            raise MarketDataUnavailableError("Timed out reading stock history") from exc

    def _load_latest_snapshot(self) -> MarketSnapshot:
        if not self.artifact_path.is_file():
            raise MarketDataUnavailableError("AI Core ticker output artifact is missing")
        stat = self.artifact_path.stat()
        if self._snapshot_cache and self._snapshot_cache[:2] == (stat.st_mtime_ns, stat.st_size):
            return self._snapshot_cache[2]

        coverage_by_date: Counter[date] = Counter()
        with self.artifact_path.open("r", encoding="utf-8", newline="") as source:
            reader = csv.DictReader(source)
            required = {"time", "ticker", "close", "rolling_vol_20d", "return_20d"}
            if not required.issubset(set(reader.fieldnames or [])):
                raise MarketDataUnavailableError("Ticker artifact schema is invalid")
            for row in reader:
                row_date = date.fromisoformat(row["time"][:10])
                coverage_by_date[row_date] += 1

        minimum_coverage = self.settings.recommendation_min_diversification
        eligible_dates = [
            row_date
            for row_date, coverage in coverage_by_date.items()
            if coverage >= minimum_coverage
        ]
        if not eligible_dates:
            raise MarketDataUnavailableError(
                "Ticker artifact has no date with enough securities for diversification"
            )
        latest_date = max(eligible_dates)
        latest_rows: list[dict[str, str]] = []
        selected_symbols: set[str] = set()
        with self.artifact_path.open("r", encoding="utf-8", newline="") as source:
            for row in csv.DictReader(source):
                if date.fromisoformat(row["time"][:10]) == latest_date:
                    symbol = row.get("ticker", "").strip().upper()
                    if not symbol or symbol in selected_symbols:
                        raise MarketDataUnavailableError(
                            "Ticker artifact has an empty or duplicate symbol on the selected date"
                        )
                    selected_symbols.add(symbol)
                    latest_rows.append(row)
        if not latest_rows:
            raise MarketDataUnavailableError("Ticker artifact contains no market rows")
        stat_after = self.artifact_path.stat()
        if (stat.st_mtime_ns, stat.st_size) != (stat_after.st_mtime_ns, stat_after.st_size):
            raise MarketDataUnavailableError("Ticker artifact changed while it was being read")

        securities = [self._snapshot_from_row(row) for row in latest_rows]
        snapshot = MarketSnapshot(
            data_date=latest_date,
            securities=securities,
            source="ai_core/output/hmm_model/master_ticker_hmm_results.csv",
            metadata={
                "selectionPolicy": "latest_date_with_minimum_coverage",
                "minimumCoverage": minimum_coverage,
                "selectedDateCoverage": len(latest_rows),
                "artifactLatestDate": max(coverage_by_date).isoformat(),
                "artifactLatestDateCoverage": coverage_by_date[max(coverage_by_date)],
            },
        )
        self._snapshot_cache = (stat.st_mtime_ns, stat.st_size, snapshot)
        return snapshot

    def _load_stock_history(
        self, symbol: str, start_date: date | None, end_date: date | None
    ) -> list[dict[str, object]]:
        if not self.artifact_path.is_file():
            raise MarketDataUnavailableError("AI Core ticker output artifact is missing")
        rows: list[dict[str, object]] = []
        with self.artifact_path.open("r", encoding="utf-8", newline="") as source:
            for row in csv.DictReader(source):
                if row.get("ticker", "").upper() != symbol:
                    continue
                row_date = date.fromisoformat(row["time"][:10])
                if start_date and row_date < start_date:
                    continue
                if end_date and row_date > end_date:
                    continue
                rows.append(
                    {
                        "tradeDate": row_date.isoformat(),
                        "openPrice": str(self._decimal(row.get("open")) * 1000),
                        "highPrice": str(self._decimal(row.get("high")) * 1000),
                        "lowPrice": str(self._decimal(row.get("low")) * 1000),
                        "closePrice": str(self._decimal(row.get("close")) * 1000),
                        "volume": int(self._decimal(row.get("volume"))),
                    }
                )
        return rows

    def _snapshot_from_row(self, row: dict[str, str]) -> MarketSecuritySnapshot:
        volatility = self._decimal(row.get("rolling_vol_20d"))
        momentum_20d = self._decimal(row.get("return_20d"))
        sharpe = momentum_20d / volatility if volatility else Decimal("0")
        return MarketSecuritySnapshot(
            symbol=row["ticker"].upper(),
            company_name=row["ticker"].upper(),
            sector=row.get("industry") or None,
            reference_price=self._decimal(row.get("close")) * 1000,
            daily_return=self._decimal(row.get("log_return")),
            volatility_20d=volatility,
            momentum_20d=momentum_20d,
            momentum_5d=self._decimal(row.get("return_5d")),
            volume_ratio=self._decimal(row.get("volume_ratio")),
            sharpe_ratio=sharpe,
            metadata={
                "tickerRegime": row.get("ticker_regime_label"),
                "rawCloseUnitMultiplier": 1000,
            },
        )

    @staticmethod
    def _decimal(value: str | None) -> Decimal:
        try:
            return Decimal(value or "0")
        except InvalidOperation:
            return Decimal("0")
