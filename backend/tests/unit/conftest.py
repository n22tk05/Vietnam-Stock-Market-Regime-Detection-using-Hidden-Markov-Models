from __future__ import annotations

import shutil
import uuid
from collections.abc import AsyncIterator, Iterator
from pathlib import Path

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.modules  # noqa: F401 -- registers every mapped table on Base.metadata
from app.core.database import Base


@pytest.fixture
def tmp_path() -> Iterator[Path]:
    """Workspace-local tmp_path for managed Windows environments.

    Pytest's built-in fixture calls ``chmod`` while creating its system-wide
    numbered directory. That operation is denied by the workspace sandbox even
    though ordinary writes are allowed, so retain the familiar fixture contract
    while keeping every file under ``backend/runtime``.
    """
    root = Path.cwd() / "runtime" / "unit-fixtures" / uuid.uuid4().hex
    root.mkdir(parents=True, exist_ok=False)
    try:
        yield root
    finally:
        shutil.rmtree(root, ignore_errors=True)


@pytest_asyncio.fixture
async def sqlite_session() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()
    await engine.dispose()
