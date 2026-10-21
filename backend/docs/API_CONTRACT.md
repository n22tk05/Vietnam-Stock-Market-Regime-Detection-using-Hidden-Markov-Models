# API contract

## Scope

This document describes the implemented Astera HTTP contract. The base URL is deployment-specific; all business routes use the configurable prefix `/api/v1`. Swagger UI is served at `/docs`, ReDoc at `/redoc`, and OpenAPI JSON at `/openapi.json`.

Astera exposes simulated allocations and decision support. No endpoint places an order, executes a trade, or reports a real holding.

## Conventions

### Authentication

Protected routes require a JWT access token:

```http
Authorization: Bearer <access-token>
```

Refresh JWTs are accepted only in the JSON bodies of `/auth/refresh` and `/auth/logout`. They are not valid bearer access credentials.

Authentication labels used below:

- **Public:** no token required.
- **User:** valid access token for an `ACTIVE` user.
- **Admin:** valid access token for an `ACTIVE` user whose role is `ADMIN`.

`POST /market/regime/detect` currently supports Admin authentication only. `INTERNAL_API_TOKEN` and `X-Internal-Token` are reserved configuration/header names; no internal-token authorization path is implemented.

### Naming, dates, decimals, and IDs

- JSON property names are camelCase.
- IDs are UUID strings.
- Dates use `YYYY-MM-DD`.
- Timestamps are ISO-8601 UTC-aware values.
- Money/rates/weights are backed by `Decimal`/`NUMERIC` and serialize as JSON strings in model responses. Clients should not parse them through binary floating point when exact arithmetic matters.
- Rate fields are fractions: `"0.12"` means 12%.
- Unknown JSON fields are ignored by current Pydantic settings unless a specific schema constrains them otherwise; clients should send only documented fields.

### Request ID

A client may send a UUID in `X-Request-ID`. Invalid/missing values are replaced with a generated UUID. The result is returned both in the envelope and the `X-Request-ID` response header.

### Success envelope

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "45e8e78c-e229-4f9f-bd98-b4beff3ca8bc",
    "timestamp": "2026-07-28T08:00:00+00:00"
  }
}
```

For market-regime and stock catalog lists, pagination is in `meta.pagination`:

```json
{
  "page": 1,
  "pageSize": 20,
  "total": 60
}
```

Recommendation, notification, and history lists currently carry `items`, `total`, `page`, and `pageSize` inside `data`. Portfolio versions carry only `data.items`.

### Error envelope

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Human-readable message",
    "details": null
  },
  "meta": {
    "requestId": "45e8e78c-e229-4f9f-bd98-b4beff3ca8bc",
    "timestamp": "2026-07-28T08:00:00+00:00"
  }
}
```

Request-validation details identify locations/types but deliberately omit submitted values.

### Pagination

Paginated routes accept:

| Query | Default | Constraint |
|---|---:|---|
| `page` | 1 | Integer >= 1. |
| `pageSize` | 20 | Integer 1..100. |

## Shared data schemas

The endpoint tables refer to these response shapes.

### User and authentication

`User`:

```json
{
  "id": "uuid",
  "email": "investor@example.com",
  "fullName": "Astera Investor",
  "role": "USER",
  "status": "ACTIVE",
  "emailVerifiedAt": null,
  "lastLoginAt": null,
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

`AuthSession` is:

```json
{
  "user": { "...": "User" },
  "tokens": {
    "accessToken": "JWT",
    "refreshToken": "JWT",
    "tokenType": "bearer",
    "accessTokenExpiresAt": "ISO-8601",
    "refreshTokenExpiresAt": "ISO-8601"
  }
}
```

`UserPreference`: `id`, `userId`, `emailNotifications`, `inAppNotifications`, `language`, `createdAt`, `updatedAt`.

### Investment profile

`InvestmentProfile`: `id`, `userId`, `capital`, `riskAppetite`, `investmentHorizon`, `expectedReturn`, `maximumDrawdown`, `isActive`, `createdAt`, `updatedAt`.

Valid risk values are `LOW`, `MEDIUM`, `HIGH`; horizons are `SHORT_TERM`, `MEDIUM_TERM`, `LONG_TERM`. Capital is at least VND 1,000,000. Return and drawdown are in `[0,1]` at the request boundary.

### Market regime

`MarketRegime`:

```json
{
  "id": "uuid",
  "code": "BULL",
  "name": "Bull market",
  "description": "...",
  "probability": 0.9996685771,
  "detectedAt": "ISO-8601",
  "dataDate": "2026-07-21",
  "modelVersion": "hmm-output-sha256:38b2cba261c98906",
  "isCurrent": true,
  "metadata": {
    "rawState": 0,
    "probabilities": {
      "state_0": 0.9996685771,
      "state_1": 0.0003314229,
      "state_2": 3.3853330282566086e-43
    },
    "features": null,
    "aiCore": {
      "rawLabel": "Bull",
      "integrationStrategy": "read_only_output_artifact",
      "liveInference": false
    },
    "sourceOperation": "READ_ONLY_ARTIFACT_SYNC",
    "liveInferencePerformed": false
  }
}
```

Regime codes are `BULL`, `BEAR`, `SIDEWAY`, `UNKNOWN`. Probability is a posterior confidence when present, not an accuracy claim. Metadata contents depend on artifact provenance and are additive.

`MarketRegimeSync`: `regime`, `recordCreated`, `sourceOperation` (`READ_ONLY_ARTIFACT_SYNC`), and `liveInferencePerformed` (always false in this adapter).

### Stock

`Stock`: `id`, `symbol`, `companyName`, `exchange`, nullable `sector`/`industry`, `isActive`, nullable `latestFeatures`, and `metadata`.

`latestFeatures` contains `featureDate`, nullable `logReturn`, `return5d`, `return20d`, `volumeRatio`, `volatility20d`, `sharpeRatio`, `referencePrice`, and extension `metadata`.

`StockHistory`: `symbol`, `interval`, `startDate`, `endDate`, `source`, and `prices[]`; each point contains `tradeDate`, `openPrice`, `highPrice`, `lowPrice`, `closePrice`, and non-negative `volume`.

### Recommendation

`Recommendation`:

```json
{
  "id": "uuid",
  "investmentProfileId": "uuid",
  "regimeId": "uuid",
  "regime": "SIDEWAY",
  "type": "INITIAL",
  "status": "GENERATED",
  "capital": "100000000.00",
  "riskAppetite": "MEDIUM",
  "investmentHorizon": "LONG_TERM",
  "hmmModelVersion": "hmm-output-sha256:...",
  "portfolioModelVersion": "rule-based-mvp-v1",
  "totalWeight": "1.0000000000",
  "cashWeight": "0.2000000000",
  "cashAmount": "20000000.00",
  "explanation": "Rule-based MVP allocation ... No trade is executed.",
  "expiresAt": "ISO-8601",
  "generatedAt": "ISO-8601",
  "confirmedAt": null,
  "allocations": [
    {
      "id": "uuid",
      "stockId": "uuid",
      "symbol": "AAA",
      "companyName": "AAA",
      "exchange": "HOSE",
      "sector": null,
      "weight": "0.1000000000",
      "amount": "10000000.00",
      "referencePrice": "25000.0000",
      "quantityEstimated": "400.0000",
      "reason": "Selected for risk-adjusted return under a long term horizon.",
      "rank": 1
    }
  ],
  "disclaimer": "Estimated allocation for simulation and decision support only."
}
```

Types: `INITIAL`, `RECALCULATION`, `REBALANCE`. Statuses: `GENERATED`, `CONFIRMED`, `APPLIED`, `DISMISSED`, `EXPIRED`, `FAILED`.

Recommendation list items are summaries: `id`, `regime`, `type`, `status`, `capital`, `cashWeight`, `generatedAt`, `expiresAt`, `confirmedAt`.

### Portfolio and performance

`Portfolio`: `id`, `name`, `status`, `currentVersion`, `initialCapital`, `currentValue`, `confirmedAt`, `createdAt`, `updatedAt`, `version`, and a simulation disclaimer.

`version`: `id`, nullable `recommendationId`, `versionNumber`, `changeType`, `regimeId`, `regime`, `totalValue`, `cashWeight`, `cashAmount`, `effectiveAt`, and `allocations[]`.

Each portfolio allocation has `id`, `stockId`, `symbol`, `companyName`, `weight`, `investedAmount`, `entryPrice`, and `estimatedQuantity`.

`PortfolioPerformance`: `portfolioId`, `asOfDate`, `initialCapital`, `estimatedTotalValue`, `cashAmount`, `profitLoss`, `pnlPercent`, `positions`, `missingSymbols`, `dataSource`, and disclaimer. A position includes symbol, estimated quantity, entry/current reference prices, invested/estimated values, P/L, and P/L ratio.

Change types are `INITIAL`, `REBALANCE`, `MANUAL_RECALCULATION`; portfolio statuses are `ACTIVE`, `ARCHIVED`.

### Notification and history

`Notification`: `id`, `type`, `title`, `summary`, nullable `recommendationId`/`portfolioId`, `status`, nullable `readAt`/`actionedAt`/`emailSentAt`, and `createdAt`.

Notification statuses are `UNREAD`, `READ`, `APPLIED`, `DISMISSED`. An apply response contains `{ "notification": Notification, "portfolio": Portfolio or null }`.

History is recommendation history, not portfolio-version history. A history item contains `id` (the recommendation ID), `recordType=RECOMMENDATION`, `recommendationType`, `status`, `regime`, `capital`, `generatedAt`, and `confirmedAt`. A detail contains `historyScope=RECOMMENDATION_HISTORY` and the full `recommendation`.

## System endpoints

| Method and path | Auth | Request | Success | Errors/operational behavior |
|---|---|---|---|---|
| `GET /health` | Public | None. | `200`; data `{status:"healthy", service:"astera-api"}`. | `500 INTERNAL_SERVER_ERROR` only for an unexpected application failure. This is a process-level probe and does not check dependencies. |
| `GET /api/v1/health` | Public | None. | `200`; data `{status, service, database}`. | Database probe failure is represented as `status:"degraded", database:"unavailable"` with HTTP 200, not an error envelope. |
| `GET /api/v1/health/ai-core` | Public | None. | `200`; `AICoreHealth`. | Adapter issues are represented as `status:"degraded"` or `"unavailable"` plus `details`; unexpected failures can produce `500`. |

`AICoreHealth` fields are `status`, `integrationMode`, `repositoryExists`, `artifactExists`, `liveInferenceAvailable`, nullable `latestDataDate`/`modelVersion`, `requiredFiles`, `dependencies`, and `details`. `liveInferenceAvailable` is false for the implemented adapter.

## Authentication endpoints

| Method and path | Auth | Request | Success | Endpoint-specific errors |
|---|---|---|---|---|
| `POST /api/v1/auth/register` | Public | `{email, password, fullName}`. Password 8..128 chars with >=1 letter and >=1 digit; name 2..160. | `201`; `AuthSession`. Creates default preferences and refresh-session hash. | `409 RESOURCE_CONFLICT` duplicate email; `422 VALIDATION_ERROR`. |
| `POST /api/v1/auth/login` | Public | `{email, password}`. | `200`; `AuthSession`; updates `lastLoginAt`. | `401 AUTHENTICATION_REQUIRED` invalid credentials/non-active account; `429 RATE_LIMIT_EXCEEDED`; `422`. |
| `POST /api/v1/auth/refresh` | Public | `{refreshToken}`. | `200`; new `AuthSession`; submitted stored token is revoked. | `401` invalid, expired, revoked, wrong-type, or unknown-subject token; `422`. |
| `POST /api/v1/auth/logout` | Public | `{refreshToken}`. | `200`; `{message:"Logged out successfully"}`. Already-revoked/missing stored record is a no-op after valid JWT decoding. | `401` invalid/expired/wrong-type JWT; `422`. |
| `POST /api/v1/auth/forgot-password` | Public | `{email}`. | `200`; generic `{message:"If the account exists, password reset instructions will be sent"}`. | `429`; `422`. Unknown/non-active accounts, disabled email, and handled SMTP delivery failures do not alter the generic success response. |
| `POST /api/v1/auth/reset-password` | Public | `{token, newPassword}`; password policy as registration. | `200`; `{message:"Password reset successfully"}`; consumes reset token and revokes all refresh sessions. | `401` reset token invalid/expired/used or account unavailable; `422`. |
| `POST /api/v1/auth/change-password` | User | `{currentPassword, newPassword}`; values must differ. | `200`; message states all refresh sessions were revoked. | `401` missing/invalid access token, wrong current password, unavailable user; `422`. |
| `GET /api/v1/auth/me` | User | None. | `200`; `User`. | `401`. |

Login limit is 10 requests per hashed client IP/path/60 seconds; forgot-password is 5 per 15 minutes. Redis errors are logged and fail open.

## User endpoints

| Method and path | Auth | Request | Success | Endpoint-specific errors |
|---|---|---|---|---|
| `GET /api/v1/users/me` | User | None. | `200`; `User`. | `401`. |
| `PATCH /api/v1/users/me` | User | At least one non-null field: `{email?, fullName?}`. | `200`; updated `User`. Changing email clears `emailVerifiedAt`. | `409 RESOURCE_CONFLICT` duplicate email; `422`; `401`. |
| `GET /api/v1/users/me/preferences` | User | None. | `200`; `UserPreference`; creates defaults if unexpectedly absent. | `401`; database errors. |
| `PATCH /api/v1/users/me/preferences` | User | At least one non-null field: `{emailNotifications?, inAppNotifications?, language?}`. Language matches `xx` or `xx-YY`. | `200`; updated `UserPreference`. | `422`; `401`. |

## Investment profile endpoints

Creation example:

```json
{
  "capital": "100000000.00",
  "riskAppetite": "MEDIUM",
  "investmentHorizon": "LONG_TERM",
  "expectedReturn": "0.15",
  "maximumDrawdown": "0.20"
}
```

| Method and path | Auth | Request | Success | Endpoint-specific errors |
|---|---|---|---|---|
| `GET /api/v1/investment-profile` | User | None. | `200`; active `InvestmentProfile`. | `404 RESOURCE_NOT_FOUND`; `401`. |
| `POST /api/v1/investment-profile` | User | All five fields in example. | `201`; created `InvestmentProfile`. | `409 RESOURCE_CONFLICT` active profile already exists; `400 INVALID_INVESTMENT_PROFILE` when configured minimum exceeds schema minimum; `422`; `401`. |
| `PATCH /api/v1/investment-profile` | User | At least one non-null profile field. | `200`; updated active `InvestmentProfile`. | `404`; `400 INVALID_INVESTMENT_PROFILE`; `422`; `401`. |

## Market endpoints

| Method and path | Auth | Request | Success | Endpoint-specific errors |
|---|---|---|---|---|
| `GET /api/v1/market/regime/current` | User | None. | `200`; current `MarketRegime`. If DB is empty, safely synchronizes latest real artifact row first. | `503 AI_CORE_UNAVAILABLE`; `504 AI_CORE_TIMEOUT`; `502 INVALID_AI_OUTPUT`; `401`; database errors. |
| `GET /api/v1/market/regimes` | User | `page`, `pageSize`. | `200`; data is `MarketRegime[]`; pagination in `meta.pagination`. | `422`; `401`; database errors. An empty database yields an empty list. |
| `POST /api/v1/market/regime/detect` | Admin | Optional `{asOfDate?:"YYYY-MM-DD"}` or no body. | `200`; `MarketRegimeSync`. Re-reads existing output; no live inference/training. Historical `asOfDate` creates/returns an audit row without moving current backward. | `403 PERMISSION_DENIED`; `401`; `503 AI_CORE_UNAVAILABLE` (including no row on/before date); `504`; `502`; `409 RESOURCE_CONFLICT` concurrent incompatible update; `422`. |

The adapter may normalize `Sideways` to `SIDEWAY`; it does not alter the source artifact. `recordCreated=false` means an identical persisted artifact result already exists.

## Stock endpoints

| Method and path | Auth | Request | Success | Endpoint-specific errors |
|---|---|---|---|---|
| `GET /api/v1/stocks` | User | Pagination plus optional `search` (<=160), `exchange` (<=32), `sector` (<=160). | `200`; data `Stock[]`; `meta.pagination`. Ensures catalog from latest artifact if empty. | `503 MARKET_DATA_UNAVAILABLE`; `409 RESOURCE_CONFLICT` catalog sync race that cannot be reconciled; `422`; `401`. |
| `GET /api/v1/stocks/{symbol}` | User | Symbol path 1..24 chars; normalized uppercase. | `200`; `Stock`. | `404 RESOURCE_NOT_FOUND` invalid/missing symbol; `503 MARKET_DATA_UNAVAILABLE`; `401`; `422`. |
| `GET /api/v1/stocks/{symbol}/history` | User | `range` is one of `1m`, `3m`, `6m`, `1y`, `3y`, `5y`, `max` (default `1y`); `interval` is `1d`, `1wk`, or `1mo` (default `1d`); optional `start_date`, `end_date`. | `200`; `StockHistory`. Explicit dates constrain the scan; non-daily intervals aggregate OHLCV. | `422 INVALID_STOCK_HISTORY_RANGE` if start is after end; `422 VALIDATION_ERROR`; `404`; `503 MARKET_DATA_UNAVAILABLE`; `401`. |

Query date parameter names are snake case (`start_date`, `end_date`); JSON output is camelCase. Prices are converted from source thousands-of-VND to VND. A valid stock with no rows in the chosen period returns `prices: []`.

## Recommendation endpoints

Generate request is optional; omitted body defaults to `INITIAL`:

```json
{
  "type": "INITIAL"
}
```

| Method and path | Auth | Request | Success | Endpoint-specific errors |
|---|---|---|---|---|
| `POST /api/v1/recommendations` | User | Optional `{type}`: `INITIAL`, `RECALCULATION`, `REBALANCE`. | `200`; full `Recommendation` in `GENERATED` state, normally expiring after configured 24 hours. | `404 RESOURCE_NOT_FOUND` missing active profile/current regime or required active portfolio; `409 RESOURCE_CONFLICT` initial request while active portfolio exists; `503 MARKET_DATA_UNAVAILABLE`; `422`; `401`. |
| `GET /api/v1/recommendations` | User | `page`, `pageSize`. | `200`; `{items,total,page,pageSize}`. Elapsed generated rows are marked expired during read. | `422`; `401`; database errors. |
| `GET /api/v1/recommendations/{id}` | User | UUID path. | `200`; owned full `Recommendation`; lazily expires elapsed generated row. | `404`; `422`; `401`. Another user's ID is reported as not found. |
| `POST /api/v1/recommendations/{id}/confirm` | User | UUID path; no body. | `200`; `Portfolio`. Creates initial portfolio or appends version; repeated already-materialized request returns that portfolio record. | `404`; `409 RESOURCE_CONFLICT` expired/invalid state/no allocations/wrong portfolio precondition; `422`; `401`. |
| `POST /api/v1/recommendations/{id}/dismiss` | User | UUID path; no body. | `200`; full dismissed `Recommendation`; repeated dismiss is idempotent. | `404`; `409` unless current state is `GENERATED` or already `DISMISSED`; `422`; `401`. |

`RECALCULATION` and `REBALANCE` use the active portfolio's cached current value, not arbitrary client capital. Generation requires a persisted current regime; call current-regime first on a fresh database. Total stock plus cash weight is validated within `0.9999..1.0001`.

Rule-engine v1 persists/snapshots `expectedReturn` and `maximumDrawdown` but currently ranks and sizes using regime, risk appetite, horizon, momentum, volatility, risk-adjusted return, and configured diversification/weight limits.

## Portfolio endpoints

| Method and path | Auth | Request | Success | Endpoint-specific errors |
|---|---|---|---|---|
| `GET /api/v1/portfolios/current` | User | None. | `200`; current `Portfolio` and latest version allocations. | `404 RESOURCE_NOT_FOUND`; `401`. |
| `GET /api/v1/portfolios/current/performance` | User | None. | `200`; `PortfolioPerformance` based on latest artifact reference prices. | `404`; `503 MARKET_DATA_UNAVAILABLE`; `401`. |
| `GET /api/v1/portfolios/current/versions` | User | None. | `200`; `{items:[version summaries]}` ordered by descending version number. | `404`; `401`. |
| `POST /api/v1/portfolios/current/recalculate` | User | No body. | `200`; new `RECALCULATION` `Recommendation` for review; it does not alter portfolio yet. | `404` profile/regime/active portfolio; `503 MARKET_DATA_UNAVAILABLE`; `401`. |
| `POST /api/v1/portfolios/current/rebalance` | User | No body. | `200`; new `REBALANCE` `Recommendation` for review; it does not alter portfolio yet. | `404`; `503 MARKET_DATA_UNAVAILABLE`; `401`. |

Version summaries contain `id`, nullable `recommendationId`, `versionNumber`, `changeType`, `regime`, `totalValue`, `cashWeight`, and `effectiveAt`.

Performance is a reference-price simulation. If a current symbol is absent in the latest artifact snapshot, its estimated value remains its invested amount, P/L is zero, current reference price is null, and the symbol appears in `missingSymbols`.

## Notification endpoints

| Method and path | Auth | Request | Success | Endpoint-specific errors |
|---|---|---|---|---|
| `GET /api/v1/notifications` | User | `page`, `pageSize`; optional `status` is `UNREAD`, `READ`, `APPLIED`, or `DISMISSED`. | `200`; `{items,total,page,pageSize}`. | `422`; `401`. |
| `GET /api/v1/notifications/{id}` | User | UUID path. | `200`; owned `Notification`. | `404`; `422`; `401`. |
| `PATCH /api/v1/notifications/{id}/read` | User | UUID path; no body. | `200`; `Notification`; `UNREAD -> READ`. Other states are returned unchanged, so repeated use is idempotent. | `404`; `422`; `401`. |
| `POST /api/v1/notifications/{id}/apply` | User | UUID path; no body. | `200`; `{notification,portfolio}`. Atomically materializes linked recommendation as a new simulated portfolio version and marks both applied. | `404`; `409 RESOURCE_CONFLICT` dismissed/no recommendation/invalid linked recommendation state; `422`; `401`. |
| `POST /api/v1/notifications/{id}/dismiss` | User | UUID path; no body. | `200`; dismissed `Notification`; also dismisses linked recommendation if it is still generated. Repeated dismiss is idempotent. | `404`; `409` applied notification cannot be dismissed; `422`; `401`. |

Applying an already applied notification is idempotent and returns the current portfolio. Notifications are currently generated by regime-change jobs; there is no client create endpoint.

Regime-change jobs always generate the reviewable `REBALANCE` recommendation. They create a
notification record only when at least one of `inAppNotifications` or `emailNotifications` is
enabled. Email-only records are excluded from `GET /api/v1/notifications`, while remaining
eligible for the SMTP job. Notification text is Vietnamese for `vi`/`vi-*`; unsupported language
tags fall back to English. Channel choices are captured when the notification is generated.

## History endpoints

| Method and path | Auth | Request | Success | Endpoint-specific errors |
|---|---|---|---|---|
| `GET /api/v1/history` | User | `page`, `pageSize`. | `200`; `{historyScope:"RECOMMENDATION_HISTORY",items,total,page,pageSize}`. | `422`; `401`. |
| `GET /api/v1/history/{id}` | User | Recommendation/history UUID. | `200`; `{historyScope:"RECOMMENDATION_HISTORY",recommendation}`. | `404 RESOURCE_NOT_FOUND`; `422`; `401`. |

Portfolio allocation history is separate at `GET /portfolios/current/versions`.

## Error code catalog

| HTTP | Code | Meaning |
|---:|---|---|
| 400 | `APPLICATION_ERROR` | Base domain failure without a more specific code. |
| 400 | `INVALID_INVESTMENT_PROFILE` | Capital violates the configured service-level minimum. |
| 401 | `AUTHENTICATION_REQUIRED` | Missing/invalid/expired credential, wrong token type, invalid credentials, or unavailable account. |
| 403 | `PERMISSION_DENIED` | Authenticated user lacks required role. |
| 404 | `RESOURCE_NOT_FOUND` | Owned resource/precondition not found; ownership is not disclosed. |
| 409 | `RESOURCE_CONFLICT` | Duplicate resource, invalid lifecycle/precondition, or conflicting concurrent update. |
| 409 | `INVALID_STATE_TRANSITION` | Reserved specialized conflict for invalid state transitions. |
| 422 | `VALIDATION_ERROR` | Pydantic/FastAPI path, query, or body validation failure. |
| 422 | `INVALID_STOCK_HISTORY_RANGE` | `start_date` is after `end_date`. |
| 429 | `RATE_LIMIT_EXCEEDED` | Authentication fixed-window limit exceeded. |
| 502 | `INVALID_AI_OUTPUT` | Artifact schema/value/mapping/probability contract is invalid. |
| 503 | `AI_CORE_UNAVAILABLE` | AI repository/artifact/as-of result is unavailable or changed during read. |
| 503 | `MARKET_DATA_UNAVAILABLE` | Ticker artifact missing, invalid, timed out, or cannot satisfy diversification. |
| 503 | `DATABASE_ERROR` | SQLAlchemy operation failed; internal details are not returned. |
| 504 | `AI_CORE_TIMEOUT` | Regime artifact read exceeded configured timeout. |
| 500 | `INTERNAL_SERVER_ERROR` | Unhandled failure; no production stack trace is returned. |
| varies | `HTTP_ERROR` | Other FastAPI HTTP errors not normalized above. |

All protected endpoints can additionally return `401`; typed inputs can additionally return `422`; persistence-backed endpoints can return `503 DATABASE_ERROR`; unexpected failures can return `500` even when the endpoint table lists only domain-specific outcomes.

## Lifecycle rules

### Recommendation

```text
GENERATED -> CONFIRMED     direct confirmation/materialization
GENERATED -> APPLIED       notification-driven materialization
GENERATED -> DISMISSED
GENERATED -> EXPIRED       lazy read or scheduled expiration
```

`FAILED` exists in the domain/schema but the synchronous generation path rolls back and returns an error rather than persisting a failed row.

### Notification

```text
UNREAD -> READ
UNREAD/READ -> APPLIED
UNREAD/READ -> DISMISSED
```

No automatic rebalance application occurs. Only the authenticated owner can confirm a recommendation or apply its notification.

## Integration notes for clients

- On a new database, fetch `/market/regime/current` before generating a recommendation so a real artifact result is persisted.
- Inspect AI health and `dataDate`; HTTP 200 does not mean the artifact is fresh or live inference is available.
- Display the recommendation/portfolio disclaimer near every simulated allocation and performance view.
- Treat `quantityEstimated`, `currentValue`, and P/L as estimates, not holdings or executed results.
- Refresh by replacing both tokens with the returned pair; never retain/reuse the submitted refresh token.
- Do not send `userId`; ownership always comes from the access token.
- Handle a 404 for another user's UUID identically to a missing UUID.
- The existing frontend still uses hardcoded/local JSON and needs the mappings listed in `FRONTEND_INTEGRATION_NOTES.md`.
