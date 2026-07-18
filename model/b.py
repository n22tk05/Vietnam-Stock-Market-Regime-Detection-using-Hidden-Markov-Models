import pandas as pd
import numpy as np
import lightgbm as lgb
from sklearn.metrics import classification_report, roc_auc_score
from pathlib import Path
import datetime
import os
from tqdm import tqdm
import warnings

warnings.filterwarnings('ignore')

def log(msg):
    print(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}")

script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)
OUTPUT_DIR = Path('../output/hmm_model')

log("Đang tải dữ liệu master_ticker_hmm_results.csv...")
master_ticker = pd.read_csv(OUTPUT_DIR / 'master_ticker_hmm_results.csv')
master_ticker['time'] = pd.to_datetime(master_ticker['time'])

# 1. Tạo nhãn dự báo (Target): Dự báo return_1d (T+1)
master_ticker = master_ticker.sort_values(['ticker', 'time']).reset_index(drop=True)
master_ticker['target_return_1d'] = master_ticker.groupby('ticker')['close'].pct_change(1).shift(-1)
master_ticker['target_bin'] = (master_ticker['target_return_1d'] > 0).astype(int)

# Bỏ đi những dòng không có target cho quá trình Backtest
df_backtest = master_ticker.dropna(subset=['target_return_1d']).reset_index(drop=True)

# Lọc các features HMM
semantic_sector_probs = [col for col in df_backtest.columns if col.startswith('prob_sector_')]
market_probs = [col for col in df_backtest.columns if col.startswith('Market_Prob_')]
ticker_probs = [col for col in df_backtest.columns if col.startswith('prob_ticker_')]
feature_cols = market_probs + semantic_sector_probs + ticker_probs + ['rolling_vol_20d', 'return_5d', 'volume_ratio']

# =====================================================================
# 1. Chế độ Backtest (Walk-Forward Validation)
# =====================================================================
start_test_date = pd.Timestamp('2022-01-01')
test_dates = sorted(df_backtest[df_backtest['time'] >= start_test_date]['time'].unique())

log(f"Bắt đầu Walk-Forward Training cho {len(test_dates)} ngày giao dịch...")
df_backtest['final_meta_pred_prob'] = np.nan

for i, current_date in enumerate(tqdm(test_dates, desc="Walk-Forward Daily Train")):
    train_mask = df_backtest['time'] < current_date
    X_train = df_backtest.loc[train_mask, feature_cols]
    y_train = df_backtest.loc[train_mask, 'target_bin']

    test_mask = df_backtest['time'] == current_date
    X_test = df_backtest.loc[test_mask, feature_cols]

    if len(X_train) < 1000 or len(X_test) == 0: continue

    clf = lgb.LGBMClassifier(n_estimators=100, learning_rate=0.05, random_state=42, verbose=-1, n_jobs=-1, class_weight='balanced')
    clf.fit(X_train, y_train)
    probs = clf.predict_proba(X_test)[:, 1]
    df_backtest.loc[test_mask, 'final_meta_pred_prob'] = probs

# Đánh giá Backtest
test_mask_all = df_backtest['time'] >= start_test_date
y_test_all = df_backtest.loc[test_mask_all, 'target_bin']
probs_all = df_backtest.loc[test_mask_all, 'final_meta_pred_prob']

valid_idx = probs_all.notna()
y_test_all = y_test_all[valid_idx]
probs_all = probs_all[valid_idx]
preds_all = (probs_all > 0.5).astype(int)

log("\n--- BÁO CÁO PHÂN LOẠI WALK-FORWARD (RETURN_1D) ---")
print(classification_report(y_test_all, preds_all))
print(f"ROC-AUC Score (Daily Walk-Forward): {roc_auc_score(y_test_all, probs_all):.4f}")

# Cập nhật kết quả backtest vào master_ticker
master_ticker = master_ticker.merge(df_backtest[['time', 'ticker', 'final_meta_pred_prob']], on=['time', 'ticker'], how='left')


# =====================================================================
# 2. Chế độ Live Trading (Dự báo ngày T+1)
# =====================================================================
log("\n=== CHẾ ĐỘ LIVE TRADING ===")
latest_date = master_ticker['time'].max()
log(f"Ngày giao dịch mới nhất (T): {latest_date.strftime('%Y-%m-%d')}")

# Tập Train: Tất cả dữ liệu trước ngày T (phải loại bỏ các dòng NaN ở target)
train_mask = (master_ticker['time'] < latest_date) & (master_ticker['target_return_1d'].notna())
X_train_live = master_ticker.loc[train_mask, feature_cols]
y_train_live = master_ticker.loc[train_mask, 'target_bin']

# Tập Test: Duy nhất dữ liệu của ngày T
test_mask = master_ticker['time'] == latest_date
X_test_live = master_ticker.loc[test_mask, feature_cols]

log(f"Đang huấn luyện mô hình Live trên {len(X_train_live)} điểm dữ liệu lịch sử...")
clf_live = lgb.LGBMClassifier(n_estimators=100, learning_rate=0.05, random_state=42, verbose=-1, n_jobs=-1, class_weight='balanced')
clf_live.fit(X_train_live, y_train_live)

log(f"Đang dự báo xác suất tăng giá cho phiên ngày mai (T+1)...")
probs_live = clf_live.predict_proba(X_test_live)[:, 1]

# Gán kết quả vào master_ticker
master_ticker.loc[test_mask, 'final_meta_pred_prob'] = probs_live

# Bảng xếp hạng tín hiệu
live_results = master_ticker.loc[test_mask, ['time', 'ticker', 'industry', 'close', 'final_meta_pred_prob']].copy()
live_results['Tín Hiệu'] = live_results['final_meta_pred_prob'].apply(lambda x: 'Tăng (Khuyên Mua)' if x > 0.5 else 'Giảm (Cảnh Báo)')
live_results = live_results.sort_values('final_meta_pred_prob', ascending=False).reset_index(drop=True)

print("\n🏆 TOP 15 MÃ CỔ PHIẾU TIỀM NĂNG NHẤT CHO T+1:")
print(live_results.head(15))

# Lưu file kết quả dự đoán
output_file = OUTPUT_DIR / 'master_meta_predictions.csv'
master_ticker.to_csv(output_file, index=False)
log(f"Đã lưu kết quả Meta-Classifier ra: {output_file}")
