import sys
import os

sys.stdout.reconfigure(encoding='utf-8')
os.environ["PYTHONIOENCODING"] = "utf-8"

import json
import pandas as pd
import numpy as np
import argparse

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.integer, np.int64, np.int32)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float64, np.float32)):
            return float(obj)
        elif isinstance(obj, (np.ndarray,)):
            return obj.tolist()
        elif isinstance(obj, (np.bool_)):
            return bool(obj)
        return super().default(obj)


script_dir = os.path.dirname(os.path.abspath(__file__))
if script_dir not in sys.path:
    sys.path.append(script_dir)

ppo_dir = os.path.join(script_dir, "model", "PPO")
if ppo_dir not in sys.path:
    sys.path.append(ppo_dir)

import ppo
from ppo import load_data, AdvancedPortfolioEnv, allocate_portfolio_real
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize

def extract_weekly_history(step_interval=5, capital=100_000_000, output_csv="history.csv", output_json="history.json"):
    """
    Extract AI trading predictions and real portfolio allocations across historical weekly steps.
    """
    print(f"🚀 Starting Historical AI Signal Extraction (Interval: {step_interval} steps, Capital: {capital:,.0f} VND)...")
    
    returns_df, ai_features_df, strategies_features_df, weights_dim, tickers, num_strategies_features, dates = load_data()
    total_steps = len(dates)
    
    save_dir = os.path.join(script_dir, "output", "ppo_model")
    vec_norm_path = os.path.join(save_dir, "vec_normalize.pkl")
    model_path = os.path.join(save_dir, "AI_Brain.zip")
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found at {model_path}")
        
    sys.modules['__main__'].AdvancedTickerExtractor = ppo.AdvancedTickerExtractor
    model = PPO.load(model_path)
    
    # Target steps: sample every `step_interval` days (e.g. 5 days = 1 week)
    sample_indices = list(range(0, total_steps, step_interval))
    if (total_steps - 1) not in sample_indices:
        sample_indices.append(total_steps - 1)
        
    print(f"📅 Total historical trading days: {total_steps}. Sampled {len(sample_indices)} weekly points.")
    
    history_records = []
    json_history = []
    
    for count, idx in enumerate(sample_indices):
        date_str = dates[idx]
        returns_live = returns_df.iloc[[idx]]
        ai_live = ai_features_df.iloc[[idx]]
        strategies_live = strategies_features_df.iloc[[idx]]
        dates_live = [date_str]
        
        live_env = DummyVecEnv([lambda: AdvancedPortfolioEnv(
            returns_live, ai_live, strategies_live, weights_dim, num_strategies_features, tickers=tickers, dates=dates_live, is_test=True
        )])
        
        if os.path.exists(vec_norm_path):
            live_env = VecNormalize.load(vec_norm_path, live_env)
            live_env.training = False
            live_env.norm_reward = False
            
        obs = live_env.reset()
        action, _ = model.predict(obs, deterministic=True)
        action = action[0]
        
        action = np.clip(action, 0, 1)
        action_sum = np.sum(action)
        if action_sum > 1.0:
            action = action / action_sum
            
        current_prices = strategies_live.values[0].reshape(num_strategies_features, weights_dim).T[:, 2]
        
        result = allocate_portfolio_real(
            tickers=tickers,
            w=action,
            p=current_prices,
            C=capital,
            LOT_SIZE=100
        )
        
        # Prepare JSON record
        json_item = {
            "date": date_str,
            "capital": capital,
            "used_capital": result['used'],
            "cash_left": result['cash_left'],
            "tracking_error": round(result['tracking_error'], 4),
            "warning_flag": result['warning_flag'],
            "warning_msg": result['warning_msg'],
            "allocations": result['allocations']
        }
        json_history.append(json_item)
        
        # Prepare CSV rows (one row per allocation item)
        for item in result['allocations']:
            history_records.append({
                "date": date_str,
                "capital": capital,
                "ticker": item['ma_co_phieu'],
                "so_lo": item['so_lo'],
                "so_co_phieu": item['so_co_phieu'],
                "gia_hien_tai": item['gia_hien_tai'],
                "so_tien_chi": item['so_tien_chi'],
                "ty_trong_goc_ppo": round(item['ty_trong_goc_ppo'], 4),
                "ty_trong_thuc_te": round(item['ty_trong_thuc_te'], 4),
                "used_capital": result['used'],
                "cash_left": result['cash_left'],
                "tracking_error": round(result['tracking_error'], 4)
            })
            
        if (count + 1) % 10 == 0 or (count + 1) == len(sample_indices):
            print(f"  [Progress] Processed {count + 1}/{len(sample_indices)} weekly dates (Latest: {date_str})")

    # Save to CSV
    df_history = pd.DataFrame(history_records)
    
    # Save paths
    ai_core_csv = os.path.join(script_dir, output_csv)
    ai_core_json = os.path.join(script_dir, output_json)
    
    df_history.to_csv(ai_core_csv, index=False)
    with open(ai_core_json, "w", encoding="utf-8") as f:
        json.dump(json_history, f, ensure_ascii=False, indent=2, cls=NumpyEncoder)
        
    print(f"✅ CSV Exported successfully: {ai_core_csv} ({len(df_history)} rows)")
    print(f"✅ JSON Exported successfully: {ai_core_json} ({len(json_history)} dates)")
    
    # Also copy to frontend public directory if it exists
    frontend_public = os.path.abspath(os.path.join(script_dir, "..", "frontend", "public"))
    if os.path.exists(frontend_public):
        fe_csv = os.path.join(frontend_public, output_csv)
        fe_json = os.path.join(frontend_public, output_json)
        df_history.to_csv(fe_csv, index=False)
        with open(fe_json, "w", encoding="utf-8") as f:
            json.dump(json_history, f, ensure_ascii=False, indent=2, cls=NumpyEncoder)
        print(f"🌐 Copied live demo assets to Frontend Public: {fe_csv} & {fe_json}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract Historical AI Weekly Signals for Frontend Live Demo")
    parser.add_argument("--interval", type=int, default=5, help="Step interval (5 = weekly)")
    parser.add_argument("--capital", type=float, default=100000000, help="Investment Capital in VND")
    args = parser.parse_args()
    
    extract_weekly_history(step_interval=args.interval, capital=args.capital)
