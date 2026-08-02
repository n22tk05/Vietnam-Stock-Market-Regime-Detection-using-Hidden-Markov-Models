import numpy as np
import pandas as pd
import warnings
import traceback
import sys
import os
import glob

# Ensure UTF-8 output for Windows console
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from ppo import load_data, AdvancedPortfolioEnv, allocate_portfolio_real, CONFIG
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from stable_baselines3 import PPO

warnings.filterwarnings('ignore')

if __name__ == "__main__":
    returns_df, ai_features_df, strategies_features_df, weights_dim, tickers, num_strategies_features, dates = load_data()

    try:
        total_days = len(returns_df)
        # Sử dụng 20% dữ liệu cuối cùng để backtest
        test_size = int(total_days * 0.1)
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
                portfolio_dates = []

                step_idx = 0
                while not done[0]:
                    action, _states = model.predict(obs, deterministic=True)
                    
                    # --- Lọc Top 5 và chuẩn hóa lại % phân bổ ---
                    action_flat = action[0].copy()
                    top_k = 5
                    top_indices = np.argsort(action_flat)[-top_k:]
                    filtered_action = np.zeros_like(action_flat)
                    filtered_action[top_indices] = action_flat[top_indices]
                    
                    filtered_action = np.clip(filtered_action, 0, 1)
                    action_sum = np.sum(filtered_action)
                    if action_sum > 0:
                        filtered_action = filtered_action / action_sum
                        
                    action[0] = filtered_action
                    
                    obs, reward, done, info = test_env.step(action)
                    
                    if 'net_return' in info[0]:
                        portfolio_returns.append(info[0]['net_return'])
                        portfolio_dates.append(pd.to_datetime(dates_test[step_idx], format='%d/%m/%Y'))

                        # Tính benchmark (Equal Weight)
                        bm_ret = np.mean(returns_test.iloc[step_idx].values)
                        benchmark_returns.append(bm_ret)

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

                # Tính NAV giả định
                nav = 100_000_000 * (1 + ai_tot)
                
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
