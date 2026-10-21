from __future__ import annotations

import json
import sys
from pathlib import Path

from app.common.enums import MarketRegimeCode
from app.core.config import Settings
from app.integrations.ai_core.hmm_adapter import HMMArtifactAdapter
from scripts.verify_ai_core_integrity import build_inventory

BACKEND_ROOT = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_ROOT.parent
AI_CORE_ROOT = PROJECT_ROOT / "Vietnam-Stock-Market-Regime-Detection-using-Hidden-Markov-Models"
BASELINE_PATH = BACKEND_ROOT / "runtime" / "ai-core-integrity.json"
TEST_SIGNING_MATERIAL = "contract-test-signing-material-longer-than-32-characters"


async def test_real_ai_core_contract_is_valid_and_read_only() -> None:
    """Read the real artifact and prove the complete AI tree is byte-for-byte unchanged."""
    assert AI_CORE_ROOT.is_dir(), f"AI Core repository is missing: {AI_CORE_ROOT}"
    assert BASELINE_PATH.is_file(), f"Phase-0 integrity baseline is missing: {BASELINE_PATH}"
    source_path = AI_CORE_ROOT / "ai_core" / "model" / "HMM" / "hmm.py"
    artifact_path = AI_CORE_ROOT / "ai_core" / "output" / "hmm_model" / "market_hmm_results.csv"
    assert source_path.is_file()
    assert artifact_path.is_file()

    # The adapter does not import AI Core, but this is an additional guard when the
    # contract is run without the documented ``python -B`` command.
    previous_bytecode_setting = sys.dont_write_bytecode
    sys.dont_write_bytecode = True
    before = build_inventory(AI_CORE_ROOT, [])
    baseline = json.loads(BASELINE_PATH.read_text(encoding="utf-8"))
    try:
        assert before == baseline["files"], "AI Core differs from the Phase-0 baseline"
        adapter = HMMArtifactAdapter(
            Settings(
                ai_core_path=AI_CORE_ROOT,
                ai_core_timeout_seconds=60,
                jwt_secret_key=TEST_SIGNING_MATERIAL,
            )
        )
        result = await adapter.detect_current_regime()
        health = await adapter.health_check()

        assert MarketRegimeCode(result.regime) in {
            MarketRegimeCode.BULL,
            MarketRegimeCode.BEAR,
            MarketRegimeCode.SIDEWAY,
        }
        assert result.data_date is not None
        assert result.state_id is not None
        assert result.model_version is not None
        assert result.model_version.startswith("hmm-output-sha256:")
        assert result.metadata["integrationStrategy"] == "read_only_output_artifact"
        assert result.metadata["liveInference"] is False
        if result.confidence is not None:
            assert 0 <= result.confidence <= 1
        if result.probabilities is not None:
            assert all(0 <= probability <= 1 for probability in result.probabilities.values())
            assert abs(sum(result.probabilities.values()) - 1) <= 1e-5

        assert health.repository_exists is True
        assert health.artifact_exists is True
        assert health.live_inference_available is False
        assert health.integration_mode == "read_only_output_artifact"
        assert health.status == "degraded"
    finally:
        after = build_inventory(AI_CORE_ROOT, [])
        sys.dont_write_bytecode = previous_bytecode_setting

    assert after == before, "AI contract test added, removed, or modified an AI Core file"
