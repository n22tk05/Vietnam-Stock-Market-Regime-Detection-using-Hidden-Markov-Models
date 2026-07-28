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
            "history_log": [],
            "trade_history": []  # per-tier trade events for frontend visualization
        }
        
    start_idx = max(0, total_steps - days_count)
    sample_indices = list(range(start_idx, total_steps, step_interval))
    if (total_steps - 1) not in sample_indices:
        sample_indices.append(total_steps - 1)
        
    trade_orders_log = []
    ai_perf_log = []
    
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
            
        # Calculate AI Performance for Frontend Display
        top_indices = np.argsort(action)[::-1][:3]
        top_tickers = [f"{tickers[i]} ({action[i]*100:.1f}%)" for i in top_indices if action[i] > 0.01]
        top_tickers_str = ", ".join(top_tickers) if top_tickers else "Tiền mặt (100%)"
        
        ret_t1 = None
        ret_t3 = None
        
        if idx + 1 < len(returns_df):
            port_ret_1 = np.sum(action * returns_df.iloc[idx + 1].values)
            ret_t1 = round(port_ret_1 * 100, 2)
            
        if idx + 3 < len(returns_df):
            port_ret_1 = np.sum(action * returns_df.iloc[idx + 1].values)
            port_ret_2 = np.sum(action * returns_df.iloc[idx + 2].values)
            port_ret_3 = np.sum(action * returns_df.iloc[idx + 3].values)
            comp_ret = (1 + port_ret_1) * (1 + port_ret_2) * (1 + port_ret_3) - 1
            ret_t3 = round(comp_ret * 100, 2)
            
        ai_perf_log.append({
            "date": date_str,
            "top_tickers": top_tickers_str,
            "ret_t1": ret_t1,
            "ret_t3": ret_t3
        })
            
        raw_prices = strategies_live.values[0].reshape(num_strategies_features, weights_dim).T[:, 2]
        current_prices_vnd = raw_prices * 1000.0
        price_dict = {tickers[i]: float(current_prices_vnd[i]) for i in range(weights_dim)}
        
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

        # 2. Perform AI Allocation & Simulate User Buy/Sell
        for cap, u in users.items():
            ai_alloc = allocate_portfolio_real(
                tickers=tickers,
                w=action,
                p=raw_prices,
                C=u["nav"], # Allocate based on current NAV to match AI returns
                LOT_SIZE=100
            )

            target_shares_map = {rec['ma_co_phieu']: rec['so_co_phieu'] for rec in ai_alloc['allocations']}
            
            # Step 2a. Execute SELL orders first to free up cash
            holdings_tickers = list(u["holdings"].keys())
            for ticker in holdings_tickers:
                cur_h = u["holdings"][ticker]
                target_shares = target_shares_map.get(ticker, 0)
                current_shares = cur_h["so_co_phieu"]
                
                if target_shares < current_shares:
                    sell_shares = current_shares - target_shares
                    max_sellable = cur_h["shares_unlocked"]
                    actual_sell = min(sell_shares, max_sellable)
                    
                    if actual_sell > 0:
                        price = price_dict[ticker]
                        revenue = actual_sell * price
                        
                        cur_h["so_co_phieu"] -= actual_sell
                        cur_h["shares_unlocked"] -= actual_sell
                        u["cash"] += revenue
                        
                        event = {
                            "date": date_str,
                            "ticker": ticker,
                            "action": "SELL",
                            "shares": actual_sell,
                            "price": price,
                            "total_cost": -revenue,
                            "buy_factor_pct": 100
                        }
                        u["trade_history"].append(event)
                        trade_orders_log.append({
                            "date": date_str,
                            "user_tier": u["user_tier"],
                            "capital_tier": cap,
                            "ticker": ticker,
                            "action": "SELL",
                            "shares": actual_sell,
                            "price": price,
                            "total_cost": -revenue,
                            "buy_factor_pct": 100
                        })
                        
                        if cur_h["so_co_phieu"] == 0:
                            del u["holdings"][ticker]

            # Step 2b. Execute BUY orders
            for rec in ai_alloc['allocations']:
                ticker = rec['ma_co_phieu']
                target_shares = rec['so_co_phieu']
                price = rec['gia_hien_tai']
                
                cur_h = u["holdings"].get(ticker)
                current_shares = cur_h["so_co_phieu"] if cur_h else 0
                
                if target_shares > current_shares:
                    buy_shares = target_shares - current_shares
                    cost = buy_shares * price
                    
                    if u["cash"] < cost:
                        buy_shares = int(np.floor(u["cash"] / (price * 100))) * 100
                        cost = buy_shares * price
                    
                    if buy_shares > 0:
                        u["cash"] -= cost
                        
                        if not cur_h:
                            u["holdings"][ticker] = {
                                "ma_co_phieu": ticker,
                                "so_co_phieu": 0,
                                "gia_von": price,
                                "gia_hien_tai": price,
                                "shares_unlocked": 0,
                                "shares_t1": 0,
                                "shares_t2": 0
                            }
                            cur_h = u["holdings"][ticker]
                        
                        old_shares = cur_h["so_co_phieu"]
                        old_cost = old_shares * cur_h["gia_von"]
                        new_total_shares = old_shares + buy_shares
                        
                        cur_h["gia_von"] = (old_cost + cost) / new_total_shares
                        cur_h["so_co_phieu"] = new_total_shares
                        cur_h["shares_t2"] += buy_shares
                        cur_h["gia_hien_tai"] = price
                        
                        event = {
                            "date": date_str,
                            "ticker": ticker,
                            "action": "BUY",
                            "shares": buy_shares,
                            "price": price,
                            "total_cost": cost,
                            "buy_factor_pct": 100
                        }
                        u["trade_history"].append(event)
                        trade_orders_log.append({
                            "date": date_str,
                            "user_tier": u["user_tier"],
                            "capital_tier": cap,
                            "ticker": ticker,
                            "action": "BUY",
                            "shares": buy_shares,
                            "price": price,
                            "total_cost": cost,
                            "buy_factor_pct": 100
                        })

        # 3. Recalculate NAV and track daily capital history after trading
        for cap, u in users.items():
            total_stock_val = sum(
                h["so_co_phieu"] * h["gia_hien_tai"] for h in u["holdings"].values()
            )
            u["nav"] = u["cash"] + total_stock_val
            prev_nav = u["history_log"][-1]["nav"] if u["history_log"] else u["initial_capital"]
            daily_change = u["nav"] - prev_nav
            daily_change_pct = round((daily_change / prev_nav) * 100, 2) if prev_nav != 0 else 0.0
            delta_from_start = u["nav"] - u["initial_capital"]
            delta_pct_from_start = round((delta_from_start / u["initial_capital"]) * 100, 2)

            u["history_log"].append({
                "date": date_str,
                "nav": round(u["nav"], 0),
                "cash": round(u["cash"], 0),
                "stock_value": round(total_stock_val, 0),
                "daily_change": round(daily_change, 0),
                "daily_change_pct": daily_change_pct,
                "delta_from_start": round(delta_from_start, 0),
                "delta_pct_from_start": delta_pct_from_start,
                "buy_factor_pct": 100
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
            "holdings": holdings_list,
            "history": u["history_log"],
            "trade_history": u["trade_history"],
            "ai_predictions": ai_perf_log
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
    run_user_simulation(days_count=22, step_interval=1)

