#!/usr/bin/env python3
"""Initialize database and seed initial catalogue."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

# Force UTF-8 stdout
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import app.modules  # noqa: F401
from app.core.config import get_settings
from app.core.database import AsyncSessionFactory, Base, close_database, engine
from app.modules.stocks.models import Stock


async def init_database():
    settings = get_settings()
    print(f"[*] Ket noi Database: {settings.database_url}")
    print("[*] Dang khoi tao schema (18 tables)...")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    table_names = list(Base.metadata.tables.keys())
    print(f"[+] Tao thanh cong {len(table_names)} bang: {', '.join(table_names[:5])}...")

    ticker_file = settings.ai_core_path / "ai_core" / "success_tickers.txt"
    if not ticker_file.is_file():
        ticker_file = Path("ai_core/success_tickers.txt")

    if ticker_file.is_file():
        print(f"[*] Dang nap danh muc co phieu tu: {ticker_file}")
        content = ticker_file.read_text(encoding="utf-8")
        symbols = sorted(
            {
                line.strip().upper()
                for line in content.splitlines()
                if line.strip() and not line.lstrip().startswith("#")
            }
        )

        async with AsyncSessionFactory() as session:
            from sqlalchemy import select
            existing = set(await session.scalars(select(Stock.symbol)))
            created = 0
            for symbol in symbols:
                if symbol not in existing:
                    session.add(
                        Stock(
                            symbol=symbol,
                            company_name=f"Cong ty Co phan {symbol}",
                            exchange="HOSE",
                            is_active=True,
                        )
                    )
                    created += 1
            await session.commit()
            print(f"[+] Nap danh muc hoan tat: {len(symbols)} ma da doc, {created} ma moi duoc them.")

    await close_database()
    print("[v] HOAN TAT: Database da san sang hoat dong!")


if __name__ == "__main__":
    asyncio.run(init_database())
