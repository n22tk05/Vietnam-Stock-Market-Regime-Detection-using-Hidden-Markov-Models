import numpy as np
import pandas as pd
import warnings
import traceback
import sys
import os
import glob

from ppo import load_data, AdvancedPortfolioEnv, allocate_portfolio_real, CONFIG
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from stable_baselines3 import PPO

warnings.filterwarnings('ignore')

if __name__ == "__main__":
    returns_df, ai_features_df, strategies_features_df, weights_dim, tickers, num_strategies_features, dates = load_data()

    try:
        total_days = len(returns_df)
        # Sử dụng 22 phiên cuối cùng để backtest
        n_tradings = 22
        ratio_tradings = n_tradings / total_days
        test_size = int(total_days * ratio_tradings)
        test_start = total_days - test_size

        returns_test = returns_df.iloc[test_start:]
        ai_test = ai_features_df.iloc[test_start:]
        strategies_test = strategies_features_df.iloc[test_start:]
        dates_test = dates[test_start:]

        script_dir = os.path.dirname(os.path.abspath(__file__))
        root_dir = os.path.abspath(os.path.join(script_dir, "..", ".."))
        
        # Thư mục chứa các model
        model_dir = os.path.join(root_dir, "output", "ppo_model")
        env_path = os.path.join(model_dir, "vec_normalize.pkl")
        
        # Tìm tất cả các file .zip trong thư mục ppo_model
        model_files = glob.glob(os.path.join(model_dir, "*.zip"))
        
        if not model_files:
            print("❌ Không tìm thấy model nào trong thư mục:", model_dir)
            sys.exit(1)
            
        print(f"🔍 Tìm thấy {len(model_files)} models để đánh giá.")
        print("💡 CHẾ ĐỘ: Đánh giá bằng Giả lập Thực tế (T+2.5, Khớp Lô 100, Tiền mặt giới hạn)")
        
        results = []

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

        for model_path in model_files:
            model_name = os.path.basename(model_path)
            print(f"\n🔄 Đang giả lập thực chiến model: {model_name} ...")
            try:
                model = PPO.load(model_path)

                test_env = DummyVecEnv([lambda: AdvancedPortfolioEnv(
                        returns_test, ai_test, strategies_test, weights_dim, num_strategies_features, tickers=tickers, dates=dates_test, is_test=True
                    )])
                
                if os.path.exists(env_path):
                    test_env = VecNormalize.load(env_path, test_env)
                    test_env.training = True  # Cho phép VecNormalize cập nhật liên tục (Rolling Online Learning)
                    test_env.norm_reward = False

                obs = test_env.reset()
                done = [False]

                portfolio_returns = []
                benchmark_returns = []

                # --- SIMULATION STATE ---
                C_initial = 100_000_000.0
                cash = C_initial
                nav = C_initial
                prev_nav = C_initial
                holdings = {}

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

                    # 1. Cập nhật ngày T+ và giá
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

                    # 2. Sinh lệnh mua bán dựa theo AI
                    ai_alloc = allocate_portfolio_real(
                        tickers=tickers,
                        w=raw_action,
                        p=raw_prices,
                        C=nav,
                        LOT_SIZE=100
                    )
                    
                    target_shares_map = {rec['ma_co_phieu']: rec['so_co_phieu'] for rec in ai_alloc['allocations']}
                    
                    # 2a. Thực thi lệnh BÁN
                    for ticker in list(holdings.keys()):
                        cur_h = holdings[ticker]
                        target_shares = target_shares_map.get(ticker, 0)
                        if target_shares < cur_h["so_co_phieu"]:
                            sell_shares = min(cur_h["so_co_phieu"] - target_shares, cur_h["shares_unlocked"])
                            if sell_shares > 0:
                                gross_proceeds = sell_shares * price_dict[ticker]
                                # Phí bán = 0.1%
                                net_proceeds = gross_proceeds * (1 - 0.001)
                                cash += net_proceeds
                                cur_h["so_co_phieu"] -= sell_shares
                                cur_h["shares_unlocked"] -= sell_shares
                                if cur_h["so_co_phieu"] == 0:
                                    del holdings[ticker]
                                    
                    # 2b. Thực thi lệnh MUA
                    for rec in ai_alloc['allocations']:
                        ticker = rec['ma_co_phieu']
                        target_shares = rec['so_co_phieu']
                        price = rec['gia_hien_tai']
                        cur_h = holdings.get(ticker)
                        current_shares = cur_h["so_co_phieu"] if cur_h else 0
                        
                        if target_shares > current_shares:
                            buy_shares = target_shares - current_shares
                            # Phí mua = 0.1%
                            cost = buy_shares * price * (1 + 0.001)
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

                    # 3. Tính toán NAV thật
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

                results.append({
                    "Model Name": model_name,
                    "Total Return (%)": ai_tot * 100,
                    "Annual Return (%)": ai_ann * 100,
                    "Sharpe Ratio": ai_sharpe,
                    "Max Drawdown (%)": ai_mdd * 100,
                    "Win Rate (%)": ai_win * 100,
                    "Alpha (%)": alpha * 100,
                    "Beta": beta,
                    "Total Days": len(portfolio_returns),
                    "Final NAV (VND)": nav
                })
                print(f"✅ Lợi nhuận thực chiến: {ai_tot*100:.2f}%, MDD {ai_mdd*100:.2f}%")
            except Exception as inner_e:
                print(f"⚠️ Lỗi khi đánh giá {model_name}: {inner_e}")

        # Tổng hợp kết quả
        results_df = pd.DataFrame(results)
        
        # Lưu ra CSV
        output_csv = os.path.join(root_dir, "output", "real_simulation_results.csv")
        results_df.to_csv(output_csv, index=False, encoding='utf-8-sig')
        
        print("\n=========================================================")
        print("📊 BẢNG TỔNG HỢP HIỆU SUẤT THỰC CHIẾN (T+2.5, LOT 100)")
        print("=========================================================")
        print(results_df.to_string(index=False))
        print(f"\n📁 Đã lưu kết quả chi tiết tại: {output_csv}")
        
        start_date = dates_test[0]
        end_date = dates_test[-1]
        
        # Calculate Benchmark explicitly for the report
        benchmark_series = returns_test.mean(axis=1)
        bm_tot, bm_ann, bm_sharpe, bm_mdd, bm_win = calc_metrics(benchmark_series)
        
        print(f"\n🕒 THỜI GIAN KIỂM THỬ THỰC CHIẾN:")
        print(f"   => Đã thực hiện giao dịch từ ngày {start_date} đến ngày {end_date} (Tổng cộng {len(dates_test)} phiên).")
        print("\n🌎 TÌNH HÌNH THỊ TRƯỜNG CHUNG (BENCHMARK) TRONG GIAI ĐOẠN NÀY:")
        print(f"   - Lợi nhuận toàn thị trường: {bm_tot*100:+.2f}%")
        print(f"   - Tỷ lệ phiên tăng giá (Win Rate): {bm_win*100:.2f}%")
        print(f"   - Mức sụt giảm sâu nhất (Max Drawdown): {bm_mdd*100:.2f}%")
        print(f"   - Biến động trung bình (Độ lệch chuẩn): {benchmark_series.std()*100:.2f}% / phiên")
        print("   => LỜI KHUYÊN: So sánh lợi nhuận của AI với Lợi nhuận toàn thị trường ở trên để thấy rõ Alpha (Giá trị vượt trội).")


    except Exception as e:
        print(f"Không thể chạy đánh giá. Lỗi: {e}")
        traceback.print_exc()
