import sys
import os
import pandas as pd
import numpy as np

sys.path.append(r'C:\Users\ADMIN\Desktop\AIQUANTUM\ai_core\model\PPO')
from ppo import load_data, AdvancedPortfolioEnv, allocate_portfolio_real
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize

def export_trade_history():
    returns_df, ai_features_df, strategies_features_df, weights_dim, tickers, num_strategies_features, dates = load_data()
    total_days = len(returns_df)
    test_ratio = 0.15
    test_size = int(total_days * test_ratio)
    test_start = total_days - test_size

    returns_test = returns_df.iloc[test_start:]
    ai_test = ai_features_df.iloc[test_start:]
    strategies_test = strategies_features_df.iloc[test_start:]
    dates_test = dates[test_start:]

    script_dir = r"C:\Users\ADMIN\Desktop\AIQUANTUM\ai_core\model\PPO"
    root_dir = os.path.abspath(os.path.join(script_dir, "..", ".."))
    model_dir = os.path.join(root_dir, "output", "ppo_model")
    
    model_name = "AI_Brain_v7_Seed6445_Profit_-9.19.zip"
    model_path = os.path.join(model_dir, model_name)
    env_path = os.path.join(model_dir, "vec_normalize.pkl")
    
    print(f"🔄 Đang kết xuất lịch sử giao dịch chi tiết cho {model_name}...")
    
    model = PPO.load(model_path)
    test_env = DummyVecEnv([lambda: AdvancedPortfolioEnv(
            returns_test, ai_test, strategies_test, weights_dim, num_strategies_features, tickers=tickers, dates=dates_test, is_test=False
        )])
    
    if os.path.exists(env_path):
        test_env = VecNormalize.load(env_path, test_env)
        test_env.training = False
        test_env.norm_reward = False

    obs = test_env.reset()
    done = [False]

    C_initial = 100_000_000.0
    cash = C_initial
    nav = C_initial
    holdings = {}

    history_records = []
    step_idx = 0
    
    while not done[0]:
        action, _states = model.predict(obs, deterministic=True)
        obs, reward, done, info = test_env.step(action)
        
        raw_action = np.clip(action[0], 0, 1)
        if np.sum(raw_action) > 1.0:
            raw_action = raw_action / np.sum(raw_action)
            
        strategies_live = strategies_test.iloc[[step_idx]]
        raw_prices = strategies_live.values[0].reshape(num_strategies_features, weights_dim).T[:, 2]
        current_prices_vnd = raw_prices * 1000.0
        price_dict = {tickers[i]: float(current_prices_vnd[i]) for i in range(weights_dim)}

        # Cập nhật Settlement
        total_stock_val = 0.0
        new_holdings = {}
        for ticker, h in holdings.items():
            cur_price = price_dict.get(ticker, h["gia_hien_tai"])
            h["gia_hien_tai"] = cur_price
            h["shares_unlocked"] += h["shares_t1"]
            h["shares_t1"] = h["shares_t2"]
            h["shares_t2"] = 0
            h["so_co_phieu"] = h["shares_unlocked"] + h["shares_t1"] + h["shares_t2"]
            
            if h["so_co_phieu"] > 0:
                total_stock_val += h["so_co_phieu"] * cur_price
                new_holdings[ticker] = h
        holdings = new_holdings
        nav = cash + total_stock_val

        # Sinh lệnh mua bán theo AI
        ai_alloc = allocate_portfolio_real(
            tickers=tickers,
            w=raw_action,
            p=raw_prices,
            C=nav,
            LOT_SIZE=100
        )
        
        target_shares_map = {rec['ma_co_phieu']: rec['so_co_phieu'] for rec in ai_alloc['allocations']}
        
        daily_trades = []
        
        # BÁN
        for ticker in list(holdings.keys()):
            cur_h = holdings[ticker]
            target_shares = target_shares_map.get(ticker, 0)
            if target_shares < cur_h["so_co_phieu"]:
                sell_shares = min(cur_h["so_co_phieu"] - target_shares, cur_h["shares_unlocked"])
                if sell_shares > 0:
                    cash += sell_shares * price_dict[ticker]
                    cur_h["so_co_phieu"] -= sell_shares
                    cur_h["shares_unlocked"] -= sell_shares
                    daily_trades.append(f"BÁN {sell_shares} {ticker}")
                    if cur_h["so_co_phieu"] == 0:
                        del holdings[ticker]
                        
        # MUA
        for rec in ai_alloc['allocations']:
            ticker = rec['ma_co_phieu']
            target_shares = rec['so_co_phieu']
            price = rec['gia_hien_tai']
            cur_h = holdings.get(ticker)
            current_shares = cur_h["so_co_phieu"] if cur_h else 0
            
            if target_shares > current_shares:
                buy_shares = target_shares - current_shares
                cost = buy_shares * price
                if cash < cost:
                    buy_shares = int(np.floor(cash / (price * 100))) * 100
                    cost = buy_shares * price
                    
                if buy_shares > 0:
                    cash -= cost
                    if not cur_h:
                        holdings[ticker] = {
                            "so_co_phieu": 0, "gia_von": price, "gia_hien_tai": price,
                            "shares_unlocked": 0, "shares_t1": 0, "shares_t2": 0
                        }
                        cur_h = holdings[ticker]
                        
                    new_total = cur_h["so_co_phieu"] + buy_shares
                    cur_h["gia_von"] = ((cur_h["so_co_phieu"] * cur_h["gia_von"]) + cost) / new_total
                    cur_h["so_co_phieu"] = new_total
                    cur_h["shares_t2"] += buy_shares
                    cur_h["gia_hien_tai"] = price
                    daily_trades.append(f"MUA {buy_shares} {ticker}")

        # Tính toán lại NAV cuối ngày
        total_stock_val = sum(h["so_co_phieu"] * h["gia_hien_tai"] for h in holdings.values())
        nav = cash + total_stock_val
        
        # Format holding details
        holding_str = " | ".join([f"{t}: {h['so_co_phieu']} cp" for t, h in holdings.items()])
        if not holding_str:
            holding_str = "Trống"
            
        trade_str = " ; ".join(daily_trades) if daily_trades else "Không giao dịch"
        
        current_date = dates_test[step_idx]
        
        history_records.append({
            "Ngày": current_date,
            "NAV (VNĐ)": round(nav, 0),
            "Tiền mặt (VNĐ)": round(cash, 0),
            "Giá trị Cổ phiếu (VNĐ)": round(total_stock_val, 0),
            "Hành động": trade_str,
            "Danh mục đang giữ": holding_str
        })
        
        step_idx += 1

    df_history = pd.DataFrame(history_records)
    out_file = os.path.join(root_dir, "output", "Seed6445_Detailed_History.csv")
    df_history.to_csv(out_file, index=False, encoding='utf-8-sig')
    print(f"✅ Đã xuất lịch sử chi tiết tại: {out_file}")

if __name__ == "__main__":
    export_trade_history()
