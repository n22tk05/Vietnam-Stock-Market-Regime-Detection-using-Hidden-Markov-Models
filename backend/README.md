# Astera backend

Astera is a FastAPI backend for a simulated Vietnam-market investment advisor. It provides account management, investment profiling, read-only market-regime ingestion, transparent rule-based portfolio suggestions, immutable simulated portfolio versions, performance estimates, notification workflows, and scheduled maintenance.

Astera is decision-support software. It does not place buy or sell orders, execute trades, or represent real holdings. Prices, quantities, allocations, portfolio values, and performance are estimates based on the latest available artifact data.

## What is implemented

- FastAPI API under `/api/v1`, with Swagger UI at `/docs`.
- Async SQLAlchemy 2.x persistence and an Alembic migration for 18 PostgreSQL tables.
- Argon2 password hashing, short-lived JWT access tokens, rotating refresh tokens stored as SHA-256 hashes, revocation, and role checks.
- Investment profile validation, including a minimum capital of VND 1,000,000.
- A read-only adapter for the real HMM output artifact in the sibling AI Core repository.
- Market-regime normalization to `BULL`, `BEAR`, `SIDEWAY`, or `UNKNOWN`.
- A configurable `RuleBasedPortfolioRecommendationEngine` for the MVP. It is not PPO.
- Simulated portfolio confirmation, immutable version history, reference-price performance, and rebalance application only after user action.
- In-app notifications and optional SMTP delivery.
- Redis-backed login/password-reset rate limiting and Celery/Beat background jobs.
- SHA-256 integrity snapshot and verification for the read-only AI Core tree.

## System boundaries

```text
frontend
   -> FastAPI routers
      -> services
         -> repositories -> PostgreSQL
         -> adapter interfaces
            -> read-only AI Core CSV artifacts
   -> Redis (rate limits, Celery broker/results)
   -> Celery worker/beat
   -> SMTP (optional)
```

The HMM repository is mounted read-only in Docker and must remain unchanged:

```text
../Vietnam-Stock-Market-Regime-Detection-using-Hidden-Markov-Models
```

The selected integration reads the genuine precomputed file:

```text
ai_core/output/hmm_model/market_hmm_results.csv
```

There is no persisted HMM model/preprocessor contract suitable for safe live inference. Consequently, AI health is intentionally `degraded` when the artifact is readable and `unavailable` when it is not. The checked artifact's latest data date is stale relative to the audit date. `POST /api/v1/market/regime/detect` re-reads and persists an existing artifact row; it does not train the HMM or perform fresh inference.

See [AI Core analysis](docs/AI_CORE_ANALYSIS.md) for the source-level audit and [architecture](docs/BACKEND_ARCHITECTURE.md) for request/job flows.

## Requirements

- Python 3.11 is the deployment target. The package metadata accepts Python `>=3.11,<3.15`.
- PostgreSQL 16 (the Compose image) or a compatible supported PostgreSQL version.
- Redis 7 (the Compose image) or a compatible Redis deployment.
- The AI Core repository at the configured `AI_CORE_PATH`, including its existing output artifacts.
- Docker Engine and Docker Compose for the container workflow.

Do not run AI Core training, crawler, notebook, or inference scripts as part of backend setup. Backend dependencies deliberately exclude the AI Core training stack.

## Local setup

Run these commands from `backend/` unless a command explicitly uses repository-root paths.

### 1. Create an environment

PowerShell:

```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
```

POSIX shell:

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
```

### 2. Configure the application

Copy `.env.example` to `.env`, then replace `JWT_SECRET_KEY` with a long random secret.

When the API runs directly on the host while PostgreSQL and Redis expose their Compose ports, use host names `localhost`, not the Compose service names:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/astera_db
REDIS_URL=redis://localhost:6379/0
AI_CORE_PATH=../Vietnam-Stock-Market-Regime-Detection-using-Hidden-Markov-Models
```

`AI_CORE_PATH` is resolved relative to `backend/`; no machine-specific absolute path is required.
`CORS_ORIGINS` accepts a JSON list such as `["http://localhost:5173"]` or a comma-separated
value for compatibility with existing `.env` files.

For Neon, replace `DATABASE_URL` with the Neon connection string and change only the scheme to
`postgresql+asyncpg://`; keep the supplied SSL query parameters. Never commit the real URL or
password; store it only in the local `.env` or deployment secret.

For a production environment:

- set `APP_ENV=production`;
- replace the database, Redis, JWT, and SMTP credentials;
- restrict `CORS_ORIGINS` to trusted origins;
- keep the AI Core mount read-only;
- terminate TLS at the ingress/reverse proxy;
- do not use the Compose fallback JWT secret.

### 3. Start infrastructure

To use only the Compose PostgreSQL and Redis services with a host-run API:

```bash
docker compose up -d postgres redis
```

### 4. Apply migrations

```bash
alembic upgrade head
alembic current
```

The initial revision is `20260728_0001`; the current head is `20260729_0002`.
Migration configuration reads `DATABASE_URL` from application settings.

### 5. Seed or import market data

Seeding creates missing stock symbols from the read-only ticker inventory:

```bash
python -B scripts/seed_stocks.py
```

The optional import upserts real precomputed OHLCV and HMM-era ticker features into PostgreSQL. It can be large and is not required for artifact-backed API reads:

```bash
python -B scripts/import_market_data.py --batch-size 1000
```

Both scripts only read AI Core files and write to the Astera database. Optional `--ticker-file` and `--artifact` arguments can override their source paths.

### 6. Run the API

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Useful URLs:

- API health: <http://localhost:8000/health>
- Versioned health: <http://localhost:8000/api/v1/health>
- AI Core health: <http://localhost:8000/api/v1/health/ai-core>
- Swagger UI: <http://localhost:8000/docs>
- ReDoc: <http://localhost:8000/redoc>
- OpenAPI JSON: <http://localhost:8000/openapi.json>

### 7. Run background workers locally

In separate terminals, with the same environment:

```bash
celery -A app.jobs.celery_app:celery_app worker --loglevel=INFO
celery -A app.jobs.celery_app:celery_app beat --loglevel=INFO
```

On Windows, Celery may require `--pool=solo` for the worker.

## Docker Compose

The Compose stack contains `api`, `postgres`, `redis`, `celery-worker`, and `celery-beat`. From `backend/`:

```bash
docker compose up --build
```

The API container runs `alembic upgrade head` before Uvicorn starts. The AI Core sibling directory is mounted at `/opt/ai-core:ro` for every application service. PostgreSQL and Redis data use named volumes.

Run one-off database utilities inside the API container:

```bash
docker compose exec api python -B scripts/seed_stocks.py
docker compose exec api python -B scripts/import_market_data.py --batch-size 1000
docker compose exec api alembic current
```

Stop containers without deleting database volumes:

```bash
docker compose down
```

## AI Core integrity

Create a baseline from the repository root before an integration/test run:

```bash
python -B backend/scripts/verify_ai_core_integrity.py snapshot \
  --path Vietnam-Stock-Market-Regime-Detection-using-Hidden-Markov-Models \
  --output backend/runtime/ai-core-integrity.json
```

Verify it afterward:

```bash
python -B backend/scripts/verify_ai_core_integrity.py verify \
  --path Vietnam-Stock-Market-Regime-Detection-using-Hidden-Markov-Models \
  --snapshot backend/runtime/ai-core-integrity.json
```

The script reports added, removed, and modified files and exits non-zero on a mismatch. It never repairs or changes AI Core. Ignore patterns are accepted only when explicitly passed during snapshot creation; the checked baseline uses a full-tree inventory.

## Tests and quality checks

Install `requirements-dev.txt`, then run:

```bash
pytest -q
pytest -q tests/unit
pytest -q tests/integration
pytest -q tests/contract/test_ai_core_contract.py
ruff check app tests scripts
ruff format --check app tests scripts
mypy app
```

Contract tests must use the existing integrity baseline and must not train or write into AI Core. Integration tests use dependency overrides/test configuration rather than a production database.

## First API workflow

All JSON fields use camelCase. Except for health and authentication bootstrap endpoints, send the access token as:

```http
Authorization: Bearer <access-token>
```

A typical workflow is:

1. `POST /api/v1/auth/register`.
2. `POST /api/v1/investment-profile`.
3. `GET /api/v1/market/regime/current` to synchronize the real artifact if the database has no current row.
4. `POST /api/v1/recommendations` with type `INITIAL`.
5. Review the estimated allocation and disclaimer.
6. `POST /api/v1/recommendations/{id}/confirm` to create the simulated portfolio.
7. Read `/api/v1/portfolios/current/performance` using artifact reference prices.
8. Review and explicitly apply or dismiss future rebalance notifications.

Refresh tokens are rotated by `/api/v1/auth/refresh`; the submitted token is revoked. Password changes revoke all refresh sessions. Login and forgot-password initiation use Redis fixed-window limits. If Redis is unavailable, rate limiting fails open and logs a degraded event so authentication availability is preserved.

## Email behavior

Email is disabled by default. With `EMAIL_ENABLED=true`, configure `SMTP_HOST`, `SMTP_PORT`, and optional credentials. Password-reset initiation always returns the same generic response to prevent account enumeration. The raw reset token is sent only through the email provider and is never returned by the API or stored in plaintext.

The supplied Compose file explicitly sets `EMAIL_ENABLED=false` and does not pass SMTP variables. To enable mail in containers, add those variables through a production Compose override or deployment secret/environment configuration for the API and worker services; changing only the host `.env` template is not sufficient for literal Compose environment entries.

Pending notification emails are processed in batches of up to 100. Only active users who
enabled email notifications are eligible. Regime-change fan-out snapshots the in-app preference
per notification: email-only records remain eligible for SMTP but are hidden from the in-app feed.
Messages use Vietnamese for `vi`/`vi-*` preferences and fall back to English for other language
tags.

## Background schedule

Celery Beat currently schedules:

| Task | Interval | Behavior |
|---|---:|---|
| `sync_market_data` | 6 hours | Synchronize the stock catalog/features boundary from the read-only ticker artifact. |
| `detect_market_regime` | 6 hours | Re-read the existing HMM output, persist it idempotently, and detect a code change. |
| `calculate_portfolio_snapshots` | 24 hours | Estimate active portfolio values from reference prices. |
| `send_pending_notifications` | 5 minutes | Attempt eligible SMTP notifications when email is enabled. |
| `expire_old_recommendations` | 30 minutes | Mark elapsed `GENERATED` recommendations as `EXPIRED`. |
| `cleanup_expired_tokens` | 24 hours | Delete expired/old revoked refresh tokens and expired/used reset tokens. |

`calculate_stock_features`, `detect_regime_change`, and `generate_rebalance_recommendations` are registered tasks that can be invoked explicitly but are not separate Beat entries. A regime change can create a `REBALANCE` suggestion for an active portfolio and a localized notification when at least one notification channel is enabled; it never applies the new version automatically.

## Configuration reference

The complete template is `.env.example`. Important groups are:

- application/API: `APP_*`, `API_PREFIX`, `FRONTEND_URL`, `CORS_ORIGINS`;
- persistence/workers: `DATABASE_URL`, `REDIS_URL`;
- security: `JWT_*`;
- read-only integration: `AI_CORE_PATH`, timeout, staleness threshold;
- recommendations: expiry, cash weights by regime, maximum stock weight by risk, and minimum diversification;
- email: `EMAIL_*` and `SMTP_*`.

`INTERNAL_API_TOKEN` is reserved configuration only. The current regime synchronization endpoint is protected by an authenticated `ADMIN` role and does not accept an internal-token alternative.

## Documentation

- [Backend architecture](docs/BACKEND_ARCHITECTURE.md)
- [Database design](docs/DATABASE_DESIGN.md)
- [API contract](docs/API_CONTRACT.md)
- [AI Core analysis](docs/AI_CORE_ANALYSIS.md)
- [Frontend integration notes](docs/FRONTEND_INTEGRATION_NOTES.md)

## MVP limitations

- HMM consumption is read-only artifact ingestion, not live inference; AI health therefore cannot be `healthy` in the current adapter.
- The audited market-regime artifact is stale under the default 24-hour threshold.
- The AI Core has real PPO ZIP files, but their complete production inference/provenance contract is unavailable and its API does not model Astera risk/horizon inputs. The MVP engine is explicitly rule-based.
- `expectedReturn` and `maximumDrawdown` are validated and snapshotted for traceability, but rule-engine v1 does not yet use them in ranking or sizing; risk appetite, horizon, regime, momentum, volatility, and configured limits drive the result.
- Several AI Core macro inputs may be synthesized or imputed, and the source preprocessing has possible look-ahead risk. No accuracy or return guarantee is made.
- Artifact stock names/exchanges may be placeholders (`symbol` and `UNKNOWN`) where the source lacks authoritative metadata.
- Portfolio performance uses reference prices and estimated quantities; missing symbols retain invested amount at zero estimated P/L.
- There is no brokerage, order-management, custody, payment, or real-holdings integration.
