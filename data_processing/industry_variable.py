import os
import sys
import json
import datetime
import pandas as pd
import numpy as np
# Configure stdout for UTF-8
sys.stdout.reconfigure(encoding='utf-8')

def log(msg):
    print(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}")

script_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(script_dir, ".."))
folder_path = os.path.join(root_dir, "data", "processed")

# Paths
tickers_path = os.path.join(root_dir, "success_tickers.txt")
mapping_path = os.path.join(root_dir, "icb_mapping.json")
m1_path = os.path.join(folder_path, "m1_vn60.csv")

log("Reading success_tickers.txt...")
with open(tickers_path, "r", encoding="utf-8") as f:
    tickers = [line.strip() for line in f if line.strip()]
log(f"Loaded {len(tickers)} tickers.")

log("Reading icb_mapping.json...")
with open(mapping_path, "r", encoding="utf-8") as f:
    icb_mapping = json.load(f)

# "chỉ lấy cấp 1" (which is the direct value in the JSON for each ticker)
industry_mapping = {}
for t in tickers:
    if t in icb_mapping:
        industry_mapping[t] = icb_mapping[t]
    else:
        log(f"Warning: Ticker {t} not found in icb_mapping.json")
        industry_mapping[t] = "Unknown"

log(f"Mapped {len(industry_mapping)} tickers to industry.")

if not os.path.exists(m1_path):
    log(f"Error: {m1_path} not found.")
    sys.exit(1)

log("Loading m1_vn60.csv...")
df_m1 = pd.read_csv(m1_path)

print("Đang tạo đặc trưng nhóm ngành (Sector Features)...")
df_m1['industry'] = df_m1['ticker'].map(industry_mapping)

# Drop any rows where industry is somehow missing (shouldn't happen with the dict mapping)
df_m1 = df_m1.dropna(subset=['industry'])

sector_df = df_m1.groupby(['industry', 'time']).agg(
    sector_log_ret=('log_return', 'mean'),
    sector_volume=('volume', 'sum')
).reset_index()

sys.path.append(script_dir)
from normalization.sector import normalize_sector

sector_dfs = []
for ind, group in sector_df.groupby('industry'):
    group = group.sort_values('time').reset_index(drop=True)
    group['sector_vol20'] = group['sector_log_ret'].rolling(20).std() * np.sqrt(252)
    group['sector_vol5'] = group['sector_log_ret'].rolling(5).std() * np.sqrt(252)
    group['sector_volume_ratio'] = group['sector_volume'] / group['sector_volume'].rolling(20).mean()
    sector_dfs.append(group)

sector_df_with_features = pd.concat(sector_dfs, ignore_index=True)

df_sector_final = normalize_sector(sector_df_with_features)

out_file = os.path.join(folder_path, "industry_features.csv")
df_sector_final.to_csv(out_file, index=False, encoding='utf-8-sig')
log(f"Saved sector features to {out_file} with {len(df_sector_final)} records.")