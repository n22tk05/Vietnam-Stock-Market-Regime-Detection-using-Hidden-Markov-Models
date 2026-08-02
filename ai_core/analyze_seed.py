import sys
import os
import pandas as pd
import numpy as np
import traceback

sys.stdout.reconfigure(encoding='utf-8')

sys.path.append(r'C:\Users\ADMIN\Desktop\AIQUANTUM\ai_core\model\PPO')
from ppo import load_data, AdvancedPortfolioEnv, allocate_portfolio_real
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize

def calc_metrics(returns):
    cum_ret = (1 + returns).cumprod()
    total_return = cum_ret.iloc[-1] - 1
    annualized_return = (1 + total_return)**(252 / len(returns)) - 1
    sharpe_ratio = np.sqrt(252) * (returns.mean() / returns.std()) if returns.std() != 0 else 0

    rolling_max = cum_ret.cummax()
    drawdowns = (cum_ret - rolling_max) / rolling_max
    max_drawdown = drawdowns.min()

    win_rate = (returns > 0).mean()
    return total_return, annualized_return, sharpe_ratio, max_drawdown, win_rate

def analyze_model_allocations():
    returns_df, ai_features_df, strategies_features_df, weights_dim, tickers, num_strategies_features, dates = load_data()
    total_days = len(returns_df)
    n_tradings = 200
    ratio_tradings = n_tradings / total_days
    test_size = int(total_days * ratio_tradings)
    test_start = total_days - test_size

    returns_test = returns_df.iloc[test_start:]
    ai_test = ai_features_df.iloc[test_start:]
    strategies_test = strategies_features_df.iloc[test_start:]
    dates_test = dates[test_start:]

    script_dir = r"C:\Users\ADMIN\Desktop\AIQUANTUM\ai_core\model\PPO"
    root_dir = os.path.abspath(os.path.join(script_dir, "..", ".."))
    model_dir = os.path.join(root_dir, "output", "ppo_model")
    
    # Target model
    model_name = "AI_Brain_v8_Seed946_Profit_51.07.zip"
    model_path = os.path.join(model_dir, model_name)
    env_path = os.path.join(model_dir, "vec_normalize.pkl")
    
    print(f"🔄 Đang nạp bộ não từ {model_name} để phân tích hành vi...")
    
    try:
        model = PPO.load(model_path)
        test_env = DummyVecEnv([lambda: AdvancedPortfolioEnv(
                returns_test, ai_test, strategies_test, weights_dim, num_strategies_features, tickers=tickers, dates=dates_test, is_test=True
            )])
        
        if os.path.exists(env_path):
            test_env = VecNormalize.load(env_path, test_env)
            test_env.training = True  # Rolling update
            test_env.norm_reward = False

        obs = test_env.reset()
        done = [False]
        
        action_history = []
        portfolio_returns = []
        benchmark_returns = []

        C_initial = 100_000_000.0
        cash = C_initial
        nav = C_initial
        prev_nav = C_initial
        holdings = {}

        step_idx = 0
        
        while not done[0]:
            action, _states = model.predict(obs, deterministic=True)
            obs, reward, done, info = test_env.step(action)
            action_history.append(action[0])
            
            raw_action = np.clip(action[0], 0, 1)
            
            # Tính tổng tỷ trọng AI muốn giải ngân
            intended_investment = min(1.0, np.sum(raw_action))
            
            # CẤU HÌNH SỐ LƯỢNG MÃ TỐI ĐA (Giả lập cho Ví thực)
            TOP_N_STOCKS = 5
            if TOP_N_STOCKS is not None and TOP_N_STOCKS < len(raw_action):
                top_n_indices = np.argsort(raw_action)[-TOP_N_STOCKS:]
                mask = np.ones(len(raw_action), dtype=bool)
                mask[top_n_indices] = False
                raw_action[mask] = 0.0
                
            # Chuẩn hóa lại tỷ trọng của Top 5 sao cho tổng bằng đúng 100% (1.0)
            current_sum = np.sum(raw_action)
            if current_sum > 0:
                raw_action = raw_action / current_sum
                
            strategies_live = strategies_test.iloc[[step_idx]]
            raw_prices = strategies_live.values[0].reshape(num_strategies_features, weights_dim).T[:, 2]
            current_prices_vnd = raw_prices * 1000.0
            price_dict = {tickers[i]: float(current_prices_vnd[i]) for i in range(weights_dim)}

            # 1. Cập nhật ngày T+
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

            # 2. Allocate
            ai_alloc = allocate_portfolio_real(
                tickers=tickers, w=raw_action, p=raw_prices, C=nav, LOT_SIZE=100
            )
            
            target_shares_map = {rec['ma_co_phieu']: rec['so_co_phieu'] for rec in ai_alloc['allocations']}
            
            for ticker in list(holdings.keys()):
                cur_h = holdings[ticker]
                target_shares = target_shares_map.get(ticker, 0)
                if target_shares < cur_h["so_co_phieu"]:
                    sell_shares = min(cur_h["so_co_phieu"] - target_shares, cur_h["shares_unlocked"])
                    if sell_shares > 0:
                        gross_proceeds = sell_shares * price_dict[ticker]
                        net_proceeds = gross_proceeds * (1 - 0.001)  # Phí bán 0.1%
                        cash += net_proceeds
                        cur_h["so_co_phieu"] -= sell_shares
                        cur_h["shares_unlocked"] -= sell_shares
                        if cur_h["so_co_phieu"] == 0:
                            del holdings[ticker]
                            
            for rec in ai_alloc['allocations']:
                ticker = rec['ma_co_phieu']
                target_shares = rec['so_co_phieu']
                price = rec['gia_hien_tai']
                cur_h = holdings.get(ticker)
                current_shares = cur_h["so_co_phieu"] if cur_h else 0
                
                if target_shares > current_shares:
                    buy_shares = target_shares - current_shares
                    cost = buy_shares * price * (1 + 0.001)  # Phí mua 0.1%
                    if cash < cost:
                        buy_shares = int(np.floor(cash / (price * (1 + 0.001) * 100))) * 100
                        cost = buy_shares * price * (1 + 0.001)
                        
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

            total_stock_val = sum(h["so_co_phieu"] * h["gia_hien_tai"] for h in holdings.values())
            nav = cash + total_stock_val
            
            if step_idx > 0:
                ret = (nav / prev_nav) - 1
                portfolio_returns.append(ret)
            else:
                portfolio_returns.append(0.0)
                
            bm_ret = np.mean(returns_test.iloc[step_idx].values)
            benchmark_returns.append(bm_ret)
            
            prev_nav = nav
            step_idx += 1
            
        action_df = pd.DataFrame(action_history, columns=tickers, index=dates_test[:len(action_history)])
        action_df = action_df.loc[:, action_df.max() > 0.01]
        mean_alloc = action_df.mean().sort_values(ascending=False)
        
        action_df['CASH'] = 1.0 - action_df.sum(axis=1)
        action_df['CASH'] = action_df['CASH'].clip(lower=0)
        cash_holdings = action_df['CASH'].mean()
        turnover_rate = action_df.drop(columns=['CASH']).diff().abs().sum(axis=1).mean()
        
        perf_df = pd.DataFrame({
            'Real_Simulation': portfolio_returns,
            'Benchmark_EQ': benchmark_returns
        })
        ai_tot, ai_ann, ai_sharpe, ai_mdd, ai_win = calc_metrics(perf_df['Real_Simulation'])
        bm_tot, bm_ann, bm_sharpe, bm_mdd, bm_win = calc_metrics(perf_df['Benchmark_EQ'])
        
        cov = np.cov(perf_df['Real_Simulation'], perf_df['Benchmark_EQ'])[0][1]
        var = np.var(perf_df['Benchmark_EQ'])
        beta = cov / var if var > 0 else 1
        alpha = ai_ann - (beta * bm_ann)
        
        print("\n=========================================================")
        print("🔍 PHÂN TÍCH HÀNH VI: AI YÊU THÍCH CỔ PHIẾU NÀO NHẤT?")
        print("=========================================================")
        print(mean_alloc.head(10).apply(lambda x: f"{x*100:.2f}%").to_string())
        
        start_date_str = dates_test[0]
        end_date_str = dates_test[len(portfolio_returns)-1]
        
        print("\n=========================================================")
        print("💡 ĐÁNH GIÁ PHONG CÁCH & HIỆU SUẤT GIAO DỊCH (SEED 6445)")
        print("=========================================================")
        print(f"🕒 Khoảng thời gian:      {start_date_str} đến {end_date_str} ({len(portfolio_returns)} phiên)")
        print(f"💰 Số Tiền Ban Đầu:       {C_initial:,.0f} VNĐ")
        print(f"💰 Số Tiền NAV Cuối:      {nav:,.0f} VNĐ")
        print(f"📈 Tốc độ xoay vòng vốn:  {turnover_rate*100:.2f}% / ngày")
        print(f"💵 Tiền mặt trung bình:   {cash_holdings*100:.2f}%")
        print("---------------------------------------------------------")
        print(f"📊 Tổng Lợi Nhuận:        {ai_tot*100:.2f}%")
        print(f"📊 Lợi Nhuận Quy Năm:     {ai_ann*100:.2f}%")
        print(f"📊 Sharpe Ratio:          {ai_sharpe:.3f}")
        print(f"📊 Max Drawdown:          {ai_mdd*100:.2f}%")
        print("---------------------------------------------------------")
        print(f"⚖️ Alpha (Năng lực AI):   {alpha*100:.2f}% (Vượt trội so với Benchmark)")
        print(f"⚖️ Beta (Độ nhạy Market): {beta:.3f}")
        print("=========================================================")
        
    except Exception as e:
        print(f"Lỗi: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    analyze_model_allocations()
