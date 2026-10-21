#!/usr/bin/env python3
"""Seed the stock catalogue from the AI Core ticker inventory without writing to it."""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from sqlalchemy import select

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import get_settings  # noqa: E402
from app.core.database import AsyncSessionFactory, close_database  # noqa: E402
from app.modules.stocks.models import Stock  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--ticker-file",
        type=Path,
        help="Override the read-only success_tickers.txt path",
    )
    return parser.parse_args()


async def seed(ticker_file: Path) -> tuple[int, int]:
    content = await asyncio.to_thread(ticker_file.read_text, encoding="utf-8")
    symbols = sorted(
        {
            line.strip().upper()
            for line in content.splitlines()
            if line.strip() and not line.lstrip().startswith("#")
        }
    )
    async with AsyncSessionFactory() as session:
        existing = set(await session.scalars(select(Stock.symbol)))
        created = 0
        for symbol in symbols:
            if symbol in existing:
                continue
            session.add(
                Stock(
                    symbol=symbol,
                    company_name=symbol,
                    exchange="UNKNOWN",
                    is_active=True,
                )
            )
            created += 1
        await session.commit()
    return len(symbols), created


def main() -> int:
    args = parse_args()
    settings = get_settings()
    ticker_file = args.ticker_file or settings.ai_core_path / "ai_core" / "success_tickers.txt"
    if not ticker_file.is_file():
        print(f"Ticker file does not exist: {ticker_file}", file=sys.stderr)
        return 2
    try:
        seen, created = asyncio.run(seed(ticker_file.resolve()))
    finally:
        asyncio.run(close_database())
    print(f"Stock seed complete: {seen} symbols read, {created} created")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
