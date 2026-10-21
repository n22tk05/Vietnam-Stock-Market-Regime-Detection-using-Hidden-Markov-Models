from __future__ import annotations

from celery import Celery

from app.core.config import get_settings

settings = get_settings()
celery_app = Celery(
    "astera",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.jobs.market_data_jobs",
        "app.jobs.regime_jobs",
        "app.jobs.portfolio_jobs",
        "app.jobs.notification_jobs",
    ],
)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=max(settings.ai_core_timeout_seconds + 30, 90),
    task_soft_time_limit=max(settings.ai_core_timeout_seconds + 15, 75),
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    beat_schedule={
        "sync-market-data-daily": {
            "task": "astera.sync_market_data",
            "schedule": 60 * 60 * 6,
        },
        "detect-market-regime-daily": {
            "task": "astera.detect_market_regime",
            "schedule": 60 * 60 * 6,
        },
        "portfolio-snapshots-daily": {
            "task": "astera.calculate_portfolio_snapshots",
            "schedule": 60 * 60 * 24,
        },
        "send-notifications": {
            "task": "astera.send_pending_notifications",
            "schedule": 60 * 5,
        },
        "expire-recommendations": {
            "task": "astera.expire_old_recommendations",
            "schedule": 60 * 30,
        },
        "cleanup-expired-tokens": {
            "task": "astera.cleanup_expired_tokens",
            "schedule": 60 * 60 * 24,
        },
    },
)
