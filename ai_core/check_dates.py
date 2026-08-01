import sys
import os

sys.path.append(r'C:\Users\ADMIN\Desktop\AIQUANTUM\ai_core\model\PPO')
from ppo import load_data

returns_df, ai_features_df, strategies_features_df, weights_dim, tickers, num_strategies_features, dates = load_data()
test_size = int(len(dates) * 0.15)
test_start = len(dates) - test_size

print(f"Start train: {dates[0]}")
print(f"End train: {dates[test_start-1]}")
print(f"Start test: {dates[test_start]}")
print(f"End test: {dates[-1]}")
