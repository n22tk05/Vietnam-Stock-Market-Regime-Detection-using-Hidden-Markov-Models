from __future__ import annotations

from tests.conftest import IntegrationHarness
from tests.integration.helpers import assert_success, bearer, register_user


async def test_register_login_refresh_me_and_profile(
    api: IntegrationHarness,
    register_payload: dict[str, str],
) -> None:
    registered = await register_user(api.client, register_payload)
    assert registered["user"]["email"] == "investor@example.com"
    assert registered["user"]["fullName"] == "Astera Investor"
    assert registered["tokens"]["tokenType"] == "bearer"
    registration_access_token = registered["tokens"]["accessToken"]

    auth_me = assert_success(
        await api.client.get(
            "/api/v1/auth/me",
            headers=bearer(registration_access_token),
        )
    )
    assert auth_me["id"] == registered["user"]["id"]

    login = assert_success(
        await api.client.post(
            "/api/v1/auth/login",
            json={
                "email": "INVESTOR@example.com",
                "password": register_payload["password"],
            },
        )
    )
    assert login["user"]["lastLoginAt"] is not None
    first_refresh_token = login["tokens"]["refreshToken"]

    refreshed = assert_success(
        await api.client.post(
            "/api/v1/auth/refresh",
            json={"refreshToken": first_refresh_token},
        )
    )
    assert refreshed["tokens"]["refreshToken"] != first_refresh_token
    assert refreshed["tokens"]["accessToken"]

    replay = await api.client.post(
        "/api/v1/auth/refresh",
        json={"refreshToken": first_refresh_token},
    )
    assert replay.status_code == 401, replay.text
    assert replay.json()["error"]["code"] == "AUTHENTICATION_REQUIRED"

    headers = bearer(refreshed["tokens"]["accessToken"])
    users_me = assert_success(await api.client.get("/api/v1/users/me", headers=headers))
    assert users_me["email"] == "investor@example.com"

    created_profile = assert_success(
        await api.client.post(
            "/api/v1/investment-profile",
            headers=headers,
            json={
                "capital": "5000000.00",
                "riskAppetite": "MEDIUM",
                "investmentHorizon": "MEDIUM_TERM",
                "expectedReturn": "0.15",
                "maximumDrawdown": "0.20",
            },
        ),
        201,
    )
    assert created_profile["userId"] == registered["user"]["id"]
    assert created_profile["capital"] == "5000000.00"
    assert created_profile["riskAppetite"] == "MEDIUM"

    current_profile = assert_success(
        await api.client.get("/api/v1/investment-profile", headers=headers)
    )
    assert current_profile["id"] == created_profile["id"]

    invalid_profile = await api.client.patch(
        "/api/v1/investment-profile",
        headers=headers,
        json={"capital": "999999.99"},
    )
    assert invalid_profile.status_code == 422, invalid_profile.text
    assert invalid_profile.json()["error"]["code"] == "VALIDATION_ERROR"
