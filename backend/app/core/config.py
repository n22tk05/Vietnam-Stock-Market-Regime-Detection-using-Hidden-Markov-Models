from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Annotated
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Astera API"
    app_env: str = "development"
    app_host: str = "0.0.0.0"  # noqa: S104 - configured container bind address
    app_port: int = 8000
    api_prefix: str = "/api/v1"

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/astera_db"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret_key: str = Field(default="development-only-secret-change-me-please", min_length=32)
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = Field(default=30, ge=1, le=1440)
    jwt_refresh_token_expire_days: int = Field(default=30, ge=1, le=365)

    frontend_url: str = "http://localhost:5173"
    # Accept both a JSON list and the convenient comma-separated .env form.
    # NoDecode is required because pydantic-settings otherwise tries JSON
    # decoding before the validator can normalize a single origin string.
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8080",
            "http://127.0.0.1:8080",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
        ]
    )

    ai_core_path: Path = Path("..")
    ai_core_integration_mode: str = "auto"
    ai_core_timeout_seconds: int = Field(default=60, ge=1, le=300)
    ai_core_disable_bytecode: bool = True

    recommendation_expire_hours: int = Field(default=24, ge=1, le=168)
    market_regime_stale_hours: int = Field(default=24, ge=1, le=720)
    minimum_investment_capital: int = Field(default=1_000_000, ge=1)
    internal_api_token: str | None = None

    recommendation_bull_cash_weight: float = Field(default=0.05, ge=0, lt=1)
    recommendation_sideway_cash_weight: float = Field(default=0.20, ge=0, lt=1)
    recommendation_bear_cash_weight: float = Field(default=0.45, ge=0, lt=1)
    recommendation_low_risk_max_weight: float = Field(default=0.12, gt=0, le=1)
    recommendation_medium_risk_max_weight: float = Field(default=0.18, gt=0, le=1)
    recommendation_high_risk_max_weight: float = Field(default=0.25, gt=0, le=1)
    recommendation_min_diversification: int = Field(default=5, ge=2, le=30)

    email_enabled: bool = False
    email_from: str = "noreply@astera.local"
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            raw_value = value.strip()
            if raw_value.startswith("["):
                try:
                    return json.loads(raw_value)
                except json.JSONDecodeError as exc:
                    raise ValueError(
                        "CORS_ORIGINS must be a JSON list or comma-separated URLs"
                    ) from exc
            return [origin.strip() for origin in raw_value.split(",") if origin.strip()]
        return value

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: object) -> object:
        if not isinstance(value, str):
            return value

        parsed = urlsplit(value)
        if parsed.scheme not in {"postgresql", "postgresql+asyncpg"}:
            return value

        query: list[tuple[str, str]] = []
        for key, item in parse_qsl(parsed.query, keep_blank_values=True):
            if key == "channel_binding":
                # asyncpg has no channel_binding connect argument. TLS still
                # remains mandatory through the normalized ssl=require value.
                continue
            if key == "sslmode":
                key = "ssl"
            query.append((key, item))

        normalized_scheme = "postgresql+asyncpg"
        normalized_query = urlencode(query)
        return urlunsplit(
            (
                normalized_scheme,
                parsed.netloc,
                parsed.path,
                normalized_query,
                parsed.fragment,
            )
        )

    @field_validator("ai_core_path", mode="after")
    @classmethod
    def resolve_ai_core_path(cls, value: Path) -> Path:
        if value.is_absolute():
            return value
        return (BACKEND_DIR / value).resolve()

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @model_validator(mode="after")
    def protect_production_secrets(self) -> Settings:
        if self.is_production and self.jwt_secret_key.startswith("development-only"):
            raise ValueError("JWT_SECRET_KEY must be replaced in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
