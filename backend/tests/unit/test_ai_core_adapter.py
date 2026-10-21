from __future__ import annotations

from datetime import UTC, date, datetime
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.common.enums import MarketRegimeCode
from app.core.config import Settings
from app.core.exceptions import AICoreUnavailableError, InvalidAIOutputError
from app.integrations.ai_core.hmm_adapter import HMMArtifactAdapter
from app.integrations.ai_core.schemas import MarketRegimeResult

CSV_HEADER = "time,market_regime,market_regime_label,prob_market_0,prob_market_1,prob_market_2\n"
TEST_SIGNING_MATERIAL = "unit-test-signing-material-longer-than-32-characters"


def _adapter(tmp_path: Path, rows: list[str]) -> HMMArtifactAdapter:
    artifact = tmp_path / "ai_core" / "output" / "hmm_model" / "market_hmm_results.csv"
    artifact.parent.mkdir(parents=True)
    artifact.write_text(CSV_HEADER + "".join(rows), encoding="utf-8")
    return HMMArtifactAdapter(
        Settings(
            ai_core_path=tmp_path,
            ai_core_timeout_seconds=5,
            jwt_secret_key=TEST_SIGNING_MATERIAL,
        )
    )


async def test_adapter_selects_latest_row_on_or_before_date_and_matches_confidence(
    tmp_path: Path,
) -> None:
    adapter = _adapter(
        tmp_path,
        [
            "2024-01-01,0,Bull,0.80,0.10,0.10\n",
            "2024-01-02,2,Sideways,0.10,0.20,0.70\n",
            "2024-01-03,1,Bear,0.20,0.70,0.10\n",
        ],
    )

    result = await adapter.detect_current_regime(as_of_date=date(2024, 1, 2))

    assert MarketRegimeCode(result.regime) == MarketRegimeCode.SIDEWAY
    assert result.state_id == 2
    assert result.data_date == date(2024, 1, 2)
    assert result.confidence == pytest.approx(0.70)
    assert result.probabilities == pytest.approx(
        {"state_0": 0.10, "state_1": 0.20, "state_2": 0.70}
    )
    assert result.metadata["rawLabel"] == "Sideways"
    assert result.metadata["liveInference"] is False
    assert result.model_version is not None
    assert result.model_version.startswith("hmm-output-sha256:")


@pytest.mark.parametrize(
    ("raw_label", "expected"),
    [
        ("Bull", MarketRegimeCode.BULL),
        ("BEAR", MarketRegimeCode.BEAR),
        ("Sideway", MarketRegimeCode.SIDEWAY),
        ("Side-ways", MarketRegimeCode.SIDEWAY),
        ("unmapped-regime", MarketRegimeCode.UNKNOWN),
    ],
)
async def test_adapter_normalizes_regime_aliases(
    tmp_path: Path, raw_label: str, expected: MarketRegimeCode
) -> None:
    adapter = _adapter(tmp_path, [f"2024-01-01,2,{raw_label},0.10,0.20,0.70\n"])

    result = await adapter.detect_current_regime()

    assert MarketRegimeCode(result.regime) == expected


@pytest.mark.parametrize(
    "rows",
    [
        ["2024-01-01,0,Bull,1.20,-0.10,-0.10\n"],
        ["2024-01-01,0,Bull,0.60,0.20,0.10\n"],
        [
            "2024-01-01,0,Bull,0.80,0.10,0.10\n",
            "2024-01-02,0,Bear,0.80,0.10,0.10\n",
        ],
    ],
)
async def test_adapter_rejects_invalid_probabilities_and_inconsistent_mapping(
    tmp_path: Path, rows: list[str]
) -> None:
    adapter = _adapter(tmp_path, rows)

    with pytest.raises(InvalidAIOutputError):
        await adapter.detect_current_regime()


async def test_adapter_reports_no_result_before_requested_date(tmp_path: Path) -> None:
    adapter = _adapter(tmp_path, ["2024-01-02,0,Bull,0.80,0.10,0.10\n"])

    with pytest.raises(AICoreUnavailableError, match="requested date"):
        await adapter.detect_current_regime(as_of_date=date(2024, 1, 1))


def test_standardized_ai_result_validates_confidence_range() -> None:
    with pytest.raises(ValidationError, match="confidence"):
        MarketRegimeResult(
            regime=MarketRegimeCode.BULL,
            confidence=1.01,
            detected_at=datetime.now(UTC),
        )
