from __future__ import annotations

import asyncio
import uuid
from collections.abc import Awaitable, Callable
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.enums import JobStatus
from app.common.utils import utc_now
from app.core.database import AsyncSessionFactory, engine
from app.modules.history.models import BackgroundJob

JobHandler = Callable[[AsyncSession], Awaitable[dict[str, Any]]]


async def execute_background_job(
    *,
    job_type: str,
    input_data: dict[str, Any] | None,
    handler: JobHandler,
) -> dict[str, Any]:
    async with AsyncSessionFactory() as session:
        job = BackgroundJob(
            job_type=job_type,
            status=JobStatus.RUNNING,
            started_at=utc_now(),
            input_data=input_data,
            created_at=utc_now(),
        )
        session.add(job)
        await session.commit()
        job_id = job.id
        try:
            output = await handler(session)
            persisted = await session.scalar(
                select(BackgroundJob).where(BackgroundJob.id == job_id).with_for_update()
            )
            if persisted is not None:
                persisted.status = JobStatus.COMPLETED
                persisted.finished_at = utc_now()
                persisted.output_data = output
            await session.commit()
            return {"jobId": str(job_id), **output}
        except Exception as exc:
            await session.rollback()
            persisted = await session.scalar(
                select(BackgroundJob).where(BackgroundJob.id == job_id).with_for_update()
            )
            if persisted is not None:
                persisted.status = JobStatus.FAILED
                persisted.finished_at = utc_now()
                persisted.error_message = f"{type(exc).__name__}: {exc}"[:2000]
            await session.commit()
            raise


def run_background_job(
    *,
    job_type: str,
    input_data: dict[str, Any] | None,
    handler: JobHandler,
) -> dict[str, Any]:
    async def run_and_dispose() -> dict[str, Any]:
        try:
            return await execute_background_job(
                job_type=job_type,
                input_data=input_data,
                handler=handler,
            )
        finally:
            # Celery tasks use a fresh asyncio.run loop; do not retain pooled
            # connections that belong to a closed loop between task calls.
            await engine.dispose()

    return asyncio.run(run_and_dispose())


def uuid_or_none(value: str | None) -> uuid.UUID | None:
    return uuid.UUID(value) if value else None
