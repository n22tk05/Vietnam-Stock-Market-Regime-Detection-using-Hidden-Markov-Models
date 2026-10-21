#!/usr/bin/env python3
"""Import real precomputed ticker prices/features into Astera's database."""

from __future__ import annotations

import argparse
import asyncio
import csv
import sys
from collections.abc import Iterable
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as postgresql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.common.utils import utc_now  # noqa: E402
from app.core.config import get_settings  # noqa: E402
from app.core.database import AsyncSessionFactory, close_database  # noqa: E402
from app.modules.stocks.models import Stock, StockFeature, StockPrice  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifact", type=Path, help="Override master ticker CSV")
    parser.add_argument("--batch-size", type=int, default=1000)
    return parser.parse_args()


def chunks(items: list[dict[str, Any]], size: int) -> Iterable[list[dict[str, Any]]]:
    for offset in range(0, len(items), size):
        yield items[offset : offset + size]


def decimal_or_none(raw: str | None) -> Decimal | None:
    if raw in (None, "", "nan", "NaN"):
        return None
    if raw is None:
        return None
    try:
        value = Decimal(raw)
    except InvalidOperation:
        return None
    return value if value.is_finite() else None


async def upsert_rows(
    session: AsyncSession,
    model: type[StockPrice] | type[StockFeature],
    rows: list[dict[str, Any]],
    *,
    conflict_columns: list[str],
    update_columns: list[str],
) -> None:
    if not rows:
        return
    dialect = session.get_bind().dialect.name
    statement: Any
    if dialect == "postgresql":
        statement = postgresql_insert(model).values(rows)
    elif dialect == "sqlite":
        statement = sqlite_insert(model).values(rows)
    else:
        raise RuntimeError(f"Unsupported import database dialect: {dialect}")
    statement = statement.on_conflict_do_update(
        index_elements=conflict_columns,
        set_={column: getattr(statement.excluded, column) for column in update_columns},
    )
    await session.execute(statement)


async def import_artifact(path: Path, batch_size: int) -> tuple[int, int, int]:
    symbols: set[str] = set()
    with path.open("r", encoding="utf-8", newline="") as source:
        reader = csv.DictReader(source)
        required = {"time", "ticker", "open", "high", "low", "close", "volume"}
        if not required.issubset(set(reader.fieldnames or [])):
            raise ValueError("Ticker artifact is missing required OHLCV columns")
        for row in reader:
            if row.get("ticker"):
                symbols.add(row["ticker"].strip().upper())

    async with AsyncSessionFactory() as session:
        existing = {stock.symbol: stock for stock in await session.scalars(select(Stock))}
        for symbol in symbols - existing.keys():
            session.add(
                Stock(
                    symbol=symbol,
                    company_name=symbol,
                    exchange="UNKNOWN",
                    is_active=True,
                )
            )
        await session.commit()
        stocks = {stock.symbol: stock.id for stock in await session.scalars(select(Stock))}

        price_rows: list[dict[str, Any]] = []
        feature_rows: list[dict[str, Any]] = []
        imported_prices = 0
        imported_features = 0
        with path.open("r", encoding="utf-8", newline="") as source:
            for row in csv.DictReader(source):
                symbol = row.get("ticker", "").strip().upper()
                stock_id = stocks.get(symbol)
                if stock_id is None:
                    continue
                row_date = date.fromisoformat(row["time"][:10])
                open_price = decimal_or_none(row.get("open"))
                high_price = decimal_or_none(row.get("high"))
                low_price = decimal_or_none(row.get("low"))
                close_price = decimal_or_none(row.get("close"))
                volume = decimal_or_none(row.get("volume"))
                if (
                    open_price is not None
                    and high_price is not None
                    and low_price is not None
                    and close_price is not None
                    and volume is not None
                ):
                    price_rows.append(
                        {
                            "stock_id": stock_id,
                            "trade_date": row_date,
                            "open_price": open_price * 1000,
                            "high_price": high_price * 1000,
                            "low_price": low_price * 1000,
                            "close_price": close_price * 1000,
                            "adjusted_close": close_price * 1000,
                            "volume": int(volume),
                            "created_at": utc_now(),
                        }
                    )
                log_return = decimal_or_none(row.get("log_return"))
                return_5d = decimal_or_none(row.get("return_5d"))
                return_20d = decimal_or_none(row.get("return_20d"))
                volume_ratio = decimal_or_none(row.get("volume_ratio"))
                volatility = decimal_or_none(row.get("rolling_vol_20d"))
                sharpe = (
                    return_20d / volatility
                    if return_20d is not None
                    and volatility is not None
                    and volatility != Decimal("0")
                    else None
                )
                feature_rows.append(
                    {
                        "stock_id": stock_id,
                        "feature_date": row_date,
                        "daily_return": log_return,
                        "log_return": log_return,
                        "return_5d": return_5d,
                        "return_20d": return_20d,
                        "volume_ratio": volume_ratio,
                        "volatility_20d": volatility,
                        "momentum_20d": return_20d,
                        "sharpe_ratio": sharpe,
                        "feature_data": {
                            "source": "ai_core_output_artifact",
                            "referencePrice": str(close_price * 1000) if close_price else None,
                            "tickerRegime": row.get("ticker_regime_label"),
                        },
                        "created_at": utc_now(),
                    }
                )
                if len(price_rows) >= batch_size:
                    for batch in chunks(price_rows, batch_size):
                        await upsert_rows(
                            session,
                            StockPrice,
                            batch,
                            conflict_columns=["stock_id", "trade_date"],
                            update_columns=[
                                "open_price",
                                "high_price",
                                "low_price",
                                "close_price",
                                "adjusted_close",
                                "volume",
                            ],
                        )
                    imported_prices += len(price_rows)
                    price_rows.clear()
                if len(feature_rows) >= batch_size:
                    for batch in chunks(feature_rows, batch_size):
                        await upsert_rows(
                            session,
                            StockFeature,
                            batch,
                            conflict_columns=["stock_id", "feature_date"],
                            update_columns=[
                                "daily_return",
                                "log_return",
                                "return_5d",
                                "return_20d",
                                "volume_ratio",
                                "volatility_20d",
                                "momentum_20d",
                                "sharpe_ratio",
                                "feature_data",
                            ],
                        )
                    imported_features += len(feature_rows)
                    feature_rows.clear()
                if (imported_prices + imported_features) and not (price_rows or feature_rows):
                    await session.commit()

        await upsert_rows(
            session,
            StockPrice,
            price_rows,
            conflict_columns=["stock_id", "trade_date"],
            update_columns=[
                "open_price",
                "high_price",
                "low_price",
                "close_price",
                "adjusted_close",
                "volume",
            ],
        )
        await upsert_rows(
            session,
            StockFeature,
            feature_rows,
            conflict_columns=["stock_id", "feature_date"],
            update_columns=[
                "daily_return",
                "log_return",
                "return_5d",
                "return_20d",
                "volume_ratio",
                "volatility_20d",
                "momentum_20d",
                "sharpe_ratio",
                "feature_data",
            ],
        )
        imported_prices += len(price_rows)
        imported_features += len(feature_rows)
        await session.commit()
    return len(symbols), imported_prices, imported_features


def main() -> int:
    args = parse_args()
    if args.batch_size < 1 or args.batch_size > 10_000:
        print("--batch-size must be between 1 and 10000", file=sys.stderr)
        return 2
    settings = get_settings()
    artifact = args.artifact or (
        settings.ai_core_path / "ai_core" / "output" / "hmm_model" / "master_ticker_hmm_results.csv"
    )
    if not artifact.is_file():
        print(f"Market artifact does not exist: {artifact}", file=sys.stderr)
        return 2
    try:
        symbols, prices, features = asyncio.run(
            import_artifact(artifact.resolve(), args.batch_size)
        )
    finally:
        asyncio.run(close_database())
    print(
        f"Market import complete: {symbols} symbols, {prices} prices, "
        f"{features} feature rows upserted"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
