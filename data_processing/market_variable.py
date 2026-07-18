import pandas as pd
import os
import sys
import numpy as np

script_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(script_dir, ".."))
output_dir = os.path.join(root_dir, "output")
processed_dir = os.path.join(root_dir, "data", "processed")

# Nhúng module normalization
sys.path.append(script_dir)
from normalization.market import normalize_market

print("Loading data for Market Normalization...")
# Lấy file hmm_data.csv vốn chứa dữ liệu base sau bước process_pipeline
df_daily_base = pd.read_csv(os.path.join(output_dir, 'hmm_data.csv'))
df_daily_base['time'] = pd.to_datetime(df_daily_base['time'])

# Lấy thông tin giá/volume thị trường chung
df_m1 = pd.read_csv(os.path.join(processed_dir, 'm1_vn60.csv'))
df_m1['time'] = pd.to_datetime(df_m1['time']).dt.normalize()

# Tạo Market Proxy
market_ret = df_m1.groupby('time')['log_return'].mean().reset_index()
market_ret.columns = ['time', 'vnindex_log_ret']
market_close = df_m1.groupby('time')['close'].mean().reset_index()
market_close.columns = ['time', 'vnindex_close']

df_market = df_daily_base.merge(market_ret, on='time', how='left')
df_market = df_market.merge(market_close, on='time', how='left')
df_market = df_market.dropna(subset=['vnindex_log_ret', 'vnindex_close']).reset_index(drop=True)
df_market['vnindex_vol20'] = df_market['vnindex_log_ret'].rolling(20).std() * np.sqrt(252)

# Thử merge dữ liệu khối ngoại nếu có
try:
    df_fnb = pd.read_csv(os.path.join(processed_dir, 'm4_foreign_net_buy_sell.csv'))
    df_fnb['time'] = pd.to_datetime(df_fnb['time'])
    df_market = df_market.merge(df_fnb[['time', 'fnb_ratio']], on='time', how='left')
except Exception as e:
    print("No foreign net buy data found, skipping.")

# Thử merge dữ liệu tỷ giá nếu có
try:
    df_fx = pd.read_csv(os.path.join(processed_dir, 'e1_usdvnd.csv'))
    df_fx['time'] = pd.to_datetime(df_fx['time'])
    df_market = df_market.merge(df_fx[['time', 'fx_log_ret']], on='time', how='left')
except Exception as e:
    print("No FX data found, skipping.")

df_market = df_market.dropna().reset_index(drop=True)

# Các feature cần đưa qua chuẩn hóa Z-score
selected_features = [c for c in df_market.columns if c not in ['time', 'vnindex_log_ret', 'vnindex_close', 'vnindex_vol20']]

print("Normalizing Market Features using NQT...")
df_market_normalized = normalize_market(df_market, selected_features)

out_file = os.path.join(output_dir, 'final_model_data.csv')
df_market_normalized.to_csv(out_file, index=False)
print(f"Saved Normalized Market features to {out_file} with {len(df_market_normalized)} records.")
