import os
import numpy as np
import pandas as pd
import warnings
from pathlib import Path
from statsmodels.stats.outliers_influence import variance_inflation_factor
from scipy.stats import norm
from sklearn.feature_selection import mutual_info_regression
import lightgbm as lgb
import shap
from joblib import Parallel, delayed
import matplotlib.pyplot as plt
from sklearn.metrics import roc_curve, auc
import datetime
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)
root_dir = os.path.abspath(os.path.join(script_dir, ".."))
if root_dir not in sys.path:
    sys.path.append(root_dir)
from helper import check_stationarity, make_Z, auto_label_sector,filter_vif_greedy, evaluate_hmm, get_hmm_filtered_inference, auto_label

warnings.filterwarnings('ignore')
RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)

def log(msg):
    print(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}")


HMM_TRAIN_END = pd.Timestamp('2019-12-31')
OUTPUT_DIR = Path('../output/hmm_model')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
script_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(script_dir, ".."))
artifact_dir = os.path.join(root_dir, 'plots')

log(f"Thư mục đầu ra được thiết lập tại: {OUTPUT_DIR.resolve()}")

# Tải Dữ Liệu Đã Qua Tiền Xử Lý & Chuẩn Hóa
log("Đang tải dữ liệu final_model_data.csv")
df_market = pd.read_csv('../output/final_model_data.csv')
df_market['time'] = pd.to_datetime(df_market['time'])
log(f"Kích thước bảng dữ liệu Market: {df_market.shape}")

# 2. Bộ Lọc Kiểm Định Kỹ Thuật (Stationarity & Kurtosis)
log("Bộ Lọc Kiểm Định Kỹ Thuật (Stationarity & Kurtosis)")
# Lọc bỏ các cột time, market proxy, và các cột _Z đã được chuẩn hóa để chỉ test trên raw data
exclude_cols = ['time', 'vnindex_log_ret', 'vnindex_close', 'vnindex_vol20', 'Y_proxy']
daily_pool = [c for c in df_market.columns if not c.endswith('_Z') and c not in exclude_cols]

stat_results = []
for c in daily_pool:
    is_stat, p_a, p_k, kurt, skw = check_stationarity(df_market[c])
    stat_results.append({'feature': c, 'is_stationary': is_stat, 'p_adf': p_a, 'p_kpss': p_k, 'kurtosis': kurt, 'skewness': skw})
stat_df = pd.DataFrame(stat_results)
print(stat_df)

selected_raw_features = stat_df[stat_df['is_stationary']]['feature'].tolist()
if not selected_raw_features:
    selected_raw_features = daily_pool # Fallback

log(f'\n[KEEP] Các đặc trưng ĐƯỢC GIỮ LẠI ({len(selected_raw_features)} biến): {selected_raw_features}')
dropped = [c for c in daily_pool if c not in selected_raw_features]
log(f'[DROP] Các đặc trưng BỊ LOẠI BỎ ({len(dropped)} biến): {dropped}')

# Điểm Thông Tin Tương Hỗ (Mutual Information - MI) & Lựa Chọn Đặc Trưng Tham Lam & Kiểm Soát VIF
log("Điểm Thông Tin Tương Hỗ (Mutual Information - MI) & Lựa Chọn Đặc Trưng Tham Lam & Kiểm Soát VIF")
log("Tạo Y_proxy rule-based cho Market")

for std_col in ['vnindex_log_ret', 'vnindex_vol20']:
    if std_col not in df_market.columns:
        alt = next((c for c in [f'{std_col}_y', f'{std_col}_x'] if c in df_market.columns), None)
        if alt is None:
            raise KeyError(f"{std_col} column not found in df_market")
        df_market = df_market.rename(columns={alt: std_col})

df_market = df_market.loc[:, ~df_market.columns.duplicated()]
vol_median = df_market['vnindex_vol20'].median()
def label_proxy(row):
    ret = row['vnindex_log_ret']
    vol = row['vnindex_vol20']
    if ret > 0 and vol < vol_median: return 0 # Bull / Low Vol
    elif ret < 0 and vol > vol_median: return 1 # Bear / High Vol
    else: return 2 # Sideways

df_market['Y_proxy'] = df_market.apply(label_proxy, axis=1)

Z_features = [c + '_Z' for c in selected_raw_features]
X_train = df_market[Z_features].dropna()
y_train = df_market.loc[X_train.index, 'Y_proxy']



# Tính SHAP
log("Tính SHAP")
clf = lgb.LGBMClassifier(n_estimators=50, random_state=RANDOM_STATE, verbose=-1)
clf.fit(X_train, y_train)
explainer = shap.TreeExplainer(clf)
shap_values = explainer.shap_values(X_train)
if isinstance(shap_values, list):
    mean_shap = np.mean([np.abs(sv).mean(axis=0) for sv in shap_values], axis=0)
else:
    vals = shap_values.values if hasattr(shap_values, 'values') else np.array(shap_values)
    if len(vals.shape) == 3:
        if vals.shape[1] == len(Z_features):
            mean_shap = np.abs(vals).mean(axis=0).mean(axis=1)
        else:
            mean_shap = np.abs(vals).mean(axis=0).mean(axis=0)
    else:
        mean_shap = np.abs(vals).mean(axis=0)
shap_df = pd.DataFrame({'feature': Z_features, 'shap_importance': mean_shap})
print(shap_df.head(5))

# Tính MI với |vnindex_log_ret|
log("Tính MI với |vnindex_log_ret|")
target_mi = np.abs(df_market.loc[X_train.index, 'vnindex_log_ret'])
mi_scores = mutual_info_regression(X_train, target_mi, random_state=RANDOM_STATE)
mi_df = pd.DataFrame({'feature': Z_features, 'mi_score': mi_scores})
print(mi_df.head(5))

# Gộp điểm & Lọc VIF tham lam
log("Gộp điểm & Lọc VIF tham lam")
feature_scores = shap_df.merge(mi_df, on='feature')
feature_scores['total_score'] = feature_scores['shap_importance'] * feature_scores['mi_score']
feature_scores = feature_scores.sort_values('total_score', ascending=False)
print(feature_scores)

final_features = filter_vif_greedy(X_train, feature_scores['feature'].tolist())
print("Top features (SHAP+MI) qua bộ lọc VIF:")
macro_pool = [c for c in ['cpi_mom_Z', 'credit_growth_mom_Z', 'fnb_ratio_Z', 'pmi_vn_Z', 'fx_log_ret_Z'] if c in X_train.columns]
final_features = set(final_features).union(set(macro_pool))
macro_features = [f for f in final_features if f in macro_pool]
market_features = [f for f in final_features if f not in macro_pool]
print('Macro Features:', macro_features)
print('Market Features:', market_features)
print(feature_scores.head(10))


# =====================================================================
# 1. PREPARE & EVALUATE MACRO HMM (MONTHLY)
# =====================================================================
log("=====================================================================")
log("1. PREPARE & EVALUATE MACRO HMM (MONTHLY)")
log("=====================================================================")
df_market['year_month'] = df_market['time'].dt.to_period('M')
df_monthly = df_market.groupby('year_month').last().reset_index()

train_mask_macro = df_monthly['time'] <= HMM_TRAIN_END
Z_data_macro = df_monthly[macro_features].fillna(0).values
Z_train_macro = Z_data_macro[train_mask_macro]
Z_oos_macro = Z_data_macro[~train_mask_macro]

log("==> EVALUATING MACRO HMM (MONTHLY TIMEFRAME)...")
results_macro, models_macro = [], {}
for K in [2, 3]:
    m, bic, ll_oos, min_dur, min_share, max_share = evaluate_hmm(K, Z_train_macro, Z_oos_macro, seeds=5)
    if m:
        results_macro.append({'K': K, 'BIC': bic, 'll_oos': ll_oos, 'min_dur': min_dur, 'min_share': min_share, 'max_share': max_share})
        models_macro[K] = m
res_df_macro = pd.DataFrame(results_macro)


prob_cols = []
if len(res_df_macro) > 0:
    res_df_macro['Rank_bic'] = res_df_macro['BIC'].rank(ascending=True)
    res_df_macro['Rank_oos'] = res_df_macro['ll_oos'].rank(ascending=False)
    res_df_macro['Composite'] = 0.5 * res_df_macro['Rank_bic'] + 0.5 * res_df_macro['Rank_oos']
    res_df_macro = res_df_macro.sort_values('Composite')
    K_macro = int(res_df_macro.iloc[0]['K'])
    best_macro_hmm = models_macro[K_macro]
    log(res_df_macro)
    log(f"--> Quyết định K tối ưu Macro: K = {K_macro}")

    global_macro_regimes, macro_probs = get_hmm_filtered_inference(best_macro_hmm, Z_data_macro)

    for i in range(K_macro):
        col = f'Macro_Prob_{i}'
        df_monthly[col] = macro_probs[:, i]
        prob_cols.append(col)

    # SHIFT 1 THÁNG ĐỂ XỬ LÝ ĐỘ TRỄ CÔNG BỐ (PUBLICATION LAG)
    df_monthly_shifted = df_monthly.copy()
    df_monthly_shifted['year_month'] = df_monthly_shifted['year_month'] + 1

    df_market = df_market.merge(df_monthly_shifted[['year_month'] + prob_cols], on='year_month', how='left')
    df_market[prob_cols] = df_market[prob_cols].ffill().fillna(0) # Điền 0 cho những ngày đầu tiên chưa có vĩ mô

    # LƯU KẾT QUẢ MACRO HMM
    df_monthly.to_csv(OUTPUT_DIR / 'macro_hmm_results.csv', index=False)
    log(f"Đã lưu kết quả Macro HMM ra: {OUTPUT_DIR / 'macro_hmm_results.csv'}")
else:
    log("Không tìm thấy cấu hình Macro HMM hội tụ!")


log("=====================================================================")
log("2. PREPARE & EVALUATE MARKET HMM (DAILY + MACRO PROBS")
log("=====================================================================")
log("\n==> EVALUATING MARKET HMM (DAILY TIMEFRAME WITH MACRO AWARENESS)...")
train_mask_market = df_market['time'] <= HMM_TRAIN_END

# Market HMM giờ đây lấy đầu vào là cả biến thị trường VÀ xác suất Vĩ mô!
combined_market_features = market_features + prob_cols[:-1] if prob_cols else market_features
Z_data_market = df_market[combined_market_features].fillna(0).values

Z_train_market = Z_data_market[train_mask_market]
Z_oos_market = Z_data_market[~train_mask_market]

results_market, models_market = [], {}
for K in [2, 3, 4]:
    m, bic, ll_oos, min_dur, min_share, max_share = evaluate_hmm(K, Z_train_market, Z_oos_market)
    if m:
        results_market.append({'K': K, 'BIC': bic, 'll_oos': ll_oos, 'min_dur': min_dur, 'min_share': min_share, 'max_share': max_share})
        models_market[K] = m
res_df_market = pd.DataFrame(results_market)

if len(res_df_market) > 0:
    res_df_market['Rank_bic'] = res_df_market['BIC'].rank(ascending=True)
    res_df_market['Rank_oos'] = res_df_market['ll_oos'].rank(ascending=False)
    res_df_market['Rank_min_dur'] = res_df_market['min_dur'].rank(ascending=False)
    res_df_market['Composite'] = 0.3 * res_df_market['Rank_bic'] + 0.5 * res_df_market['Rank_oos'] + 0.2 * res_df_market['Rank_min_dur']
    res_df_market = res_df_market.sort_values('Composite')
    K_market = 0 # Thường cố định K=3
    if K_market not in models_market:
        K_market = int(res_df_market.iloc[0]['K'])
    best_market_hmm = models_market[K_market]
    log(res_df_market)
    log(f"--> Quyết định K tối ưu Market: K = {K_market}")

    global_market_regimes_filtered, market_probs = get_hmm_filtered_inference(best_market_hmm, Z_data_market)
    for i in range(K_market):
        df_market[f'Market_Prob_{i}'] = market_probs[:, i]
else:
    log("Không tìm thấy cấu hình Market HMM hội tụ!")

# Tự Động Ánh Xạ & Gán Nhãn Trạng Thái (K-agnostic Labeling)
log("Tự Động Ánh Xạ & Gán Nhãn Trạng Thái (K-agnostic Labeling)")
df_market_res = df_market[['time']].copy()
df_market_res['market_regime'] = global_market_regimes_filtered
stats_market = []
for k in range(K_market):
    mask = df_market_res['market_regime'] == k
    ret_k = df_market.loc[mask, 'vnindex_log_ret'].mean() * 100 if mask.sum() > 0 else 0
    vol_k = df_market.loc[mask, 'vnindex_vol20'].mean() * 100 if mask.sum() > 0 else 0
    stats_market.append({'state': k, 'mean_ret_%': ret_k, 'vol_%': vol_k})
rs_market = pd.DataFrame(stats_market)
log(rs_market)
STATE_TO_LABEL_MARKET = auto_label(rs_market, K_market)
df_market_res['market_regime_label'] = df_market_res['market_regime'].map(STATE_TO_LABEL_MARKET)
for k in range(K_market):
    df_market_res[f'prob_market_{k}'] = df_market[f'Market_Prob_{k}']

# LƯU KẾT QUẢ MARKET HMM
df_market_res.to_csv(OUTPUT_DIR / 'market_hmm_results.csv', index=False)
log(f"Đã lưu kết quả Market HMM ra: {OUTPUT_DIR / 'market_hmm_results.csv'}")

# Chuẩn bị Dữ liệu Ngành & Huấn luyện Sector HMM (Grid Search K)
log("Huấn luyện Sector HMM (Grid Search K)")
df_sector_final = pd.read_csv("../data/processed/industry_features.csv")
df_sector_final['time'] = pd.to_datetime(df_sector_final['time'])

from hmmlearn.hmm import GMMHMM
def n_params(K, D, M=2):
    return (K - 1) + K * (K - 1) + K * (M - 1) + K * M * D + K * M * D * (D + 1) // 2

def evaluate_hmm_sector(K, Z_train, Z_oos, seeds=3):
    Z_train = Z_train + np.random.normal(0, 1e-4, Z_train.shape)
    if len(Z_oos) > 0: Z_oos = Z_oos + np.random.normal(0, 1e-4, Z_oos.shape)
    best_bic, best_ll_oos, best_model = np.inf, -np.inf, None
    best_min_dur = 0
    for seed in range(seeds):
        try:
            m = GMMHMM(n_components=K, n_mix=2, covariance_type='diag', min_covar=0.01, n_iter=100, random_state=seed*7)
            m.fit(Z_train)
            ll_train = m.score(Z_train)
            p = n_params(K, Z_train.shape[1])
            bic = -2 * ll_train + p * np.log(len(Z_train))
            ll_oos = m.score(Z_oos) if len(Z_oos)>0 else np.nan
            persist = np.diag(m.transmat_)
            min_dur = float((1.0 / (1.0 - persist + 1e-9)).min())
            if bic < best_bic and min_dur >= 3.0:
                best_bic, best_ll_oos, best_model, best_min_dur = bic, ll_oos, m, min_dur
        except: continue
    return best_model, best_bic, best_ll_oos, best_min_dur

log("Huấn luyện Sector HMM (Tự động Grid Search chọn K tốt nhất cho từng ngành)...")
sector_results = []
all_semantic_labels = set()
Z_sector_cols = [c for c in df_sector_final.columns if c.endswith('_Z')]

for industry, group in df_sector_final.groupby('industry'):
    group = group.sort_values('time').reset_index(drop=True)
    Z_sec = group[Z_sector_cols].fillna(0).values
    if len(Z_sec) < 100: continue

    train_mask = group['time'] <= HMM_TRAIN_END
    Z_train = Z_sec[train_mask]
    Z_oos = Z_sec[~train_mask]
    if len(Z_train) < 50: 
        Z_train = Z_sec; Z_oos = np.array([])

    results, models = [], {}
    for K in [2, 3, 4]:
        m, bic, ll_oos, min_dur = evaluate_hmm_sector(K, Z_train, Z_oos)
        if m:
            results.append({'K': K, 'BIC': bic, 'll_oos': ll_oos, 'min_dur': min_dur})
            models[K] = m

    res_df = pd.DataFrame(results)
    if len(res_df) > 0:
        res_df['Rank_bic'] = res_df['BIC'].rank(ascending=True)
        res_df['Rank_oos'] = res_df['ll_oos'].rank(ascending=False)
        res_df['Rank_min_dur'] = res_df['min_dur'].rank(ascending=False)
        res_df['Composite'] = 0.3 * res_df['Rank_bic'] + 0.5 * res_df['Rank_oos'] + 0.2 * res_df['Rank_min_dur']
        res_df = res_df.sort_values('Composite')
        best_K = int(res_df.iloc[0]['K'])
        best_model = models[best_K]
    else:
        log(f"[-] Bỏ qua {industry}: Không model nào hội tụ.")
        continue 

    group['sector_regime'], probs = get_hmm_filtered_inference(best_model, Z_sec)

    stats = []
    for k in range(best_K):
        mask = group['sector_regime'] == k
        r = group.loc[mask, 'sector_log_ret'].mean() if mask.sum() > 0 else 0.0
        v = group.loc[mask, 'sector_vol20'].mean() if mask.sum() > 0 else 0.0
        stats.append({'state': k, 'mean_ret': r, 'mean_vol': v})

    labels = auto_label_sector(pd.DataFrame(stats), best_K)
    group['sector_regime_label'] = group['sector_regime'].map(labels)
    group['sector_best_K'] = best_K

    for k in range(best_K):
        semantic = labels[k]
        group[f'prob_sector_{semantic}'] = probs[:, k]
        all_semantic_labels.add(f'prob_sector_{semantic}')

    sector_results.append(group)
    log(f"[+] Hoàn thành Sector HMM: {industry} (Tối ưu K={best_K})")

df_sector_hmm = pd.concat(sector_results, ignore_index=True)
for col in all_semantic_labels:
    if col not in df_sector_hmm.columns: df_sector_hmm[col] = 0.0
    else: df_sector_hmm[col] = df_sector_hmm[col].fillna(0.0)

# LƯU KẾT QUẢ SECTOR HMM
df_sector_hmm.to_csv(OUTPUT_DIR / 'sector_hmm_results.csv', index=False)
log(f"Đã lưu kết quả Sector HMM ra: {OUTPUT_DIR / 'sector_hmm_results.csv'}")

# =====================================================================
# 8. Huấn Luyện Ticker HMM Kết Hợp Vĩ Mô & Ngành
# =====================================================================
log("Huấn Luyện Ticker HMM Kết Hợp Vĩ Mô & Ngành")
from helper import make_Z_ticker

log("Đang tải dữ liệu m1_vn60.csv cho Ticker HMM...")
df_m1 = pd.read_csv('../data/processed/m1_vn60.csv')
df_m1['time'] = pd.to_datetime(df_m1['time']).dt.normalize()
_ind_df = pd.read_csv('../data/industry/industries.csv')
_ind_df = _ind_df[_ind_df['icb_level'] == 1]
industry_mapping = dict(zip(_ind_df['symbol'], _ind_df['icb_name']))
df_m1['industry'] = df_m1['ticker'].map(industry_mapping)

tickers = df_m1['ticker'].unique()
market_cols = [c for c in df_market.columns if 'Z' not in c and c not in ['time', 'Y_proxy']]
global_vars = df_market[['time'] + market_cols].copy()
global_vars['market_regime_label'] = df_market_res['market_regime_label']

for k in range(K_market):
    prob_col = f'Market_Prob_{k}'
    if prob_col in df_market.columns:
        global_vars[prob_col] = df_market[prob_col]

ticker_dfs = []
for i, ticker in enumerate(tickers):
    df_tick = df_m1[df_m1['ticker'] == ticker].copy().sort_values('time').reset_index(drop=True)
    df_tick['rolling_vol_5'] = df_tick['log_return'].rolling(5).std() * np.sqrt(252)
    df_tick['mom_1M'] = df_tick['close'].pct_change(20)
    df_tick['dist_MA50'] = df_tick['close'] / df_tick['close'].rolling(50).mean() - 1

    for col in ['volume_ratio', 'rolling_vol_20d', 'return_5d', 'return_20d']:
        if col not in df_tick.columns:
            if col == 'volume_ratio': df_tick['volume_ratio'] = df_tick['volume'] / df_tick['volume'].rolling(20).mean()
            elif col == 'rolling_vol_20d': df_tick['rolling_vol_20d'] = df_tick['log_return'].rolling(20).std() * np.sqrt(252)
            elif col == 'return_5d': df_tick['return_5d'] = df_tick['close'].pct_change(5)
            elif col == 'return_20d': df_tick['return_20d'] = df_tick['close'].pct_change(20)

    ticker_cols = ['time', 'open', 'high', 'low', 'close', 'volume', 'log_return', 'industry', 
                   'rolling_vol_20d', 'return_5d', 'return_20d', 'volume_ratio', 'rolling_vol_5', 'mom_1M', 'dist_MA50']

    cols_to_drop = [c for c in ticker_cols if c != 'time' and c in global_vars.columns]
    global_vars_clean = global_vars.drop(columns=cols_to_drop)
    ticker_aligned = global_vars_clean.merge(df_tick[ticker_cols], on='time', how='inner')

    sector_cols_to_merge = ['time', 'industry', 'sector_regime', 'sector_regime_label'] + list(all_semantic_labels)
    ticker_aligned = ticker_aligned.merge(df_sector_hmm[sector_cols_to_merge], on=['time', 'industry'], how='left')
    ticker_aligned[list(all_semantic_labels)] = ticker_aligned[list(all_semantic_labels)].fillna(0)

    tick_specific_features = ['log_return', 'rolling_vol_20d', 'volume_ratio']
    market_prob_features = sorted([col for col in ticker_aligned.columns if col.startswith('Market_Prob_')])[:-1]
    macro_prob_features = sorted([col for col in ticker_aligned.columns if col.startswith('Macro_Prob_')])[:-1]
    sector_prob_features = sorted([c for c in all_semantic_labels if c in ticker_aligned.columns and ticker_aligned[c].std() > 1e-6])[:-1]

    hybrid_features = tick_specific_features + macro_prob_features + market_prob_features + sector_prob_features

    fd_z_tick, Z_all_tick = make_Z_ticker(ticker_aligned, hybrid_features, window=252)

    if len(Z_all_tick) < 100:
        continue

    K_tick = 3
    ticker_hmm = GMMHMM(n_components=K_tick, n_mix=2, covariance_type='diag', min_covar=0.01, n_iter=100, random_state=42)
    try:
        ticker_hmm.fit(Z_all_tick)
        ticker_daily_states, ticker_daily_probs = get_hmm_filtered_inference(ticker_hmm, Z_all_tick)

        stats = []
        for k in range(K_tick):
            mask = ticker_daily_states == k
            r = ticker_aligned.loc[mask, 'log_return'].mean()
            v = ticker_aligned.loc[mask, 'rolling_vol_20d'].mean()
            stats.append({'state': k, 'mean_ret': r, 'mean_vol': v})

        ticker_labels_map = auto_label_sector(pd.DataFrame(stats), K_tick)
        ticker_daily_labels = pd.Series(ticker_daily_states).map(ticker_labels_map).values
    except Exception as e:
        log(f"Lỗi khi train/predict mã {ticker}: {e}")
        ticker_daily_states = np.zeros(len(Z_all_tick), dtype=int)
        ticker_daily_probs = np.zeros((len(Z_all_tick), K_tick))
        ticker_daily_probs[:, 0] = 1.0
        ticker_daily_labels = np.array(['Unknown'] * len(Z_all_tick))

    df_tick_daily_res = pd.DataFrame({
        'time': fd_z_tick['time'].values,
        'ticker_regime': ticker_daily_states,
        'ticker_regime_label': ticker_daily_labels,
    })
    for k in range(K_tick):
        df_tick_daily_res[f'prob_ticker_{k}'] = ticker_daily_probs[:, k]

    state_cols = ['ticker_regime', 'ticker_regime_label'] + [f'prob_ticker_{k}' for k in range(K_tick)]
    ticker_master = ticker_aligned.merge(df_tick_daily_res[['time'] + state_cols], on='time', how='inner')
    ticker_master['ticker'] = ticker
    ticker_dfs.append(ticker_master)
    log(f"[+] Hoàn thành Ticker HMM: {ticker}")

master_ticker = pd.concat(ticker_dfs, ignore_index=True)
master_ticker = master_ticker.dropna(subset=['close']).reset_index(drop=True)
cols_reordered = ['time', 'ticker'] + [col for col in master_ticker.columns if col not in ['time', 'ticker']]
master_ticker = master_ticker[cols_reordered]
log(f'Hoàn thành huấn luyện Ticker HMM. Kích thước master_ticker: {master_ticker.shape}')

# LƯU KẾT QUẢ TICKER HMM
master_ticker.to_csv(OUTPUT_DIR / 'master_ticker_hmm_results.csv', index=False)
log(f"Đã lưu kết quả toàn bộ HMM ra: {OUTPUT_DIR / 'master_ticker_hmm_results.csv'}")

