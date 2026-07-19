import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import pandas as pd
import warnings
import traceback
import sys
import os

from ppo import load_data, AdvancedPortfolioEnv, CONFIG
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from stable_baselines3 import PPO

# ---------------------------------------------
# Cài đặt Seaborn style để biểu đồ đẹp hơn
# ---------------------------------------------
sns.set_theme(style="whitegrid")
warnings.filterwarnings('ignore')

if __name__ == "__main__":
    returns_df, ai_features_df, strategies_features_df, weights_dim, tickers, num_strategies_features, dates = load_data()

    try:
        total_days = len(returns_df)

        # Lấy 15% dữ liệu cuối cùng để backtest (giống fast_split)
        test_ratio = 0.15
        test_size = int(total_days * test_ratio)
        test_start = total_days - test_size

        returns_test = returns_df.iloc[test_start:]
        ai_test = ai_features_df.iloc[test_start:]
        strategies_test = strategies_features_df.iloc[test_start:]
        dates_test = dates[test_start:]

        # Check CONFIG for paths, falling back if needed
        # Handle the case where SAVE_MODEL_PATH is just a directory vs a file
        model_path = getattr(CONFIG, 'SAVE_MODEL_PATH', 'v7_3/AI_Brain_v7_3.zip')
        if os.path.isdir(model_path):
            model_path = os.path.join(model_path, 'AI_Brain.zip')
            
        env_path = 'v7_3/vec_normalize.pkl'
        
        # If the environment paths are saved in output/ppo_model, try to read from there
        if not os.path.exists(env_path):
            # ppo save_dir is os.path.join(root_dir, "output", "ppo_model")
            script_dir = os.path.dirname(os.path.abspath(__file__))
            root_dir = os.path.abspath(os.path.join(script_dir, ".."))
            env_path = os.path.join(root_dir, "output", "ppo_model", "vec_normalize.pkl")

        print(f"🔄 Đang nạp bộ não từ {model_path} để tiến hành phân tích...")
        model = PPO.load(model_path)

        test_env = DummyVecEnv([lambda: AdvancedPortfolioEnv(
                returns_test, ai_test, strategies_test, weights_dim, num_strategies_features, tickers=tickers, dates=dates_test, is_test=True
            )])
        test_env = VecNormalize.load(env_path, test_env)
        test_env.training = False
        test_env.norm_reward = False

        obs = test_env.reset()
        done = [False]

        portfolio_returns = []
        portfolio_dates = []
        benchmark_returns = [] # Benchmark: Lợi nhuận Equal Weight của danh mục
        action_history = []

        step_idx = 0
        while not done[0]:
            action, _states = model.predict(obs, deterministic=True)
            obs, reward, done, info = test_env.step(action)

            if 'net_return' in info[0]:
                portfolio_returns.append(info[0]['net_return'])
                portfolio_dates.append(pd.to_datetime(dates_test[step_idx], format='%d/%m/%Y'))

                # Tính benchmark (Equal Weight)
                bm_ret = np.mean(returns_test.iloc[step_idx].values)
                benchmark_returns.append(bm_ret)

                action_history.append(action[0])

            step_idx += 1

        perf_df = pd.DataFrame({
            'AI_Strategy': portfolio_returns,
            'Benchmark_EQ': benchmark_returns
        }, index=portfolio_dates)

        # ---------------------------------------------------------
        # 1. TÍNH TOÁN CÁC CHỈ SỐ RỦI RO VÀ HIỆU SUẤT (METRICS)
        # ---------------------------------------------------------
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

        ai_tot, ai_ann, ai_sharpe, ai_mdd, ai_win = calc_metrics(perf_df['AI_Strategy'])
        bm_tot, bm_ann, bm_sharpe, bm_mdd, bm_win = calc_metrics(perf_df['Benchmark_EQ'])

        cov = np.cov(perf_df['AI_Strategy'], perf_df['Benchmark_EQ'])[0][1]
        var = np.var(perf_df['Benchmark_EQ'])
        beta = cov / var if var > 0 else 1
        alpha = ai_ann - (beta * bm_ann)

        print("\n=========================================================")
        print("📊 BÁO CÁO HIỆU SUẤT ĐẦU TƯ (BACKTEST)")
        print("=========================================================")
        print(f"{str('Chỉ số').ljust(20)} | {str('AI Strategy').ljust(15)} | {str('Benchmark (EQ)').ljust(15)}")
        print("-" * 55)
        print(f"{str('Tổng lợi nhuận').ljust(20)} | {ai_tot*100:>14.2f}% | {bm_tot*100:>14.2f}%")
        print(f"{str('Lợi nhuận năm').ljust(20)} | {ai_ann*100:>14.2f}% | {bm_ann*100:>14.2f}%")
        print(f"{str('Sharpe Ratio').ljust(20)} | {ai_sharpe:>14.2f}  | {bm_sharpe:>14.2f} ")
        print(f"{str('Max Drawdown').ljust(20)} | {ai_mdd*100:>14.2f}% | {bm_mdd*100:>14.2f}%")
        print(f"{str('Win Rate (Ngày)').ljust(20)} | {ai_win*100:>14.2f}% | {bm_win*100:>14.2f}%")
        print("-" * 55)
        print(f"Alpha (So với BM): {alpha*100:.2f}% (Lợi nhuận vượt trội sau khi trừ rủi ro thị trường)")
        print(f"Beta  (So với BM): {beta:.2f} (Độ nhạy cảm với biến động chung)")

        # ---------------------------------------------------------
        # 2. VẼ BIỂU ĐỒ EQUITY CURVE (LỢI NHUẬN TÍCH LŨY)
        # ---------------------------------------------------------
        fig, ax = plt.subplots(figsize=(12, 6))
        ((1 + perf_df).cumprod() - 1).plot(ax=ax, linewidth=2)
        plt.title("So sánh Lợi nhuận Tích lũy (Equity Curve): AI vs Benchmark", fontsize=14, fontweight='bold')
        plt.ylabel("Lợi nhuận (%)")
        plt.xlabel("Thời gian")

        import matplotlib.ticker as mtick
        ax.yaxis.set_major_formatter(mtick.PercentFormatter(1.0))
        plt.show()

        # ---------------------------------------------------------
        # 3. PHÂN TÍCH HÀNH VI (ALLOCATION HISTORY)
        # ---------------------------------------------------------
        action_df = pd.DataFrame(action_history, columns=tickers, index=portfolio_dates)
        action_df = action_df.loc[:, action_df.max() > 0.01]

        mean_alloc = action_df.mean().sort_values(ascending=False)
        print("\n=========================================================")
        print("🔍 PHÂN TÍCH HÀNH VI: AI YÊU THÍCH CỔ PHIẾU NÀO NHẤT?")
        print("=========================================================")
        print(mean_alloc.head(10).apply(lambda x: f"{x*100:.2f}%").to_string())

        action_df['CASH'] = 1.0 - action_df.sum(axis=1)
        action_df['CASH'] = action_df['CASH'].clip(lower=0)

        fig2, ax2 = plt.subplots(figsize=(14, 7))
        top_cols = list(mean_alloc.head(10).index) + ['CASH']
        action_df[top_cols].plot.area(ax=ax2, colormap='tab20', alpha=0.8, linewidth=0)
        plt.title("Biến động Phân bổ Tỷ trọng (Portfolio Allocation) theo thời gian", fontsize=14, fontweight='bold')
        plt.ylabel("Tỷ trọng (%)")
        plt.xlabel("Thời gian")
        plt.legend(loc='center left', bbox_to_anchor=(1.0, 0.5))
        ax2.yaxis.set_major_formatter(mtick.PercentFormatter(1.0))
        plt.tight_layout()
        plt.show()

        # ---------------------------------------------------------
        # 4. KẾT LUẬN HÀNH VI: BÁN NON HAY GỒNG LÃI?
        # ---------------------------------------------------------
        cash_holdings = action_df['CASH'].mean()
        turnover_rate = action_df.drop(columns=['CASH']).diff().abs().sum(axis=1).mean()

        print("\n=========================================================")
        print("💡 ĐÁNH GIÁ PHONG CÁCH GIAO DỊCH CỦA AI")
        print("=========================================================")
        print(f"- Tỷ trọng Tiền mặt trung bình: {cash_holdings*100:.2f}% ")
        if cash_holdings > 0.5:
            print("  -> Phong cách: Rất an toàn (Phòng thủ). AI thường xuyên ôm tiền đứng ngoài.")
        elif cash_holdings < 0.1:
            print("  -> Phong cách: Tấn công (Aggressive). AI gần như lúc nào cũng full cổ phiếu.")
        else:
            print("  -> Phong cách: Cân bằng. Biết tiến biết lùi.")

        print(f"- Tốc độ xoay vòng vốn (Turnover/ngày): {turnover_rate*100:.2f}%")
        if turnover_rate > 0.3:
            print("  -> AI lướt sóng (T+) rất nhiều. Có xu hướng chốt non nhanh để bảo toàn rủi ro.")
        elif turnover_rate < 0.05:
            print("  -> AI có xu hướng Buy & Hold (Gồng lãi/lỗ) dài hạn, ít nhảy nhót.")
        else:
            print("  -> AI giao dịch ở mức độ vừa phải, luân chuyển dòng tiền hợp lý.")

    except Exception as e:
        print(f"Không thể chạy đánh giá. Lỗi: {e}")
        traceback.print_exc()
