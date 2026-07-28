import sys
import os
import json
import random
import pandas as pd
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')
os.environ["PYTHONIOENCODING"] = "utf-8"

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

CAPITAL_TIERS = [50_000_000, 100_000_000, 250_000_000, 500_000_000]

def run_user_simulation(days_count=22, step_interval=1, seed=42):
    """
    Simulates 4 User Tiers (50M, 100M, 250M, 500M) over the most recent 22 trading days (1 month), updated DAILY.
    Each user buys a random ratio (0% - 80%) of AI recommended stock allocations.
    Maintains T+2.5 settlement queues, average entry prices, and portfolio holdings.
    """
    random.seed(seed)
    np.random.seed(seed)
    print(f"🚀 Initializing User Portfolio Simulation Engine (Last {days_count} trading days / 1 Month Daily)...")
    
    returns_df, ai_features_df, strategies_features_df, weights_dim, tickers, num_strategies_features, dates = load_data()
    total_steps = len(dates)
    
    save_dir = os.path.join(script_dir, "output", "ppo_model")
    vec_norm_path = os.path.join(save_dir, "vec_normalize.pkl")
    model_path = os.path.join(save_dir, "AI_Brain.zip")
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"PPO Model not found at {model_path}")
        
    sys.modules['__main__'].AdvancedTickerExtractor = ppo.AdvancedTickerExtractor
    model = PPO.load(model_path)
    
    # Initialize 4 User Accounts
    users = {}
    for cap in CAPITAL_TIERS:
        users[cap] = {
            "user_tier": f"{int(cap / 1_000_000)}M",
            "initial_capital": cap,
            "cash": float(cap),
            "nav": float(cap),
            "holdings": {}, # ticker -> { so_co_phieu, gia_von, gia_hien_tai, shares_unlocked, shares_t1, shares_t2 }
            "history_log": []
        }
        
    start_idx = max(0, total_steps - days_count)
    sample_indices = list(range(start_idx, total_steps, step_interval))
    if (total_steps - 1) not in sample_indices:
        sample_indices.append(total_steps - 1)
        
    trade_orders_log = []

    
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
        if np.sum(action) > 1.0:
            action = action / np.sum(action)
            
        current_prices = strategies_live.values[0].reshape(num_strategies_features, weights_dim).T[:, 2]
        price_dict = {tickers[i]: float(current_prices[i]) for i in range(weights_dim)}
        
        # 1. Update Settlement (T+2.5 Unlocking) & Price updates for all users
        for cap, u in users.items():
            holdings = u["holdings"]
            new_holdings = {}
            total_stock_val = 0.0
            
            for ticker, h in holdings.items():
                cur_price = price_dict.get(ticker, h["gia_hien_tai"])
                h["gia_hien_tai"] = cur_price
                
                # Advance Settlement Queue
                h["shares_unlocked"] += h["shares_t1"]
                h["shares_t1"] = h["shares_t2"]
                h["shares_t2"] = 0
                
                total_shares = h["shares_unlocked"] + h["shares_t1"] + h["shares_t2"]
                h["so_co_phieu"] = total_shares
                
                if total_shares > 0:
                    stock_val = total_shares * cur_price
                    total_stock_val += stock_val
                    new_holdings[ticker] = h
                    
            u["holdings"] = new_holdings
            u["nav"] = u["cash"] + total_stock_val

        # 2. Perform AI Allocation & Simulate User Buy (0% - 80% random ratio)
        for cap, u in users.items():
            ai_alloc = allocate_portfolio_real(
                tickers=tickers,
                w=action,
                p=current_prices,
                C=u["nav"], # Allocate based on current NAV
                LOT_SIZE=100
            )
            
            # Simulate User Buying a random ratio (0.0 to 0.8) of recommended shares
            for rec in ai_alloc['allocations']:
                ticker = rec['ma_co_phieu']
                rec_shares = rec['so_co_phieu']
                price = rec['gia_hien_tai']
                
                # Random buy factor between 0.0 (0%) and 0.8 (80%)
                buy_factor = random.uniform(0.0, 0.8)
                user_buy_shares = int(np.floor(rec_shares * buy_factor / 100)) * 100 # Round to LOT 100
                
                if user_buy_shares > 0:
                    cost = user_buy_shares * price
                    if u["cash"] >= cost:
                        u["cash"] -= cost
                        
                        holdings = u["holdings"]
                        if ticker not in holdings:
                            holdings[ticker] = {
                                "ma_co_phieu": ticker,
                                "so_co_phieu": 0,
                                "gia_von": price,
                                "gia_hien_tai": price,
                                "shares_unlocked": 0,
                                "shares_t1": 0,
                                "shares_t2": 0
                            }
                            
                        cur_h = holdings[ticker]
                        old_shares = cur_h["so_co_phieu"]
                        old_cost = old_shares * cur_h["gia_von"]
                        new_total_shares = old_shares + user_buy_shares
                        
                        # Weighted Average Entry Price
                        cur_h["gia_von"] = (old_cost + cost) / new_total_shares
                        cur_h["so_co_phieu"] = new_total_shares
                        cur_h["shares_t2"] += user_buy_shares # Newly bought shares locked in T2
                        cur_h["gia_hien_tai"] = price
                        
                        trade_orders_log.append({
                            "date": date_str,
                            "user_tier": u["user_tier"],
                            "capital_tier": cap,
                            "ticker": ticker,
                            "action": "BUY",
                            "shares": user_buy_shares,
                            "price": price,
                            "total_cost": cost,
                            "buy_factor_pct": round(buy_factor * 100, 1)
                        })

    # Prepare Final JSON payload for Frontend
    simulated_users_data = {}
    for cap, u in users.items():
        holdings_list = []
        for t, h in u["holdings"].items():
            status = "UNLOCKED"
            if h["shares_t2"] > 0:
                status = "LOCKED_T2"
            elif h["shares_t1"] > 0:
                status = "LOCKED_T1"
                
            holdings_list.append({
                "ma_co_phieu": h["ma_co_phieu"],
                "so_co_phieu": h["so_co_phieu"],
                "gia_von": round(h["gia_von"], 2),
                "gia_hien_tai": round(h["gia_hien_tai"], 2),
                "status": status,
                "shares_unlocked": h["shares_unlocked"],
                "shares_t1": h["shares_t1"],
                "shares_t2": h["shares_t2"]
            })
            
        pnl_cash = u["nav"] - u["initial_capital"]
        pnl_pct = (pnl_cash / u["initial_capital"]) * 100
        
        simulated_users_data[f"tier_{int(cap/1000000)}m"] = {
            "user_tier": u["user_tier"],
            "initial_capital": u["initial_capital"],
            "current_nav": round(u["nav"], 0),
            "cash_left": round(u["cash"], 0),
            "pnl_cash": round(pnl_cash, 0),
            "pnl_pct": round(pnl_pct, 2),
            "holdings": holdings_list
        }
        
    # Save outputs
    json_path = os.path.join(script_dir, "simulated_users.json")
    csv_path = os.path.join(script_dir, "user_trade_history.csv")
    
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(simulated_users_data, f, ensure_ascii=False, indent=2, cls=NumpyEncoder)
        
    df_trades = pd.DataFrame(trade_orders_log)
    df_trades.to_csv(csv_path, index=False)
    
    print(f"✅ User Simulation completed for 4 Capital Tiers (50M, 100M, 250M, 500M)!")
    print(f"✅ JSON Saved: {json_path}")
    print(f"✅ CSV Trades Saved: {csv_path} ({len(df_trades)} trade logs)")
    
    # Sync to Frontend public
    frontend_public = os.path.abspath(os.path.join(script_dir, "..", "frontend", "public"))
    if os.path.exists(frontend_public):
        fe_json = os.path.join(frontend_public, "simulated_users.json")
        fe_csv = os.path.join(frontend_public, "user_trade_history.csv")
        with open(fe_json, "w", encoding="utf-8") as f:
            json.dump(simulated_users_data, f, ensure_ascii=False, indent=2, cls=NumpyEncoder)
        df_trades.to_csv(fe_csv, index=False)
        print(f"🌐 Synced to Frontend Public: {fe_json} & {fe_csv}")

if __name__ == "__main__":
    run_user_simulation(step_interval=5)
