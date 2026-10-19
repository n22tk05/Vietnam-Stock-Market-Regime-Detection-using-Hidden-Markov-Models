import sys
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(script_dir, ".."))
ppo_dir = os.path.join(script_dir, "model", "PPO")

for p in [root_dir, script_dir, ppo_dir]:
    if p not in sys.path:
        sys.path.append(p)

try:
    import ppo
    from ppo import load_data
except ImportError:
    from ai_core.model.PPO import ppo, load_data

returns_df, ai_features_df, strategies_features_df, weights_dim, tickers, num_strategies_features, dates = load_data()
test_size = int(len(dates) * 0.15)
test_start = len(dates) - test_size

print(f"Start train: {dates[0]}")
print(f"End train: {dates[test_start-1]}")
print(f"Start test: {dates[test_start]}")
print(f"End test: {dates[-1]}")
