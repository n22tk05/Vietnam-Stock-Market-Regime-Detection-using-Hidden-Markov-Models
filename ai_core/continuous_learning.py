import sys
import os
import pandas as pd
import numpy as np
import traceback

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(r'C:\Users\ADMIN\Desktop\AIQUANTUM\ai_core\model\PPO')
from ppo import load_data, AdvancedPortfolioEnv, allocate_portfolio_real
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv

sys.path.append(r'C:\Users\ADMIN\Desktop\AIQUANTUM')
from ai_core.helper.circuit_breaker import get_circuit_breaker_flags

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

def run_continuous_learning():
    # 1. Khởi tạo dữ liệu
    print("🔄 Nạp dữ liệu thị trường...")
    returns_df, ai_features_df, strategies_features_df, weights_dim, tickers, num_strategies_features, dates = load_data(macro_mode=50)
    
    script_dir = r"C:\Users\ADMIN\Desktop\AIQUANTUM\ai_core\model\PPO"
    root_dir = os.path.abspath(os.path.join(script_dir, "..", ".."))
    model_dir = os.path.join(root_dir, "output", "ppo_model")
    
    model_name = "AI_Brain_v8_Seed946_Profit_51.07.zip"
    model_path = os.path.join(model_dir, model_name)
    
    try:
        # Load Model Gốc để lấy số nơ-ron
        temp_model = PPO.load(model_path)
        expected_shape = temp_model.observation_space.shape[1]
        
        if expected_shape == 44:
            _, ai_features_df, _, _, _, _, _ = load_data(macro_mode=44)
        elif expected_shape == 47:
            _, ai_features_df, _, _, _, _, _ = load_data(macro_mode=47)
            
        total_days = len(returns_df)
        test_size = int(total_days * 0.1)
        test_start = total_days - test_size

        # Dữ liệu Test
        returns_test = returns_df.iloc[test_start:]
        ai_test = ai_features_df.iloc[test_start:]
        strategies_test = strategies_features_df.iloc[test_start:]
        dates_test = dates[test_start:]
        circuit_breaker_flags = get_circuit_breaker_flags(dates_test)

        test_env = DummyVecEnv([lambda: AdvancedPortfolioEnv(
                returns_test, ai_test, strategies_test, weights_dim, num_strategies_features, tickers=tickers, dates=dates_test, is_test=True
            )])

        print(f"🚀 BẮT ĐẦU MÔ PHỎNG CONTINUOUS LEARNING VỚI MODEL: {model_name}")
        print("Cơ chế: Mỗi 20 ngày (1 tháng), AI sẽ dừng lại, đọc lại dữ liệu 200 ngày gần nhất và tự cập nhật não bộ (Retraining).")
        
        # Load lại model tươi mới để chạy
        model = PPO.load(model_path)
        
        obs = test_env.reset()
        done = [False]
        
        portfolio_returns = []
        benchmark_returns = []

        C_initial = 100_000_000.0
        cash = C_initial
        nav = C_initial
        prev_nav = C_initial
        holdings = {}

        step_idx = 0
        update_frequency = 5 # Cứ 20 ngày giao dịch (1 tháng) thì học lại 1 lần
        
        start_date_str = dates_test[0]
        end_date_str = dates_test[len(portfolio_returns)-1]
        while not done[0]:
            # Đánh giá (Predict) như bình thường
            action, _states = model.predict(obs, deterministic=True)
            obs, reward, done, info = test_env.step(action)
            raw_action = np.clip(action[0], 0, 1)
            
            # --- Kill-switch & Portfolio Allocation Logic (Rút gọn để mô phỏng NAV) ---
            hold_cash_today = circuit_breaker_flags[step_idx]
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
                
            strategies_live = strategies_test.iloc[[step_idx]]
            raw_prices = strategies_live.values[0].reshape(num_strategies_features, weights_dim).T[:, 2]
            current_prices_vnd = raw_prices * 1000.0
            price_dict = {tickers[i]: float(current_prices_vnd[i]) for i in range(weights_dim)}

            # T+ Update
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

            # Phân bổ
            ai_alloc = allocate_portfolio_real(tickers=tickers, w=raw_action, p=raw_prices, C=nav, LOT_SIZE=100)
            target_shares_map = {rec['ma_co_phieu']: rec['so_co_phieu'] for rec in ai_alloc['allocations']}
            
            # Bán
            for ticker in list(holdings.keys()):
                cur_h = holdings[ticker]
                target_shares = target_shares_map.get(ticker, 0)
                if target_shares < cur_h["so_co_phieu"]:
                    sell_shares = min(cur_h["so_co_phieu"] - target_shares, cur_h["shares_unlocked"])
                    if sell_shares > 0:
                        gross_proceeds = sell_shares * price_dict[ticker]
                        fee = gross_proceeds * 0.001
                        cash += (gross_proceeds - fee)
                        cur_h["so_co_phieu"] -= sell_shares
                        cur_h["shares_unlocked"] -= sell_shares
                        if cur_h["so_co_phieu"] == 0:
                            del holdings[ticker]
                            
            # Mua
            for rec in ai_alloc['allocations']:
                ticker = rec['ma_co_phieu']
                target_shares = rec['so_co_phieu']
                price = rec['gia_hien_tai']
                cur_h = holdings.get(ticker)
                current_shares = cur_h["so_co_phieu"] if cur_h else 0
                
                if target_shares > current_shares:
                    buy_shares = target_shares - current_shares
                    cost = buy_shares * price * 1.001
                    if cash < cost:
                        buy_shares = int(np.floor(cash / (price * 1.001 * 100))) * 100
                        cost = buy_shares * price * 1.001
                    if buy_shares > 0:
                        cash -= cost
                        if not cur_h:
                            holdings[ticker] = {"so_co_phieu": 0, "gia_von": price, "gia_hien_tai": price, "shares_unlocked": 0, "shares_t1": 0, "shares_t2": 0}
                            cur_h = holdings[ticker]
                        cur_h["so_co_phieu"] += buy_shares
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
            
            # ==========================================
            # CONTINUOUS LEARNING LOGIC (TỰ HỌC CUỐI THÁNG)
            # ==========================================
            if step_idx % update_frequency == 0 and not done[0]:
                print(f"⏳ [Ngày {step_idx}/{len(dates_test)}] Đang tự học rút kinh nghiệm từ tháng vừa qua...")
                
                # Tạo môi trường học cho 200 ngày gần nhất (Rolling Window)
                current_global_idx = test_start + step_idx
                train_start_idx = max(0, current_global_idx - 200)
                
                roll_returns = returns_df.iloc[train_start_idx:current_global_idx]
                roll_ai = ai_features_df.iloc[train_start_idx:current_global_idx]
                roll_strat = strategies_features_df.iloc[train_start_idx:current_global_idx]
                roll_dates = dates[train_start_idx:current_global_idx]
                
                # Khởi tạo môi trường Train siêu nhỏ
                train_env_roll = DummyVecEnv([lambda: AdvancedPortfolioEnv(
                    roll_returns, roll_ai, roll_strat, weights_dim, num_strategies_features, tickers=tickers, dates=roll_dates
                )])
                
                # Cho model cắm vào môi trường này và học 1024 steps
                model.set_env(train_env_roll)
                model.learn(total_timesteps=1024, reset_num_timesteps=False)
                
                # Trả lại môi trường Test để đi thi tiếp
                model.set_env(test_env)
                print(f"✅ Hoàn tất cập nhật kiến thức! Sẵn sàng giao dịch tháng tiếp theo.")

        # HẾT VÒNG LẶP TEST
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
        print("🏆 KẾT QUẢ CỦA CONTINUOUS LEARNING BOT (TỰ HỌC CUỐN CHIẾU)")
        print("=========================================================")
        print(f"🕒 Khoảng thời gian:      {start_date_str} đến {end_date_str} ({len(portfolio_returns)} phiên)")
        print(f"💰 Số Tiền Ban Đầu:       {C_initial:,.0f} VNĐ")
        print(f"💰 Số Tiền NAV Cuối:      {nav:,.0f} VNĐ")
        print("---------------------------------------------------------")
        print(f"📊 Tổng Lợi Nhuận:        {ai_tot*100:.2f}%")
        print(f"📊 Sharpe Ratio:          {ai_sharpe:.3f}")
        print(f"📊 Max Drawdown:          {ai_mdd*100:.2f}%")
        print("---------------------------------------------------------")
        print(f"⚖️ Alpha (Năng lực AI):   {alpha*100:.2f}%")
        print("=========================================================")
            
    except Exception as e:
        print(f"Lỗi: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    run_continuous_learning()
