from __future__ import annotations

from decimal import Decimal

from tests.conftest import IntegrationHarness
from tests.integration.helpers import (
    assert_success,
    bearer,
    create_profile,
    ensure_current_regime,
    register_user,
)


async def test_current_regime_recommendation_confirm_and_portfolio_performance(
    api: IntegrationHarness,
    register_payload: dict[str, str],
) -> None:
    registration = await register_user(api.client, register_payload)
    headers = bearer(registration["tokens"]["accessToken"])
    await create_profile(api.client, headers)

    regime = await ensure_current_regime(api.client, headers)
    assert regime["code"] == "BULL"
    assert regime["probability"] == 0.91
    assert regime["metadata"]["sourceOperation"] == "READ_ONLY_ARTIFACT_SYNC"
    assert regime["metadata"]["liveInferencePerformed"] is False

    recommendation = assert_success(
        await api.client.post("/api/v1/recommendations", headers=headers, json={})
    )
    assert recommendation["status"] == "GENERATED"
    assert recommendation["type"] == "INITIAL"
    assert recommendation["portfolioModelVersion"] == "rule-based-mvp-v1"
    assert len(recommendation["allocations"]) >= 5
    weights = sum(
        (Decimal(item["weight"]) for item in recommendation["allocations"]),
        Decimal("0"),
    ) + Decimal(recommendation["cashWeight"])
    assert Decimal("0.9999") <= weights <= Decimal("1.0001")

    listed = assert_success(await api.client.get("/api/v1/recommendations", headers=headers))
    assert listed["total"] == 1
    assert listed["items"][0]["id"] == recommendation["id"]

    portfolio = assert_success(
        await api.client.post(
            f"/api/v1/recommendations/{recommendation['id']}/confirm",
            headers=headers,
        )
    )
    assert portfolio["status"] == "ACTIVE"
    assert portfolio["currentVersion"] == 1
    assert portfolio["version"]["changeType"] == "INITIAL"
    assert portfolio["version"]["recommendationId"] == recommendation["id"]

    current = assert_success(await api.client.get("/api/v1/portfolios/current", headers=headers))
    assert current["id"] == portfolio["id"]
    assert current["version"]["versionNumber"] == 1

    performance = assert_success(
        await api.client.get("/api/v1/portfolios/current/performance", headers=headers)
    )
    assert performance["portfolioId"] == portfolio["id"]
    assert performance["dataSource"] == "integration-test-fixture"
    assert performance["missingSymbols"] == []
    assert len(performance["positions"]) == len(recommendation["allocations"])


async def test_generated_recommendation_can_be_dismissed(
    api: IntegrationHarness,
    register_payload: dict[str, str],
) -> None:
    registration = await register_user(api.client, register_payload)
    headers = bearer(registration["tokens"]["accessToken"])
    await create_profile(api.client, headers)
    await ensure_current_regime(api.client, headers)

    recommendation = assert_success(
        await api.client.post("/api/v1/recommendations", headers=headers)
    )
    other_registration = await register_user(
        api.client,
        {
            "email": "other-investor@example.com",
            "password": "OtherPass123",
            "fullName": "Other Investor",
        },
    )
    ownership_check = await api.client.get(
        f"/api/v1/recommendations/{recommendation['id']}",
        headers=bearer(other_registration["tokens"]["accessToken"]),
    )
    assert ownership_check.status_code == 404, ownership_check.text
    assert ownership_check.json()["error"]["code"] == "RESOURCE_NOT_FOUND"

    dismissed = assert_success(
        await api.client.post(
            f"/api/v1/recommendations/{recommendation['id']}/dismiss",
            headers=headers,
        )
    )
    assert dismissed["status"] == "DISMISSED"

    confirm_after_dismiss = await api.client.post(
        f"/api/v1/recommendations/{recommendation['id']}/confirm",
        headers=headers,
    )
    assert confirm_after_dismiss.status_code == 409, confirm_after_dismiss.text
    assert confirm_after_dismiss.json()["error"]["code"] == "RESOURCE_CONFLICT"
