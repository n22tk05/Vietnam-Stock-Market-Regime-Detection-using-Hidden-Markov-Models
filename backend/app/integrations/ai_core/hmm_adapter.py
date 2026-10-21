from __future__ import annotations

import asyncio
import csv
import hashlib
import logging
import math
from datetime import UTC, date, datetime
from typing import Literal

from app.common.enums import MarketRegimeCode
from app.core.config import Settings
from app.core.exceptions import AICoreTimeoutError, AICoreUnavailableError, InvalidAIOutputError
from app.integrations.ai_core.base import MarketRegimeDetector
from app.integrations.ai_core.schemas import AICoreHealth, MarketRegimeResult

logger = logging.getLogger(__name__)


REGIME_ALIASES: dict[str, MarketRegimeCode] = {
    "bull": MarketRegimeCode.BULL,
    "bear": MarketRegimeCode.BEAR,
    "sideway": MarketRegimeCode.SIDEWAY,
    "sideways": MarketRegimeCode.SIDEWAY,
    "unknown": MarketRegimeCode.UNKNOWN,
}


class HMMArtifactAdapter(MarketRegimeDetector):
    """Read actual HMM output without importing or executing the side-effectful AI Core."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.ai_core_path = settings.ai_core_path
        self.artifact_path = (
            self.ai_core_path / "ai_core" / "output" / "hmm_model" / "market_hmm_results.csv"
        )
        self.hmm_source_path = self.ai_core_path / "ai_core" / "model" / "HMM" / "hmm.py"
        self.market_model_path = (
            self.ai_core_path / "ai_core" / "output" / "hmm_model" / "market_hmm.pkl"
        )
        self._fingerprint_cache: tuple[int, int, str] | None = None

    async def detect_current_regime(self, *, as_of_date: date | None = None) -> MarketRegimeResult:
        try:
            return await asyncio.wait_for(
                asyncio.to_thread(self._read_regime, as_of_date),
                timeout=self.settings.ai_core_timeout_seconds,
            )
        except TimeoutError as exc:
            raise AICoreTimeoutError("Timed out while reading AI Core regime output") from exc

    async def health_check(self) -> AICoreHealth:
        repository_exists = self.ai_core_path.is_dir()
        artifact_exists = self.artifact_path.is_file()
        required_files = {
            "hmmSource": self.hmm_source_path.is_file(),
            "marketOutput": artifact_exists,
            "marketModel": self.market_model_path.is_file(),
        }
        details: list[str] = []
        latest_data_date: date | None = None
        model_version: str | None = None

        if not repository_exists:
            details.append("AI Core repository is missing")
        if not artifact_exists:
            details.append("Precomputed market_hmm_results.csv is missing")

        if artifact_exists:
            try:
                result = await self.detect_current_regime()
                latest_data_date = result.data_date
                model_version = result.model_version
            except (AICoreUnavailableError, AICoreTimeoutError, InvalidAIOutputError) as exc:
                details.append(str(exc))

        if not self.market_model_path.is_file():
            details.append(
                "HMM model pickle is absent; safe live inference is unavailable and "
                "the adapter reads real precomputed output"
            )
        if latest_data_date is not None:
            age_hours = (datetime.now(UTC).date() - latest_data_date).days * 24
            if age_hours > self.settings.market_regime_stale_hours:
                details.append(
                    f"Latest HMM data is stale ({latest_data_date.isoformat()}; threshold "
                    f"{self.settings.market_regime_stale_hours}h)"
                )

        if not repository_exists or not artifact_exists or latest_data_date is None:
            status: Literal["healthy", "degraded", "unavailable"] = "unavailable"
        else:
            status = "degraded"

        return AICoreHealth(
            status=status,
            integration_mode="read_only_output_artifact",
            repository_exists=repository_exists,
            artifact_exists=artifact_exists,
            live_inference_available=False,
            latest_data_date=latest_data_date,
            model_version=model_version,
            required_files=required_files,
            dependencies={"pythonStdlibCsv": True},
            details=details,
        )

    def _read_regime(self, as_of_date: date | None) -> MarketRegimeResult:
        if not self.ai_core_path.is_dir():
            raise AICoreUnavailableError("AI Core repository does not exist")
        if not self.artifact_path.is_file():
            raise AICoreUnavailableError("AI Core market regime output is unavailable")

        stat_before = self.artifact_path.stat()
        required_columns = {"time", "market_regime", "market_regime_label"}
        selected: dict[str, str] | None = None
        state_labels: dict[str, str] = {}
        try:
            with self.artifact_path.open("r", encoding="utf-8", newline="") as source:
                reader = csv.DictReader(source)
                fieldnames = set(reader.fieldnames or [])
                if not required_columns.issubset(fieldnames):
                    raise InvalidAIOutputError(
                        "AI Core output is missing required columns",
                        details={
                            "required": sorted(required_columns),
                            "actual": sorted(fieldnames),
                        },
                    )
                for row in reader:
                    row_date = date.fromisoformat(row["time"][:10])
                    row_state_id = row["market_regime"].strip()
                    label = row["market_regime_label"].strip()
                    previous_label = state_labels.setdefault(row_state_id, label)
                    if previous_label != label:
                        raise InvalidAIOutputError(
                            f"AI Core state {row_state_id} maps to multiple labels in one artifact"
                        )
                    if as_of_date is None or row_date <= as_of_date:
                        if selected is None or row_date >= date.fromisoformat(
                            selected["time"][:10]
                        ):
                            selected = row
        except (OSError, UnicodeError, csv.Error, ValueError) as exc:
            raise InvalidAIOutputError(f"Cannot parse AI Core regime output: {exc}") from exc

        if selected is None:
            raise AICoreUnavailableError("No AI Core regime result exists for the requested date")

        try:
            raw_label = selected["market_regime_label"].strip()
            normalized_label = "".join(
                character for character in raw_label.lower() if character.isalnum()
            )
            regime = REGIME_ALIASES.get(normalized_label, MarketRegimeCode.UNKNOWN)
            state_id_text = selected["market_regime"].strip()
            probability_key = f"prob_market_{state_id_text}"
            probabilities: dict[str, float] = {}
            for key, raw_value in selected.items():
                if key.startswith("prob_market_") and raw_value not in (None, ""):
                    value = float(raw_value)
                    if not math.isfinite(value) or not 0 <= value <= 1:
                        raise InvalidAIOutputError(f"Probability {key} is outside [0, 1]")
                    probabilities[f"state_{key.removeprefix('prob_market_')}"] = value
            probability_sum = sum(probabilities.values())
            if probabilities and abs(probability_sum - 1.0) > 1e-5:
                raise InvalidAIOutputError("AI Core market probabilities do not sum to one")
            confidence_raw = selected.get(probability_key)
            confidence = (
                float(confidence_raw)
                if isinstance(confidence_raw, str) and confidence_raw != ""
                else None
            )
            if confidence is not None and not math.isfinite(confidence):
                raise InvalidAIOutputError("AI Core confidence is not finite")
            state_id: int | str = int(state_id_text) if state_id_text.isdigit() else state_id_text
            selected_date = date.fromisoformat(selected["time"][:10])
        except (TypeError, ValueError) as exc:
            raise InvalidAIOutputError(f"AI Core output contains invalid values: {exc}") from exc

        stat_after = self.artifact_path.stat()
        if (stat_before.st_mtime_ns, stat_before.st_size) != (
            stat_after.st_mtime_ns,
            stat_after.st_size,
        ):
            raise AICoreUnavailableError("AI Core artifact changed while it was being read")
        fingerprint = self._artifact_fingerprint(stat_after.st_mtime_ns, stat_after.st_size)

        return MarketRegimeResult(
            regime=regime,
            confidence=confidence,
            state_id=state_id,
            detected_at=datetime.fromtimestamp(stat_after.st_mtime, tz=UTC),
            data_date=selected_date,
            model_version=f"hmm-output-sha256:{fingerprint[:16]}",
            probabilities=probabilities or None,
            features=None,
            metadata={
                "rawLabel": raw_label,
                "stateLabelMapping": state_labels,
                "sourceArtifact": "ai_core/output/hmm_model/market_hmm_results.csv",
                "artifactSha256": fingerprint,
                "integrationStrategy": "read_only_output_artifact",
                "liveInference": False,
            },
        )

    def _artifact_fingerprint(self, mtime_ns: int, size: int) -> str:
        if self._fingerprint_cache and self._fingerprint_cache[:2] == (mtime_ns, size):
            return self._fingerprint_cache[2]
        digest = hashlib.sha256()
        with self.artifact_path.open("rb") as source:
            for chunk in iter(lambda: source.read(1024 * 1024), b""):
                digest.update(chunk)
        final_stat = self.artifact_path.stat()
        if (final_stat.st_mtime_ns, final_stat.st_size) != (mtime_ns, size):
            self._fingerprint_cache = None
            raise AICoreUnavailableError("AI Core artifact changed while it was fingerprinted")
        fingerprint = digest.hexdigest()
        self._fingerprint_cache = (mtime_ns, size, fingerprint)
        return fingerprint
