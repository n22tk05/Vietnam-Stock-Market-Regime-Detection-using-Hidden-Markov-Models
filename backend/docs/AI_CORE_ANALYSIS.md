# AI Core analysis and read-only integration decision

## Scope and integrity baseline

This document records the Phase 0 audit performed before implementing the Astera backend. The audited repository is:

```text
Vietnam-Stock-Market-Regime-Detection-using-Hidden-Markov-Models/
```

It is treated as a read-only AI Core. It is not a separate Git worktree; its Git root is the Astera repository. The initial root status contained one pre-existing user change only:

```text
 M frontend/src/components/layout/Header.tsx
```

There was no initial Git diff under the AI Core path. Because the AI Core `.gitignore` excludes generated output and Python caches, Git status alone is insufficient. Before any backend implementation, Astera created a full-tree SHA-256 snapshot at `backend/runtime/ai-core-integrity.json` with `backend/scripts/verify_ai_core_integrity.py`. The snapshot contains 55 existing files, including ignored artifacts and existing cache files. The immediately repeated verification reported all 55 files unchanged.

No AI Core module, script, notebook, server, training command, or import was executed during the audit. All inspection was read-only. In particular, the existing `ai_core/output/**` and `ai_core/__pycache__/**` files predate this backend work.

## Repository structure and entry points

The executable pipeline is `ai_core/main.py`. Its effective sequence is:

1. crawl stock and macro data;
2. process daily/monthly and per-security features;
3. train/run the hierarchical HMM pipeline;
4. train the PPO portfolio model.

The README refers to `run_pipeline.py`, but that file is absent. `main.py` currently contains a hard-coded default crawl date. There is no notebook, Python dependency manifest, lock file, Dockerfile, or environment-variable contract in the AI Core.

Important files are:

| File | Actual role | Safe for backend import? |
|---|---|---|
| `ai_core/main.py` | Full crawl, processing, HMM, and PPO training pipeline | No |
| `ai_core/model/HMM/hmm.py` | Feature selection, HMM training/evaluation, prediction, artifact writes | No |
| `ai_core/helper/model_helper.py` | GMMHMM construction, expanding prediction, state labelling helpers | Not sufficient on its own |
| `ai_core/data_processing/m1.py` | Per-ticker return, volatility, momentum, and volume features | Source reference only |
| `ai_core/data_processing/process_pipeline.py` | Daily/monthly merge, winsorisation, standardisation | Source reference only |
| `ai_core/data_processing/market_variable.py` | Cross-sectional market proxy construction | Source reference only |
| `ai_core/data_processing/normalization/market.py` | 252-period rolling-rank normal quantile transform | Source reference only |
| `ai_core/ai_server.py` | A separate PPO-only FastAPI service | No HMM regime endpoint |
| `ai_core/model/PPO/ppo.py` | PPO environment/training/inference utilities | No; import has process-wide side effects |
| `ai_core/output/hmm_model/market_hmm_results.csv` | Real, precomputed market-regime output | Yes, read-only |
| `ai_core/output/hmm_model/master_ticker_hmm_results.csv` | Real, precomputed per-ticker data/features | Yes, read-only |

## Actual inputs and preprocessing

Stock collection uses `vnstock.Quote` (KBS is the default source) and OHLCV data. The current successful-ticker list contains 60 tickers. The source pipeline expects data directories that are not currently present; the repository retains calculated outputs instead.

Macro collection references VIX, S&P 500, USD/VND, Brent, gold, copper, DXY, US 10-year yield, Shanghai, Fed Funds, EPU, and GSO data. Data provenance has material limitations:

- the `crawl_vnstock_data()` call is disabled in the current macro main flow;
- foreign net buying, Vietnam five-year yield, M2, credit growth, and PMI can be synthesized with deterministic trigonometric/noise formulas when data is missing;
- CPI may be interpolated or extrapolated.

The output is a real result of the checked-in code, but some upstream values may be synthetic. Astera therefore makes no accuracy or investment-performance claim based on this artifact.

Per-ticker features created in `m1.py` are:

```text
log_return       = log(close / close.shift(1))
rolling_vol_20d  = rolling_std(log_return, 20) * sqrt(252)
return_5d
return_20d
volume_ratio     = volume / rolling_mean(volume, 20)
og_return        = close.pct_change()
```

The base market pipeline also calculates liquidity/Amihud differences, return dispersion, five-day rolling volatility, and volume ratios, then merges daily and monthly data with a backward as-of merge. It winsorises at 1%/99% and applies a full-sample z-score. Initial monthly values may use backfill. These operations create potential look-ahead risk that must be considered before claiming out-of-sample accuracy.

Despite their names, `vnindex_log_ret` and `vnindex_close` are cross-sectional averages of the ticker universe rather than an official VNINDEX series. Final market normalisation is a 252-observation rolling-rank normal quantile transform clipped to `[-3, 3]`.

The latest macro output contains these source feature names:

```text
rolling_vol_5
credit_growth_mom
cpi_mom
pmi_vn
fnb_ratio
fx_log_ret
```

Market feature selection is dynamic rather than a fixed schema. It applies ADF/KPSS/kurtosis filtering, LightGBM/SHAP importance, mutual information against absolute market return, and greedy VIF filtering below 5. Because the fitted feature-order artifact and source processed dataset are absent, the exact ordered features of the retained market model cannot be reconstructed reliably.

RSI and MACD appear in the PPO path; they are not direct HMM inputs. The Astera database keeps them as optional general-purpose/PPO-era fields while explicitly storing the actual HMM ticker features (`log_return`, `return_5d`, `return_20d`, `volatility_20d`, and `volume_ratio`).

## HMM training, states, and inference

The implementation uses `hmmlearn.hmm.GMMHMM`, not `GaussianHMM`. Macro and market models use two Gaussian mixtures, diagonal covariance, `min_covar=0.01`, and 200 iterations. The training cutoff is `2019-12-31`.

The hierarchy is:

- Macro: candidate state counts 2 and 3, ranked using BIC and out-of-sample score. The retained artifact has 2 states.
- Market: candidate state counts 2, 3, and 4 using selected market features plus all but one macro posterior. The retained artifact has 3 states.
- Sector: candidate state counts 2, 3, and 4 per industry.
- Ticker: fixed at 3 states, using `log_return`, `rolling_vol_20d`, `volume_ratio`, and macro/market/sector posteriors.

For a time index `t`, the source calculates posterior probabilities with `predict_proba(Z[:t])[-1]` and the raw state with `predict(Z[:t])[-1]`. For three-state labelling, each state's mean-return-to-volatility score is ranked:

```text
lowest score  -> Bear
middle score  -> Sideways
highest score -> Bull
```

This mapping is recalculated when training. Raw IDs must never be hard-coded. The current output happens to map `0 -> Bull`, `1 -> Bear`, and `2 -> Sideways`; the adapter derives and validates this mapping from the artifact itself.

## Actual output contract

The backend-consumable artifact is:

```text
ai_core/output/hmm_model/market_hmm_results.csv
```

Its actual columns are:

```text
time
market_regime
market_regime_label
prob_market_0
prob_market_1
prob_market_2
```

At audit time it contained 2,381 unique daily records from `2017-01-05` through `2026-07-21`. Every examined posterior vector summed to one. Its SHA-256 was:

```text
38b2cba261c989069969ce59e1e9e25868ee14301986ce73c88408eec0d974ea
```

The latest record was state `0`, label `Bull`, and posterior `0.9996685770931004`. The posterior is a model confidence for that state, not an accuracy measurement. The CSV does not contain detection time or a trained-model version. Astera uses file modification time as the best available detection timestamp and an explicit output-artifact SHA fingerprint as traceability. As of the audit date (`2026-07-28`), this `2026-07-21` result is stale under the default 24-hour threshold.

Other existing outputs include macro, sector, master-ticker, and meta-prediction CSVs. Prices in the master ticker output are recorded in thousands of VND; the adapter converts them to VND before calculating simulated amounts.

## Model artifacts and dependencies

There is no persisted HMM model, scaler, preprocessing pipeline, feature-order manifest, or version manifest. In particular, the expected `macro_hmm.pkl`, `market_hmm.pkl`, `sector_hmms.pkl`, and `ticker_hmms.pkl` files are absent.

Dependencies inferred from source include NumPy, pandas, SciPy, statsmodels, scikit-learn, hmmlearn, LightGBM, SHAP, joblib, matplotlib, tqdm, vnstock/vnai, yfinance, requests, gymnasium, Stable-Baselines3, PyTorch, and cloudpickle. No versions are pinned by AI Core. The selected adapter uses only Python's standard CSV/file libraries, so these potentially conflicting training dependencies are not installed in the backend process.

Two identical real PPO ZIP artifacts exist. Their metadata describes Python 3.11.9, Stable-Baselines3 2.9.0, PyTorch 2.13 CPU, NumPy 2.2.6, a `(60, 44)` observation space, a `(60,)` action space, and 51,200 timesteps. The expected `vec_normalize.pkl` is absent; existing evaluation utilities require it, source imports have global side effects, and the PPO API does not accept risk appetite or investment horizon. PPO is therefore deliberately inactive in the MVP. Portfolio suggestions are produced by the separately named and documented `RuleBasedPortfolioRecommendationEngine`; no PPO or accuracy claim is made.

## Unsafe side effects and training-only paths

`hmm.py` cannot be imported safely. At module load and execution it changes the process working directory, creates output directories, reads missing processed data, runs feature selection, evaluates/fits model candidates, serializes pickle files, and overwrites output CSVs. Its nominal `--mode predict` path still performs training/evaluation and writes artifacts before or during prediction.

`main.py`, the crawlers, `hmm.py`, PPO training/evaluation scripts, and notebooks (none currently exist) are treated as training/offline-only. `ai_server.py` starts a PPO service and loads broad AI state; it does not expose market HMM results. `ppo.py` also changes process-level state and creates directories on import.

The backend never imports or invokes any of these files.

## Integration strategy selected

Astera selects **Strategy C: an independent, read-only output-artifact adapter** in `backend/app/integrations/ai_core/hmm_adapter.py`.

Strategy A is rejected because there is no side-effect-free inference module and no fitted HMM artifact. Strategy B is rejected because the available predict command can train and write, its inputs are missing, and it violates the read-only contract.

The adapter:

1. opens only `market_hmm_results.csv` in read mode;
2. never imports AI Core and never changes its working directory;
3. chooses the latest record, or the latest record on/before `as_of_date`;
4. derives and validates raw-state/label consistency from the file;
5. normalizes `Bull`, `Bear`, and `Sideway`/`Sideways` into Astera enums;
6. uses the posterior corresponding to the selected raw state as confidence;
7. validates finite `[0, 1]` probabilities and their sum;
8. records the raw label/state, dynamic mapping, relative artifact path, SHA-256 fingerprint, file timestamp, and integration mode;
9. runs blocking file reads through a bounded async thread call and caches the fingerprint by file stat;
10. returns an explicit unavailable/invalid/timeout error instead of a fake regime.

`POST /market/regime/detect` means “re-read and persist the newest real AI output” in this MVP; it does not claim to execute a fresh HMM inference. It is protected for administrators/internal automation. Health is `degraded` while the artifact is readable but stale or live inference artifacts are absent, and `unavailable` if the repository/artifact/contract is missing or invalid.

The API depends on the `MarketRegimeDetector` interface rather than HMM source code:

```text
API router
  -> MarketRegimeService
    -> MarketRegimeDetector
      -> HMMArtifactAdapter
        -> read-only market_hmm_results.csv
```

## Remaining assumptions and limitations

- The CSV file modification time is the only available proxy for `detected_at`.
- The SHA-derived identifier fingerprints the output artifact, not the serialized trained model.
- A new HMM result requires the external AI Core owner to run its pipeline outside the backend's read-only integration and replace/version the artifact through an authorized process.
- Live inference can only be enabled after AI Core supplies immutable fitted models, preprocessing/feature-order artifacts, dependency pins, and a side-effect-free inference contract.
- The current market output is stale; consumers must inspect `dataDate` and AI health rather than assume real-time data.
- Upstream synthetic/imputed macro inputs and preprocessing look-ahead risks preclude production accuracy claims without a separate validation review.

## Integrity verification procedure

The baseline and final check are performed outside the AI Core:

```bash
python -B backend/scripts/verify_ai_core_integrity.py snapshot \
  --path Vietnam-Stock-Market-Regime-Detection-using-Hidden-Markov-Models \
  --output backend/runtime/ai-core-integrity.json

python -B backend/scripts/verify_ai_core_integrity.py verify \
  --path Vietnam-Stock-Market-Regime-Detection-using-Hidden-Markov-Models \
  --snapshot backend/runtime/ai-core-integrity.json
```

The script hashes every file and reports added, removed, and modified paths without attempting to repair them. A non-zero exit code indicates an integrity violation. The final command result and Git path-restricted status are recorded in the implementation handoff.
