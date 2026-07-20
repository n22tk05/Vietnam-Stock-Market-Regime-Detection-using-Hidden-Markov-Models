import os
import sys
import numpy as np
import pandas as pd
import warnings
warnings.filterwarnings('ignore')

from ppo import load_data, AdvancedPortfolioEnv, CONFIG
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from stable_baselines3 import PPO

def verify_predictions(days_to_test=30, top_k=3):
    print("="*60)
    print("🤖 KỂM TRA THỰC TẾ DỰ ĐOÁN CỦA PPO MODEL (BACKTEST CHI TIẾT)")
    print("="*60)
    
    returns_df, ai_features_df, strategies_features_df, weights_dim, tickers, num_strategies_features, dates = load_data()
    
    total_days = len(returns_df)
    if total_days < days_to_test + 5:
        print("Không đủ dữ liệu để test!")
        return

    # Lấy dữ liệu test (cộng thêm 3 ngày cuối để có thể soi tương lai T+1, T+2, T+3)
    test_start = total_days - days_to_test - 3
    
    returns_test = returns_df.iloc[test_start:]
    ai_test = ai_features_df.iloc[test_start:]
    strategies_test = strategies_features_df.iloc[test_start:]
    dates_test = dates[test_start:]
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.abspath(os.path.join(script_dir, "..", ".."))
    
    # Load model
    model_dir = os.path.join(root_dir, "output", "ppo_model")
    model_path = os.path.join(model_dir, "AI_Brain_v7_Seed4984_Profit_58.06.zip")
    env_path = os.path.join(model_dir, "vec_normalize.pkl")
    
    if not os.path.exists(model_path):
        print(f"❌ Không tìm thấy model tại {model_path}. Bạn cần train model trước!")
        return
        
    if not os.path.exists(env_path):
        print(f"❌ Không tìm thấy file vec_normalize.pkl tại {env_path}. Môi trường chưa được lưu!")
        return
        
    print(f"[*] Đang nạp model từ: {model_path}")
    model = PPO.load(model_path)
    
    test_env = DummyVecEnv([lambda: AdvancedPortfolioEnv(
        returns_test, ai_test, strategies_test, weights_dim, num_strategies_features, tickers=tickers, dates=dates_test, is_test=True
    )])
    test_env = VecNormalize.load(env_path, test_env)
    test_env.training = False
    test_env.norm_reward = False

    obs = test_env.reset()
    
    correct_t1 = 0
    correct_t3 = 0
    total_trades = 0
    
    print("\n🔍 CHI TIẾT CÁC QUYẾT ĐỊNH MUA VÀ KẾT QUẢ THỰC TẾ:")
    print("-" * 80)
    
    # Track previous weights to know what the model BOUGHT today
    prev_weights = np.zeros(weights_dim)
    
    for i in range(days_to_test):
        current_date = dates_test[i]
        
        # Lấy quyết định của model
        action, _ = model.predict(obs, deterministic=True)
        
        # PPO trả ra action (tỷ trọng mong muốn). Mức chênh lệch dương = MUA VÀO.
        # action là mảng có shape (1, num_tickers)
        desired_weights = action[0]
        
        # Mua vào = tỷ trọng mong muốn - tỷ trọng cũ
        buy_amounts = desired_weights - prev_weights
        
        # Tìm các mã mua nhiều nhất
        buy_indices = np.argsort(buy_amounts)[::-1]
        
        bought_stocks = []
        for idx in buy_indices:
            if buy_amounts[idx] > 0.01: # Mua > 1% danh mục
                bought_stocks.append(idx)
            if len(bought_stocks) == top_k:
                break
                
        if len(bought_stocks) > 0:
            print(f"\n📅 Ngày {current_date}: Model ra lệnh MUA T+0")
            for idx in bought_stocks:
                ticker = tickers[idx]
                weight = buy_amounts[idx] * 100
                
                # Lấy lợi nhuận tương lai từ dữ liệu THỰC TẾ
                # Vì i là ngày hiện tại, i+1 là T+1
                try:
                    ret_t1 = returns_test.iloc[i + 1].values[idx] * 100
                    ret_t2 = returns_test.iloc[i + 2].values[idx] * 100
                    ret_t3 = returns_test.iloc[i + 3].values[idx] * 100
                    
                    # Tính tổng lợi nhuận sau 3 ngày giữ (tính theo lãi gộp đơn giản)
                    total_ret_t3 = ((1 + ret_t1/100) * (1 + ret_t2/100) * (1 + ret_t3/100) - 1) * 100
                    
                    total_trades += 1
                    if ret_t1 > 0: correct_t1 += 1
                    if total_ret_t3 > 0: correct_t3 += 1
                    
                    mark_t1 = "✅" if ret_t1 > 0 else "❌"
                    mark_t3 = "✅" if total_ret_t3 > 0 else "❌"
                    
                    print(f"  👉 Mã {ticker:5s} | Khối lượng: {weight:5.1f}%")
                    print(f"      Lợi nhuận T+1: {ret_t1:6.2f}% {mark_t1} | T+2: {ret_t2:6.2f}% | T+3: {ret_t3:6.2f}%")
                    print(f"      => TỔNG KẾT BÁN TẠI T+3: {total_ret_t3:6.2f}% {mark_t3}")
                except IndexError:
                    print(f"  👉 Mã {ticker:5s} | Khối lượng: {weight:5.1f}% | (Không đủ dữ liệu tương lai để soi)")
                    
        # Chạy step môi trường để đi đến ngày tiếp theo
        obs, _, _, _ = test_env.step(action)
        prev_weights = desired_weights
        
    print("\n" + "="*80)
    print("🎯 TỔNG KẾT ĐỘ CHÍNH XÁC CỦA MODEL (TRÊN DỮ LIỆU QUÁ KHỨ)")
    print("="*80)
    if total_trades > 0:
        print(f"Tổng số lượt ra quyết định MUA: {total_trades}")
        print(f"Tỉ lệ dự đoán ĐÚNG xu hướng T+1 : {correct_t1 / total_trades * 100:.2f}% ({correct_t1}/{total_trades})")
        print(f"Tỉ lệ dự đoán ĐÚNG xu hướng T+3 : {correct_t3 / total_trades * 100:.2f}% ({correct_t3}/{total_trades})")
    else:
        print("Model không thực hiện lệnh mua nào trong khoảng thời gian này (hoặc chỉ Hold tiền mặt).")
        
if __name__ == "__main__":
    # Xem lại quyết định của 30 ngày giao dịch gần nhất
    verify_predictions(days_to_test=7, top_k=3)
