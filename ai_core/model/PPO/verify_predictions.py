import os
import sys
import numpy as np
import pandas as pd
import warnings
warnings.filterwarnings('ignore')

from ppo import load_data, AdvancedPortfolioEnv, CONFIG, allocate_portfolio_real
from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
from stable_baselines3 import PPO

def predict_live_tomorrow():
    print("="*80)
    print("🚀 HỆ THỐNG GIAO DỊCH TRỰC TIẾP (LIVE INFERENCE) T+1")
    print("="*80)
    
    # 1. Tải toàn bộ dữ liệu T (Dữ liệu quá khứ cho đến ngày hiện tại)
    returns_df, ai_features_df, strategies_features_df, weights_dim, tickers, num_strategies_features, dates = load_data()
    
    total_days = len(returns_df)
    today_date = dates[-1]
    
    print(f"[*] Đã tải dữ liệu thị trường. Ngày giao dịch hiện tại (T): {today_date}")
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.abspath(os.path.join(script_dir, "..", ".."))
    
    # 2. Khởi tạo Model Tốt Nhất (Ví dụ: Seed 9491 - Kẻ Sống Sót)
    model_dir = os.path.join(root_dir, "output", "ppo_model")
    
    # Tự động tìm mô hình có chữ Seed9491
    model_file = next((f for f in os.listdir(model_dir) if "AI_Brain_v7_Seed6445_Profit_-9.19" in f and f.endswith(".zip")), None)
    if not model_file:
        print("❌ Không tìm thấy model Seed 6445. Vui lòng kiểm tra lại thư mục!")
        return
        
    model_path = os.path.join(model_dir, model_file)
    env_path = os.path.join(model_dir, "vec_normalize.pkl")
    
    print(f"[*] Đang nạp Bộ Não AI: {model_file}")
    model = PPO.load(model_path)
    
    # 3. Giả lập môi trường chứa DUY NHẤT 1 ngày cuối cùng (T) để dự đoán T+1
    # Trong thực tế, AI lấy toàn bộ trạng thái T để ra quyết định mua bán cho tương lai
    latest_returns = returns_df.iloc[-1:]
    latest_ai = ai_features_df.iloc[-1:]
    latest_strategies = strategies_features_df.iloc[-1:]
    latest_dates = dates[-1:]
    
    live_env = DummyVecEnv([lambda: AdvancedPortfolioEnv(
        latest_returns, latest_ai, latest_strategies, weights_dim, num_strategies_features, tickers=tickers, dates=latest_dates, is_test=True
    )])
    
    # 4. Phục hồi góc nhìn của AI (Scale Normalize)
    live_env = VecNormalize.load(env_path, live_env)
    live_env.training = False
    live_env.norm_reward = False

    # Reset để trích xuất Feature của ngày T
    obs = live_env.reset()
    
    # 5. Đưa vào Bộ Não PPO dự đoán T+1
    print("\n⏳ AI ĐANG PHÂN TÍCH TOÀN BỘ DỮ LIỆU T...")
    action, _ = model.predict(obs, deterministic=True)
    
    raw_action = np.clip(action[0], 0, 1)
    if np.sum(raw_action) > 1.0:
        raw_action = raw_action / np.sum(raw_action)
        
    # Lấy giá đóng cửa ngày T để tính toán
    current_prices = latest_strategies.values[0].reshape(num_strategies_features, weights_dim).T[:, 2]
    
    # 6. Xuất Khuyến Nghị Phân Bổ
    CAPITAL = 100_000_000
    print(f"\n🎯 KHUYẾN NGHỊ DANH MỤC CHO NGÀY MAI (T+1) | Vốn: {CAPITAL:,} đ")
    print("-" * 80)
    
    real_alloc = allocate_portfolio_real(
        tickers=tickers,
        w=raw_action,
        p=current_prices,
        C=CAPITAL,
        LOT_SIZE=100
    )
    
    if real_alloc['warning_flag']:
        print(f"⚠️ CẢNH BÁO: {real_alloc['warning_msg']}")
        
    if not real_alloc['allocations']:
        print("🛡️ AI KHUYẾN NGHỊ: FULL TIỀN MẶT (Rủi ro thị trường quá lớn)")
    else:
        for item in real_alloc['allocations']:
            print(f"  🟢 MUA / NẮM GIỮ: {item['ma_co_phieu']:5s} | Số lượng: {item['so_co_phieu']:>6,} cổ phiếu | Giá đóng cửa T: {item['gia_hien_tai']:>7,.0f} đ | Phân bổ: {item['so_tien_chi']:>10,.0f} đ")
            
    print(f"\n  💵 TIỀN MẶT CÒN DƯ: {real_alloc['cash_left']:,.0f} đ")
    print("="*80)

if __name__ == "__main__":
    predict_live_tomorrow()
