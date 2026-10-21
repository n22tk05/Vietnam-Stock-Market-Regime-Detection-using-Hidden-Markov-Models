from __future__ import annotations

from typing import Any, cast

from httpx import AsyncClient, Response


def assert_success(response: Response, expected_status: int = 200) -> dict[str, Any]:
    assert response.status_code == expected_status, response.text
    payload = cast(dict[str, Any], response.json())
    assert payload["success"] is True
    assert "data" in payload
    assert payload["meta"]["requestId"]
    assert payload["meta"]["timestamp"]
    assert response.headers["X-Request-ID"] == payload["meta"]["requestId"]
    data = payload["data"]
    assert isinstance(data, dict), payload
    return data


async def register_user(
    client: AsyncClient,
    payload: dict[str, str],
) -> dict[str, Any]:
    response = await client.post("/api/v1/auth/register", json=payload)
    return assert_success(response, 201)


def bearer(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}


async def create_profile(client: AsyncClient, headers: dict[str, str]) -> dict[str, Any]:
    response = await client.post(
        "/api/v1/investment-profile",
        headers=headers,
        json={
            "capital": "5000000.00",
            "riskAppetite": "MEDIUM",
            "investmentHorizon": "MEDIUM_TERM",
            "expectedReturn": "0.15",
            "maximumDrawdown": "0.20",
        },
    )
    return assert_success(response, 201)


async def ensure_current_regime(client: AsyncClient, headers: dict[str, str]) -> dict[str, Any]:
    response = await client.get("/api/v1/market/regime/current", headers=headers)
    return assert_success(response)
