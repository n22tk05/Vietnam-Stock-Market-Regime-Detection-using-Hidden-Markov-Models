from __future__ import annotations

import uuid
from typing import Any

from app.common.enums import NotificationStatus
from app.common.utils import utc_now
from app.modules.notifications.models import Notification
from tests.conftest import IntegrationHarness
from tests.integration.helpers import (
    assert_success,
    bearer,
    create_profile,
    ensure_current_regime,
    register_user,
)


async def _insert_notification(
    api: IntegrationHarness,
    *,
    user_id: str,
    portfolio_id: str,
    recommendation_id: str,
    title: str,
) -> str:
    notification = Notification(
        user_id=uuid.UUID(user_id),
        type="REGIME_CHANGE_REBALANCE",
        title=title,
        summary="A test-only rebalance recommendation is ready for review.",
        recommendation_id=uuid.UUID(recommendation_id),
        portfolio_id=uuid.UUID(portfolio_id),
        status=NotificationStatus.UNREAD,
        created_at=utc_now(),
    )
    async with api.session_factory() as session:
        session.add(notification)
        await session.commit()
        notification_id = str(notification.id)
    return notification_id


async def _prepare_active_portfolio(
    api: IntegrationHarness,
    register_payload: dict[str, str],
) -> tuple[dict[str, str], dict[str, Any], dict[str, Any]]:
    registration = await register_user(api.client, register_payload)
    headers = bearer(registration["tokens"]["accessToken"])
    await create_profile(api.client, headers)
    await ensure_current_regime(api.client, headers)
    initial_recommendation = assert_success(
        await api.client.post("/api/v1/recommendations", headers=headers)
    )
    portfolio = assert_success(
        await api.client.post(
            f"/api/v1/recommendations/{initial_recommendation['id']}/confirm",
            headers=headers,
        )
    )
    return headers, registration, portfolio


async def test_rebalance_notification_apply_creates_new_portfolio_version(
    api: IntegrationHarness,
    register_payload: dict[str, str],
) -> None:
    headers, registration, portfolio = await _prepare_active_portfolio(api, register_payload)
    rebalance = assert_success(
        await api.client.post("/api/v1/portfolios/current/rebalance", headers=headers)
    )
    assert rebalance["type"] == "REBALANCE"
    assert rebalance["status"] == "GENERATED"
    notification_id = await _insert_notification(
        api,
        user_id=registration["user"]["id"],
        portfolio_id=portfolio["id"],
        recommendation_id=rebalance["id"],
        title="Market regime changed",
    )

    notification_list = assert_success(
        await api.client.get("/api/v1/notifications", headers=headers)
    )
    assert notification_list["total"] == 1
    assert notification_list["items"][0]["status"] == "UNREAD"

    applied = assert_success(
        await api.client.post(
            f"/api/v1/notifications/{notification_id}/apply",
            headers=headers,
        )
    )
    assert applied["notification"]["status"] == "APPLIED"
    assert applied["notification"]["readAt"] is not None
    assert applied["notification"]["actionedAt"] is not None
    assert applied["portfolio"]["currentVersion"] == 2
    assert applied["portfolio"]["version"]["changeType"] == "REBALANCE"
    assert applied["portfolio"]["version"]["recommendationId"] == rebalance["id"]

    applied_again = assert_success(
        await api.client.post(
            f"/api/v1/notifications/{notification_id}/apply",
            headers=headers,
        )
    )
    assert applied_again["notification"]["status"] == "APPLIED"
    assert applied_again["portfolio"]["currentVersion"] == 2

    versions = assert_success(
        await api.client.get("/api/v1/portfolios/current/versions", headers=headers)
    )
    assert [item["versionNumber"] for item in versions["items"]] == [2, 1]

    recommendation = assert_success(
        await api.client.get(
            f"/api/v1/recommendations/{rebalance['id']}",
            headers=headers,
        )
    )
    assert recommendation["status"] == "APPLIED"


async def test_dismiss_notification_also_dismisses_pending_recommendation(
    api: IntegrationHarness,
    register_payload: dict[str, str],
) -> None:
    headers, registration, portfolio = await _prepare_active_portfolio(api, register_payload)
    rebalance = assert_success(
        await api.client.post("/api/v1/portfolios/current/rebalance", headers=headers)
    )
    notification_id = await _insert_notification(
        api,
        user_id=registration["user"]["id"],
        portfolio_id=portfolio["id"],
        recommendation_id=rebalance["id"],
        title="Review rebalance",
    )

    dismissed = assert_success(
        await api.client.post(
            f"/api/v1/notifications/{notification_id}/dismiss",
            headers=headers,
        )
    )
    assert dismissed["status"] == "DISMISSED"
    assert dismissed["readAt"] is not None
    assert dismissed["actionedAt"] is not None

    recommendation = assert_success(
        await api.client.get(
            f"/api/v1/recommendations/{rebalance['id']}",
            headers=headers,
        )
    )
    assert recommendation["status"] == "DISMISSED"

    apply_after_dismiss = await api.client.post(
        f"/api/v1/notifications/{notification_id}/apply",
        headers=headers,
    )
    assert apply_after_dismiss.status_code == 409, apply_after_dismiss.text
    assert apply_after_dismiss.json()["error"]["code"] == "RESOURCE_CONFLICT"
