"""Create the initial Astera application schema.

Revision ID: 20260728_0001
Revises: None
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260728_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _id() -> sa.Column:
    return sa.Column("id", sa.Uuid(), nullable=False)


def _created_at() -> sa.Column:
    return sa.Column(
        "created_at",
        sa.DateTime(timezone=True),
        server_default=sa.text("CURRENT_TIMESTAMP"),
        nullable=False,
    )


def _updated_at() -> sa.Column:
    return sa.Column(
        "updated_at",
        sa.DateTime(timezone=True),
        server_default=sa.text("CURRENT_TIMESTAMP"),
        nullable=False,
    )


def upgrade() -> None:
    op.create_table(
        "users",
        _id(),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(160), nullable=False),
        sa.Column("role", sa.String(20), server_default="USER", nullable=False),
        sa.Column("status", sa.String(20), server_default="ACTIVE", nullable=False),
        sa.Column("email_verified_at", sa.DateTime(timezone=True)),
        sa.Column("last_login_at", sa.DateTime(timezone=True)),
        _created_at(),
        _updated_at(),
        sa.CheckConstraint("role IN ('USER', 'ADMIN')", name="ck_users_role_values"),
        sa.CheckConstraint(
            "status IN ('ACTIVE', 'INACTIVE', 'BLOCKED')",
            name="ck_users_status_values",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "stocks",
        _id(),
        sa.Column("symbol", sa.String(24), nullable=False),
        sa.Column("company_name", sa.String(255), nullable=False),
        sa.Column("exchange", sa.String(32), nullable=False),
        sa.Column("sector", sa.String(160)),
        sa.Column("industry", sa.String(160)),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        _created_at(),
        _updated_at(),
        sa.PrimaryKeyConstraint("id", name="pk_stocks"),
    )
    op.create_index("ix_stocks_symbol", "stocks", ["symbol"], unique=True)
    op.create_index("ix_stocks_sector", "stocks", ["sector"])
    op.create_index("ix_stocks_is_active", "stocks", ["is_active"])

    op.create_table(
        "market_regimes",
        _id(),
        sa.Column("code", sa.String(20), nullable=False),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("probability", sa.Numeric(12, 10)),
        sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("data_date", sa.Date()),
        sa.Column("model_version", sa.String(160)),
        sa.Column("is_current", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("metadata", sa.JSON()),
        _created_at(),
        sa.CheckConstraint(
            "code IN ('BULL', 'BEAR', 'SIDEWAY', 'UNKNOWN')",
            name="ck_market_regimes_code_values",
        ),
        sa.CheckConstraint(
            "probability IS NULL OR (probability >= 0 AND probability <= 1)",
            name="ck_market_regimes_probability_range",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_market_regimes"),
        sa.UniqueConstraint(
            "code",
            "data_date",
            "model_version",
            name="market_regime_artifact_result",
        ),
    )
    op.create_index("ix_market_regimes_current", "market_regimes", ["is_current"])
    op.create_index("ix_market_regimes_data_date", "market_regimes", ["data_date"])
    op.create_index(
        "uq_market_regimes_one_current",
        "market_regimes",
        ["is_current"],
        unique=True,
        postgresql_where=sa.text("is_current = true"),
        sqlite_where=sa.text("is_current = 1"),
    )

    op.create_table(
        "model_versions",
        _id(),
        sa.Column("model_type", sa.String(50), nullable=False),
        sa.Column("version", sa.String(160), nullable=False),
        sa.Column("storage_path", sa.String(500), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("metrics", sa.JSON()),
        sa.Column("trained_from", sa.Date()),
        sa.Column("trained_to", sa.Date()),
        sa.Column("activated_at", sa.DateTime(timezone=True)),
        _created_at(),
        sa.CheckConstraint(
            "status IN ('ACTIVE', 'INACTIVE', 'UNAVAILABLE')",
            name="ck_model_versions_status_values",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_model_versions"),
    )
    op.create_index(
        "ix_model_versions_type_status", "model_versions", ["model_type", "status"]
    )

    op.create_table(
        "refresh_tokens",
        _id(),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        _created_at(),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_refresh_tokens_user_id_users", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_refresh_tokens"),
        sa.UniqueConstraint("token_hash", name="uq_refresh_tokens_token_hash"),
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
    op.create_index(
        "ix_refresh_tokens_user_active", "refresh_tokens", ["user_id", "revoked_at"]
    )

    op.create_table(
        "password_reset_tokens",
        _id(),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True)),
        _created_at(),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_password_reset_tokens_user_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_password_reset_tokens"),
        sa.UniqueConstraint("token_hash", name="uq_password_reset_tokens_token_hash"),
    )
    op.create_index("ix_password_reset_tokens_user_id", "password_reset_tokens", ["user_id"])
    op.create_index(
        "ix_password_reset_tokens_user_active",
        "password_reset_tokens",
        ["user_id", "used_at"],
    )

    op.create_table(
        "user_preferences",
        _id(),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("email_notifications", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("in_app_notifications", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("language", sa.String(10), server_default="vi", nullable=False),
        _created_at(),
        _updated_at(),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_user_preferences_user_id_users", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_user_preferences"),
        sa.UniqueConstraint("user_id", name="uq_user_preferences_user_id"),
    )

    op.create_table(
        "investment_profiles",
        _id(),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("capital", sa.Numeric(20, 2), nullable=False),
        sa.Column("risk_appetite", sa.String(20), nullable=False),
        sa.Column("investment_horizon", sa.String(30), nullable=False),
        sa.Column("expected_return", sa.Numeric(8, 6), nullable=False),
        sa.Column("maximum_drawdown", sa.Numeric(8, 6), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        _created_at(),
        _updated_at(),
        sa.CheckConstraint("capital >= 1000000", name="ck_investment_profiles_capital_minimum"),
        sa.CheckConstraint(
            "risk_appetite IN ('LOW', 'MEDIUM', 'HIGH')",
            name="ck_investment_profiles_risk_appetite_values",
        ),
        sa.CheckConstraint(
            "investment_horizon IN ('SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM')",
            name="ck_investment_profiles_investment_horizon_values",
        ),
        sa.CheckConstraint(
            "expected_return >= 0", name="ck_investment_profiles_expected_return_nonnegative"
        ),
        sa.CheckConstraint(
            "maximum_drawdown >= 0 AND maximum_drawdown <= 1",
            name="ck_investment_profiles_maximum_drawdown_range",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_investment_profiles_user_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_investment_profiles"),
    )
    op.create_index("ix_investment_profiles_user_id", "investment_profiles", ["user_id"])
    op.create_index(
        "ix_investment_profiles_user_active", "investment_profiles", ["user_id", "is_active"]
    )
    op.create_index(
        "uq_investment_profiles_one_active_user",
        "investment_profiles",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("is_active = true"),
        sqlite_where=sa.text("is_active = 1"),
    )

    op.create_table(
        "stock_prices",
        _id(),
        sa.Column("stock_id", sa.Uuid(), nullable=False),
        sa.Column("trade_date", sa.Date(), nullable=False),
        sa.Column("open_price", sa.Numeric(20, 4), nullable=False),
        sa.Column("high_price", sa.Numeric(20, 4), nullable=False),
        sa.Column("low_price", sa.Numeric(20, 4), nullable=False),
        sa.Column("close_price", sa.Numeric(20, 4), nullable=False),
        sa.Column("adjusted_close", sa.Numeric(20, 4)),
        sa.Column("volume", sa.Integer(), nullable=False),
        _created_at(),
        sa.CheckConstraint("volume >= 0", name="ck_stock_prices_volume_nonnegative"),
        sa.ForeignKeyConstraint(
            ["stock_id"], ["stocks.id"], name="fk_stock_prices_stock_id_stocks", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_stock_prices"),
        sa.UniqueConstraint("stock_id", "trade_date", name="stock_trade_date"),
    )
    op.create_index("ix_stock_prices_stock_id", "stock_prices", ["stock_id"])
    op.create_index("ix_stock_prices_trade_date", "stock_prices", ["trade_date"])

    op.create_table(
        "stock_features",
        _id(),
        sa.Column("stock_id", sa.Uuid(), nullable=False),
        sa.Column("feature_date", sa.Date(), nullable=False),
        sa.Column("daily_return", sa.Numeric(14, 10)),
        sa.Column("log_return", sa.Numeric(14, 10)),
        sa.Column("return_5d", sa.Numeric(14, 10)),
        sa.Column("return_20d", sa.Numeric(14, 10)),
        sa.Column("volume_ratio", sa.Numeric(18, 8)),
        sa.Column("volatility_20d", sa.Numeric(14, 10)),
        sa.Column("momentum_20d", sa.Numeric(14, 10)),
        sa.Column("rsi_14", sa.Numeric(10, 6)),
        sa.Column("macd", sa.Numeric(14, 8)),
        sa.Column("moving_average_20", sa.Numeric(20, 4)),
        sa.Column("moving_average_50", sa.Numeric(20, 4)),
        sa.Column("maximum_drawdown", sa.Numeric(14, 10)),
        sa.Column("beta", sa.Numeric(14, 8)),
        sa.Column("sharpe_ratio", sa.Numeric(14, 8)),
        sa.Column("feature_data", sa.JSON()),
        _created_at(),
        sa.ForeignKeyConstraint(
            ["stock_id"], ["stocks.id"], name="fk_stock_features_stock_id_stocks", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_stock_features"),
        sa.UniqueConstraint(
            "stock_id", "feature_date", name="stock_feature_date"
        ),
    )
    op.create_index("ix_stock_features_stock_id", "stock_features", ["stock_id"])
    op.create_index("ix_stock_features_feature_date", "stock_features", ["feature_date"])

    op.create_table(
        "recommendations",
        _id(),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("investment_profile_id", sa.Uuid(), nullable=False),
        sa.Column("regime_id", sa.Uuid(), nullable=False),
        sa.Column("type", sa.String(30), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("capital", sa.Numeric(20, 2), nullable=False),
        sa.Column("risk_appetite", sa.String(20), nullable=False),
        sa.Column("investment_horizon", sa.String(30), nullable=False),
        sa.Column("hmm_model_version", sa.String(160)),
        sa.Column("portfolio_model_version", sa.String(160), nullable=False),
        sa.Column("total_weight", sa.Numeric(12, 10), nullable=False),
        sa.Column("cash_weight", sa.Numeric(12, 10), nullable=False),
        sa.Column("cash_amount", sa.Numeric(20, 2), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True)),
        _created_at(),
        sa.CheckConstraint("capital >= 1000000", name="ck_recommendations_capital_minimum"),
        sa.CheckConstraint(
            "type IN ('INITIAL', 'RECALCULATION', 'REBALANCE')",
            name="ck_recommendations_type_values",
        ),
        sa.CheckConstraint(
            "status IN ('GENERATED', 'CONFIRMED', 'APPLIED', 'DISMISSED', 'EXPIRED', 'FAILED')",
            name="ck_recommendations_status_values",
        ),
        sa.CheckConstraint(
            "risk_appetite IN ('LOW', 'MEDIUM', 'HIGH')",
            name="ck_recommendations_risk_appetite_values",
        ),
        sa.CheckConstraint(
            "investment_horizon IN ('SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM')",
            name="ck_recommendations_investment_horizon_values",
        ),
        sa.CheckConstraint(
            "total_weight >= 0.9999 AND total_weight <= 1.0001",
            name="ck_recommendations_total_weight_complete",
        ),
        sa.CheckConstraint(
            "cash_weight >= 0 AND cash_weight <= 1",
            name="ck_recommendations_cash_weight_range",
        ),
        sa.CheckConstraint("cash_amount >= 0", name="ck_recommendations_cash_amount_nonnegative"),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_recommendations_user_id_users", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["investment_profile_id"],
            ["investment_profiles.id"],
            name="fk_recommendations_investment_profile_id_investment_profiles",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["regime_id"],
            ["market_regimes.id"],
            name="fk_recommendations_regime_id_market_regimes",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_recommendations"),
    )
    op.create_index("ix_recommendations_user_generated", "recommendations", ["user_id", "generated_at"])
    op.create_index("ix_recommendations_status_expires", "recommendations", ["status", "expires_at"])

    op.create_table(
        "recommendation_allocations",
        _id(),
        sa.Column("recommendation_id", sa.Uuid(), nullable=False),
        sa.Column("stock_id", sa.Uuid(), nullable=False),
        sa.Column("weight", sa.Numeric(12, 10), nullable=False),
        sa.Column("amount", sa.Numeric(20, 2), nullable=False),
        sa.Column("reference_price", sa.Numeric(20, 4), nullable=False),
        sa.Column("quantity_estimated", sa.Numeric(20, 4), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False),
        _created_at(),
        sa.CheckConstraint(
            "weight >= 0 AND weight <= 1", name="ck_recommendation_allocations_weight_range"
        ),
        sa.CheckConstraint("amount >= 0", name="ck_recommendation_allocations_amount_nonnegative"),
        sa.CheckConstraint(
            "quantity_estimated >= 0",
            name="ck_recommendation_allocations_quantity_nonnegative",
        ),
        sa.ForeignKeyConstraint(
            ["recommendation_id"],
            ["recommendations.id"],
            name="fk_recommendation_allocations_recommendation_id_recommendations",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["stock_id"],
            ["stocks.id"],
            name="fk_recommendation_allocations_stock_id_stocks",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_recommendation_allocations"),
        sa.UniqueConstraint(
            "recommendation_id",
            "stock_id",
            name="recommendation_stock",
        ),
    )
    op.create_index(
        "ix_recommendation_allocations_rank",
        "recommendation_allocations",
        ["recommendation_id", "rank"],
    )

    op.create_table(
        "portfolios",
        _id(),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("current_version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("initial_capital", sa.Numeric(20, 2), nullable=False),
        sa.Column("current_value", sa.Numeric(20, 2), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=False),
        _created_at(),
        _updated_at(),
        sa.CheckConstraint("status IN ('ACTIVE', 'ARCHIVED')", name="ck_portfolios_status_values"),
        sa.CheckConstraint(
            "current_version >= 1", name="ck_portfolios_current_version_positive"
        ),
        sa.CheckConstraint(
            "initial_capital >= 1000000", name="ck_portfolios_initial_capital_minimum"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_portfolios_user_id_users", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_portfolios"),
    )
    op.create_index("ix_portfolios_user_status", "portfolios", ["user_id", "status"])
    op.create_index(
        "uq_portfolios_one_active_user",
        "portfolios",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("status = 'ACTIVE'"),
        sqlite_where=sa.text("status = 'ACTIVE'"),
    )

    op.create_table(
        "portfolio_versions",
        _id(),
        sa.Column("portfolio_id", sa.Uuid(), nullable=False),
        sa.Column("recommendation_id", sa.Uuid()),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("change_type", sa.String(40), nullable=False),
        sa.Column("regime_id", sa.Uuid(), nullable=False),
        sa.Column("total_value", sa.Numeric(20, 2), nullable=False),
        sa.Column("cash_weight", sa.Numeric(12, 10), nullable=False),
        sa.Column("cash_amount", sa.Numeric(20, 2), nullable=False),
        sa.Column("effective_at", sa.DateTime(timezone=True), nullable=False),
        _created_at(),
        sa.CheckConstraint(
            "version_number >= 1", name="ck_portfolio_versions_version_number_positive"
        ),
        sa.CheckConstraint(
            "change_type IN ('INITIAL', 'REBALANCE', 'MANUAL_RECALCULATION')",
            name="ck_portfolio_versions_change_type_values",
        ),
        sa.CheckConstraint(
            "cash_weight >= 0 AND cash_weight <= 1",
            name="ck_portfolio_versions_cash_weight_range",
        ),
        sa.CheckConstraint(
            "cash_amount >= 0", name="ck_portfolio_versions_cash_amount_nonnegative"
        ),
        sa.ForeignKeyConstraint(
            ["portfolio_id"],
            ["portfolios.id"],
            name="fk_portfolio_versions_portfolio_id_portfolios",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["recommendation_id"],
            ["recommendations.id"],
            name="fk_portfolio_versions_recommendation_id_recommendations",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["regime_id"],
            ["market_regimes.id"],
            name="fk_portfolio_versions_regime_id_market_regimes",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_portfolio_versions"),
        sa.UniqueConstraint(
            "portfolio_id",
            "version_number",
            name="portfolio_version_number",
        ),
    )
    op.create_index(
        "ix_portfolio_versions_effective",
        "portfolio_versions",
        ["portfolio_id", "effective_at"],
    )

    op.create_table(
        "portfolio_allocations",
        _id(),
        sa.Column("portfolio_version_id", sa.Uuid(), nullable=False),
        sa.Column("stock_id", sa.Uuid(), nullable=False),
        sa.Column("weight", sa.Numeric(12, 10), nullable=False),
        sa.Column("invested_amount", sa.Numeric(20, 2), nullable=False),
        sa.Column("entry_price", sa.Numeric(20, 4), nullable=False),
        sa.Column("estimated_quantity", sa.Numeric(20, 4), nullable=False),
        _created_at(),
        sa.CheckConstraint(
            "weight >= 0 AND weight <= 1", name="ck_portfolio_allocations_weight_range"
        ),
        sa.ForeignKeyConstraint(
            ["portfolio_version_id"],
            ["portfolio_versions.id"],
            name="fk_portfolio_allocations_version_id_versions",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["stock_id"],
            ["stocks.id"],
            name="fk_portfolio_allocations_stock_id_stocks",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_portfolio_allocations"),
        sa.UniqueConstraint(
            "portfolio_version_id",
            "stock_id",
            name="portfolio_version_stock",
        ),
    )
    op.create_index(
        "ix_portfolio_allocations_portfolio_version_id",
        "portfolio_allocations",
        ["portfolio_version_id"],
    )

    op.create_table(
        "portfolio_snapshots",
        _id(),
        sa.Column("portfolio_id", sa.Uuid(), nullable=False),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column("total_value", sa.Numeric(20, 2), nullable=False),
        sa.Column("profit_loss", sa.Numeric(20, 2), nullable=False),
        sa.Column("pnl_percent", sa.Numeric(14, 8), nullable=False),
        sa.Column("regime_id", sa.Uuid()),
        _created_at(),
        sa.ForeignKeyConstraint(
            ["portfolio_id"],
            ["portfolios.id"],
            name="fk_portfolio_snapshots_portfolio_id_portfolios",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["regime_id"],
            ["market_regimes.id"],
            name="fk_portfolio_snapshots_regime_id_market_regimes",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_portfolio_snapshots"),
        sa.UniqueConstraint(
            "portfolio_id",
            "snapshot_date",
            name="portfolio_snapshot_date",
        ),
    )
    op.create_index("ix_portfolio_snapshots_date", "portfolio_snapshots", ["snapshot_date"])

    op.create_table(
        "notifications",
        _id(),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("recommendation_id", sa.Uuid()),
        sa.Column("portfolio_id", sa.Uuid()),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True)),
        sa.Column("actioned_at", sa.DateTime(timezone=True)),
        sa.Column("email_sent_at", sa.DateTime(timezone=True)),
        _created_at(),
        sa.CheckConstraint(
            "status IN ('UNREAD', 'READ', 'APPLIED', 'DISMISSED')",
            name="ck_notifications_status_values",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_notifications_user_id_users", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["recommendation_id"],
            ["recommendations.id"],
            name="fk_notifications_recommendation_id_recommendations",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["portfolio_id"],
            ["portfolios.id"],
            name="fk_notifications_portfolio_id_portfolios",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_notifications"),
    )
    op.create_index(
        "ix_notifications_user_status_created",
        "notifications",
        ["user_id", "status", "created_at"],
    )

    op.create_table(
        "background_jobs",
        _id(),
        sa.Column("job_type", sa.String(80), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.Column("input_data", sa.JSON()),
        sa.Column("output_data", sa.JSON()),
        sa.Column("error_message", sa.Text()),
        _created_at(),
        sa.CheckConstraint(
            "status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')",
            name="ck_background_jobs_status_values",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_background_jobs"),
    )
    op.create_index(
        "ix_background_jobs_type_status", "background_jobs", ["job_type", "status"]
    )


def downgrade() -> None:
    for table_name in (
        "background_jobs",
        "notifications",
        "portfolio_snapshots",
        "portfolio_allocations",
        "portfolio_versions",
        "portfolios",
        "recommendation_allocations",
        "recommendations",
        "stock_features",
        "stock_prices",
        "investment_profiles",
        "user_preferences",
        "password_reset_tokens",
        "refresh_tokens",
        "model_versions",
        "market_regimes",
        "stocks",
        "users",
    ):
        op.drop_table(table_name)
