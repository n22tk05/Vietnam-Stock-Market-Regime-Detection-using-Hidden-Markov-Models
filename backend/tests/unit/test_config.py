from __future__ import annotations

from app.core.config import Settings


def test_cors_origins_accepts_comma_separated_and_json_values() -> None:
    comma_separated = Settings(cors_origins="http://localhost:5173, http://127.0.0.1:5173")
    json_value = Settings(cors_origins='["http://localhost:5173"]')

    assert comma_separated.cors_origins == [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    assert json_value.cors_origins == ["http://localhost:5173"]


def test_database_url_normalizes_neon_libpq_parameters_for_asyncpg() -> None:
    settings = Settings(
        database_url=(
            "postgresql://user:password@db.example/neondb?sslmode=require&channel_binding=require"
        )
    )

    assert settings.database_url == (
        "postgresql+asyncpg://user:password@db.example/neondb?ssl=require"
    )
