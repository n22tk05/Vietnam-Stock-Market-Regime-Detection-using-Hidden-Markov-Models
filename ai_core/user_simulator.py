import sys
import os
import json
import random
import pandas as pd
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')
os.environ["PYTHONIOENCODING"] = "utf-8"

script_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(script_dir, ".."))
ppo_dir = os.path.join(script_dir, "model", "PPO")

for p in [root_dir, script_dir, ppo_dir]:
    if p not in sys.path:
        sys.path.append(p)

try:
    import ppo
    from ppo import load_data, AdvancedPortfolioEnv, allocate_portfolio_real
except ImportError:
    from ai_core.model.PPO import ppo, load_data, AdvancedPortfolioEnv, allocate_portfolio_real

from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv
from ai_core.helper.circuit_breaker import get_circuit_breaker_flags

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

CAPITAL_TIERS = [10_000_000, 20_000_000, 100_000_000]

def run_user_simulation(days_count=45, update_frequency=5, seed=42):
    """
    Mô phỏng 3 User Tiers (10M, 20M, 100M) kết hợp cơ chế Continuous Learning:
    - Sử dụng Model PPO v8 tối ưu với cơ chế tự học (Rolling Retraining) định kỳ.
    - Áp dụng Circuit Breaker (Kill-Switch) bảo vệ vốn khi thị trường rủi ro cao.
    - Lọc Top 3 cổ phiếu mạnh nhất (Top-N Stocks) để tập trung sức mua.
    - Mô phỏng chu kỳ thanh toán T+2.5, lô 100 cổ phiếu, phí thuế và giá vốn bình quân gia quyền.
    - Xuất dữ liệu riêng biệt cho 3 User ra 3 tệp JSON và đồng bộ Frontend.
    """
    random.seed(seed)
    np.random.seed(seed)
    print(f"🚀 Khởi động User Portfolio Simulation Engine với Continuous Learning...")
    
    # 1. Xác định Model PPO tối ưu
    model_dir = os.path.join(script_dir, "output", "ppo_model")
    model_name = "AI_Brain_v8_Seed946_Profit_51.07.zip"
    model_path = os.path.join(model_dir, model_name)
    if not os.path.exists(model_path):
        model_name = "AI_Brain.zip"
        model_path = os.path.join(model_dir, model_name)
        
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Không tìm thấy model tại {model_path}")
        
    print(f" [+] Sử dụng Model Não Bộ AI: {model_name}")
    sys.modules['__main__'].AdvancedTickerExtractor = ppo.AdvancedTickerExtractor
    temp_model = PPO.load(model_path)
    expected_shape = temp_model.observation_space.shape[1]
    
    # 2. Nạp dữ liệu thị trường tương thích với số features của Model
    print(f" [+] Nạp dữ liệu thị trường (Macro Mode: {expected_shape})...")
    returns_df, ai_features_df, strategies_features_df, weights_dim, tickers, num_strategies_features, dates = load_data(macro_mode=expected_shape)
    
    total_days = len(dates)
    test_size = days_count if (days_count and days_count < total_days) else int(total_days * 0.1)
    test_start = total_days - test_size
    
    returns_test = returns_df.iloc[test_start:]
    ai_test = ai_features_df.iloc[test_start:]
    strategies_test = strategies_features_df.iloc[test_start:]
    dates_test = dates[test_start:]
    
    # Lấy cờ ngắt mạch thị trường (Circuit Breaker)
    circuit_breaker_flags = get_circuit_breaker_flags(dates_test)
    
    # Khởi tạo môi trường Test liên tục (Sequential Environment)
    test_env = DummyVecEnv([lambda: AdvancedPortfolioEnv(
        returns_test, ai_test, strategies_test, weights_dim, num_strategies_features,
        tickers=tickers, dates=dates_test, is_test=True, initial_capital=20_000_000.0
    )])
    
    # Load model tươi mới sẵn sàng giao dịch
    model = PPO.load(model_path)
    
    # 3. Khởi tạo 3 tài khoản người dùng độc lập (10M, 20M, 100M)
    users = {}
    for cap in CAPITAL_TIERS:
        tier_label = f"{int(cap / 1_000_000)}M"
        users[cap] = {
            "user_tier": tier_label,
            "initial_capital": cap,
            "cash": float(cap),
            "nav": float(cap),
            "holdings": {},
            "history_log": [],
            "trade_history": []
        }
        
    trade_orders_log = []
    ai_perf_log = []
    
    obs = test_env.reset()
    done = [False]
    step_idx = 0
    
    print(f"[*] Bắt đầu mô phỏng {test_size} phiên giao dịch ({dates_test[0]} -> {dates_test[-1]})...")
    
    while not done[0] and step_idx < len(dates_test):
        date_str = dates_test[step_idx]
        
        # Dự báo hành động phân bổ từ AI Model
        action, _states = model.predict(obs, deterministic=True)
        obs, reward, done, info = test_env.step(action)
        raw_action = np.clip(action[0], 0, 1)
        
        # --- Kill-switch & Phân bổ Top 3 Cổ phiếu theo Continuous Learning ---
        hold_cash_today = circuit_breaker_flags[step_idx] if step_idx < len(circuit_breaker_flags) else False
        if hold_cash_today:
            raw_action = np.zeros_like(raw_action)
        else:
            TOP_N_STOCKS = 3
            if TOP_N_STOCKS is not None and TOP_N_STOCKS < len(raw_action):
                top_n_indices = np.argsort(raw_action)[-TOP_N_STOCKS:]
                mask = np.ones(len(raw_action), dtype=bool)
                mask[top_n_indices] = False
                raw_action[mask] = 0.0
            current_sum = np.sum(raw_action)
            if current_sum > 0:
                raw_action = raw_action / current_sum
                
        # Lấy giá thực tế trong phiên
        strategies_live = strategies_test.iloc[[step_idx]]
        raw_prices = strategies_live.values[0].reshape(num_strategies_features, weights_dim).T[:, 2]
        current_prices_vnd = raw_prices * 1000.0
        price_dict = {tickers[i]: float(current_prices_vnd[i]) for i in range(weights_dim)}
        
        # Ghi nhận hiệu suất AI dự phóng
        top_indices = np.argsort(raw_action)[::-1][:3]
        top_tickers = [f"{tickers[i]} ({raw_action[i]*100:.1f}%)" for i in top_indices if raw_action[i] > 0.01]
        top_tickers_str = ", ".join(top_tickers) if top_tickers else "Tiền mặt (100%)"
        
        ai_perf_log.append({
            "date": date_str,
            "top_tickers": top_tickers_str,
            "hold_cash": bool(hold_cash_today)
        })
        
        # 1. Cập nhật thanh toán T+2.5 và giá thị trường cho từng User
        for cap, u in users.items():
            holdings = u["holdings"]
            new_holdings = {}
            total_stock_val = 0.0
            
            for ticker, h in holdings.items():
                cur_price = price_dict.get(ticker, h["gia_hien_tai"])
                h["gia_hien_tai"] = cur_price
                
                # Tiến chuyển hàng đợi thanh toán T+
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

        # 2. Thực thi lệnh phân bổ (Bán trước -> Mua sau) cho từng User
        for cap, u in users.items():
            ai_alloc = allocate_portfolio_real(
                tickers=tickers,
                w=raw_action,
                p=raw_prices,
                C=u["nav"],
                LOT_SIZE=100
            )
            target_shares_map = {rec['ma_co_phieu']: rec['so_co_phieu'] for rec in ai_alloc['allocations']}
            
            # Step 2a. Thực thi lệnh BÁN trước (giải phóng tiền mặt)
            for ticker in list(u["holdings"].keys()):
                cur_h = u["holdings"][ticker]
                target_shares = target_shares_map.get(ticker, 0)
                current_shares = cur_h["so_co_phieu"]
                
                if target_shares < current_shares:
                    sell_shares = min(current_shares - target_shares, cur_h["shares_unlocked"])
                    if sell_shares > 0:
                        price = price_dict[ticker]
                        gross_revenue = sell_shares * price
                        fee = gross_revenue * 0.001 # Phí GD 0.1%
                        net_revenue = gross_revenue - fee
                        
                        gia_von = cur_h["gia_von"]
                        lai_lo_pct = round(((price - gia_von) / gia_von) * 100, 2) if gia_von > 0 else 0.0
                        loai_lenh = "CHỐT LỜI" if lai_lo_pct > 0 else "CẮT LỖ"
                        
                        cur_h["so_co_phieu"] -= sell_shares
                        cur_h["shares_unlocked"] -= sell_shares
                        u["cash"] += net_revenue
                        
                        trade_event = {
                            "date": date_str,
                            "ticker": ticker,
                            "action": "SELL",
                            "order_type": loai_lenh,
                            "shares": sell_shares,
                            "price": price,
                            "total_cost": -gross_revenue,
                            "fee": round(fee, 0),
                            "pnl_pct": lai_lo_pct
                        }
                        u["trade_history"].append(trade_event)
                        trade_orders_log.append({
                            **trade_event,
                            "user_tier": u["user_tier"],
                            "capital_tier": cap
                        })
                        
                        if cur_h["so_co_phieu"] == 0:
                            del u["holdings"][ticker]
                            
            # Step 2b. Thực thi lệnh MUA sau
            for rec in ai_alloc['allocations']:
                ticker = rec['ma_co_phieu']
                target_shares = rec['so_co_phieu']
                price = rec['gia_hien_tai']
                
                cur_h = u["holdings"].get(ticker)
                current_shares = cur_h["so_co_phieu"] if cur_h else 0
                
                if target_shares > current_shares:
                    buy_shares = target_shares - current_shares
                    cost_with_fee = buy_shares * price * 1.001 # Giá vốn kèm phí 0.1%
                    
                    # Kiểm tra sức mua tiền mặt theo lô 100
                    if u["cash"] < cost_with_fee:
                        buy_shares = int(np.floor(u["cash"] / (price * 1.001 * 100))) * 100
                        cost_with_fee = buy_shares * price * 1.001
                        
                    if buy_shares > 0:
                        fee = buy_shares * price * 0.001
                        u["cash"] -= cost_with_fee
                        
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
                        old_total_cost = old_shares * cur_h["gia_von"]
                        new_total_shares = old_shares + buy_shares
                        
                        # Tính giá vốn bình quân gia quyền
                        cur_h["gia_von"] = round((old_total_cost + (buy_shares * price)) / new_total_shares, 2)
                        cur_h["so_co_phieu"] = new_total_shares
                        cur_h["shares_t2"] += buy_shares
                        cur_h["gia_hien_tai"] = price
                        
                        trade_event = {
                            "date": date_str,
                            "ticker": ticker,
                            "action": "BUY",
                            "order_type": "MUA",
                            "shares": buy_shares,
                            "price": price,
                            "total_cost": buy_shares * price,
                            "fee": round(fee, 0),
                            "pnl_pct": 0.0
                        }
                        u["trade_history"].append(trade_event)
                        trade_orders_log.append({
                            **trade_event,
                            "user_tier": u["user_tier"],
                            "capital_tier": cap
                        })
                        
        # 3. Tính toán lại NAV cuối ngày và ghi log biến động
        for cap, u in users.items():
            total_stock_val = sum(h["so_co_phieu"] * h["gia_hien_tai"] for h in u["holdings"].values())
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
                "delta_pct_from_start": delta_pct_from_start
            })
            
        step_idx += 1
        
        # ==============================================================
        # 4. CONTINUOUS LEARNING: Tự học rút kinh nghiệm định kỳ (5 phiên)
        # ==============================================================
        if update_frequency and step_idx % update_frequency == 0 and not done[0]:
            print(f"⏳ [Phiên {step_idx}/{len(dates_test)}] Continuous Learning: Tự học thích nghi 200 phiên gần nhất...")
            current_global_idx = test_start + step_idx
            train_start_idx = max(0, current_global_idx - 200)
            
            roll_returns = returns_df.iloc[train_start_idx:current_global_idx]
            roll_ai = ai_features_df.iloc[train_start_idx:current_global_idx]
            roll_strat = strategies_features_df.iloc[train_start_idx:current_global_idx]
            roll_dates = dates[train_start_idx:current_global_idx]
            
            train_env_roll = DummyVecEnv([lambda: AdvancedPortfolioEnv(
                roll_returns, roll_ai, roll_strat, weights_dim, num_strategies_features,
                tickers=tickers, dates=roll_dates
            )])
            model.set_env(train_env_roll)
            model.learn(total_timesteps=1024, reset_num_timesteps=False)
            model.set_env(test_env)

    # 5. Xuất dữ liệu độc lập cho 3 User Tiers
    simulated_users_data = {}
    print("\n" + "="*80)
    print("🏆 KẾT QUẢ MÔ PHỎNG 3 TÀI KHOẢN NGƯỜI DÙNG (CONTINUOUS LEARNING)")
    print("="*80)
    
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
        pnl_pct = round((pnl_cash / u["initial_capital"]) * 100, 2)
        
        tier_data = {
            "user_tier": u["user_tier"],
            "initial_capital": u["initial_capital"],
            "current_nav": round(u["nav"], 0),
            "cash_left": round(u["cash"], 0),
            "pnl_cash": round(pnl_cash, 0),
            "pnl_pct": pnl_pct,
            "holdings": holdings_list,
            "history": u["history_log"],
            "trade_history": u["trade_history"],
            "ai_predictions": ai_perf_log
        }
        
        tier_key = f"tier_{int(cap/1000000)}m"
        simulated_users_data[tier_key] = tier_data
        
        # Lưu file JSON riêng cho từng User
        user_json_file = f"simulated_user_{int(cap/1000000)}m.json"
        user_json_path = os.path.join(script_dir, user_json_file)
        with open(user_json_path, "w", encoding="utf-8") as f:
            json.dump(tier_data, f, ensure_ascii=False, indent=2, cls=NumpyEncoder)
            
        print(f"💰 Tài Khoản {u['user_tier']}: Vốn {u['initial_capital']:,.0f} đ -> NAV: {u['nav']:,.0f} đ (PnL: {pnl_pct:+.2f}%)")
        print(f"   [+] JSON Saved: {user_json_path} ({len(holdings_list)} mã CP, {len(u['trade_history'])} lệnh)")

    # Lưu file tổng hợp
    cons_json_path = os.path.join(script_dir, "simulated_users.json")
    with open(cons_json_path, "w", encoding="utf-8") as f:
        json.dump(simulated_users_data, f, ensure_ascii=False, indent=2, cls=NumpyEncoder)
        
    df_trades = pd.DataFrame(trade_orders_log)
    csv_path = os.path.join(script_dir, "user_trade_history.csv")
    df_trades.to_csv(csv_path, index=False, encoding='utf-8-sig')
    
    # 6. Đồng bộ sang Frontend public
    frontend_public = os.path.abspath(os.path.join(script_dir, "..", "frontend", "public"))
    os.makedirs(frontend_public, exist_ok=True)
    
    fe_cons_json = os.path.join(frontend_public, "simulated_users.json")
    with open(fe_cons_json, "w", encoding="utf-8") as f:
        json.dump(simulated_users_data, f, ensure_ascii=False, indent=2, cls=NumpyEncoder)
        
    fe_csv = os.path.join(frontend_public, "user_trade_history.csv")
    df_trades.to_csv(fe_csv, index=False, encoding='utf-8-sig')
    
    for cap in CAPITAL_TIERS:
        tier_file = f"simulated_user_{int(cap/1000000)}m.json"
        fe_tier_path = os.path.join(frontend_public, tier_file)
        with open(fe_tier_path, "w", encoding="utf-8") as f:
            json.dump(simulated_users_data[f"tier_{int(cap/1000000)}m"], f, ensure_ascii=False, indent=2, cls=NumpyEncoder)
            
    print(f"\n🌐 Đã đồng bộ sang Frontend public: 3 tệp JSON riêng, simulated_users.json & user_trade_history.csv")
    print("="*80)

if __name__ == "__main__":
    run_user_simulation(days_count=200, update_frequency=5)
