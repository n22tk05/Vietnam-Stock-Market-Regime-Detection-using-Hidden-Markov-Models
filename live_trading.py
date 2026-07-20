import sys
import os
import numpy as np
import subprocess

script_dir = os.path.dirname(os.path.abspath(__file__))

def run_cmd(script_name, cwd):
    cmd = f'"{sys.executable}" -u {script_name}'
    print(f"[{cwd}] Running: {cmd}")
    res = subprocess.run(cmd, shell=True, cwd=cwd)
    if res.returncode != 0:
        print(f"FAILED: {cmd}")
        raise RuntimeError(f"Command {cmd} failed with exit code {res.returncode}.")
    else:
        print(f"--- SUCCESS: {cmd} ---")

import re
import datetime
import argparse

def daily_live_trading(run_crawl=False, target_date=None):
    if run_crawl:
        if not target_date:
            target_date ='2026-05-04' # datetime.datetime.now().strftime('%Y-%m-%d')
            
        print(f"\n🚀 [1/4] CHẠY CRAWL DỮ LIỆU ĐẾN NGÀY {target_date}...")
        run_cmd(f"pipeline.py --date {target_date}", cwd=os.path.join(script_dir, "crawl"))
        
        print("\n⚙️ [2/4] CHẠY DATA PROCESSING...")
        run_cmd("pipeline.py", cwd=os.path.join(script_dir, "data_processing"))
        
        print("\n🧠 [3/4] CHẠY MÔ HÌNH HMM (HIDDEN MARKOV MODEL)...")
        run_cmd("hmm.py", cwd=os.path.join(script_dir, "model"))
    else:
        print("\n⚡ [1/4] BỎ QUA BƯỚC CRAWL VÀ XỬ LÝ DỮ LIỆU. Đọc thẳng vào kho dữ liệu đang có...")

    # ========================================================
    # BƯỚC 2: AI RA QUYẾT ĐỊNH (INFERENCE)
    # ========================================================
    print("\n🤖 [2/4] BẮT ĐẦU LIVE TRADING INFERENCE BẰNG PPO...")
    
    # Import các module từ ppo.py
    ppo_dir = os.path.join(script_dir, "model", "PPO")
    if ppo_dir not in sys.path:
        sys.path.append(ppo_dir)
        
    import ppo
    from ppo import load_data, AdvancedPortfolioEnv, allocate_portfolio_real
    from stable_baselines3 import PPO
    from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize
    
    # Nạp dữ liệu mới nhất đã được HMM tổng hợp
    returns_df, ai_features_df, strategies_features_df, weights_dim, tickers, num_strategies_features, dates = load_data()
    
    # Trích xuất dòng cuối cùng
    idx = -1
    returns_live = returns_df.iloc[[idx]]
    ai_live = ai_features_df.iloc[[idx]]
    strategies_live = strategies_features_df.iloc[[idx]]
    dates_live = dates[-1:]
    
    print(f"\n✅ Đã nạp dữ liệu ngày giao dịch cuối cùng có trong máy: {dates_live[0]}")
    
    # Khởi tạo Môi trường Ảo cho 1 ngày
    live_env = DummyVecEnv([lambda: AdvancedPortfolioEnv(
        returns_live, ai_live, strategies_live, weights_dim, num_strategies_features, tickers=tickers, dates=dates_live, is_test=True
    )])
    
    # Định tuyến tới thư mục chứa Model
    save_dir = os.path.join(script_dir, "output", "ppo_model")
    vec_norm_path = os.path.join(save_dir, "vec_normalize.pkl")
    model_path = os.path.join(save_dir, "AI_Brain.zip")
    
    # BẮT BUỘC: Nạp lại chuẩn hóa (VecNormalize) của quá trình huấn luyện
    if os.path.exists(vec_norm_path):
        live_env = VecNormalize.load(vec_norm_path, live_env)
        live_env.training = False
        live_env.norm_reward = False
    else:
        print("⚠️ CẢNH BÁO: Không tìm thấy file vec_normalize.pkl! Model dự đoán sẽ bị sai lệch tỷ lệ.")
        
    obs = live_env.reset()
    
    # Tải Model Trí tuệ AI
    sys.modules['__main__'].AdvancedTickerExtractor = ppo.AdvancedTickerExtractor
    model = PPO.load(model_path)
    
    # Dự đoán tỷ trọng
    action, _states = model.predict(obs, deterministic=True)
    action = action[0] # Tách khỏi Batch Dimension
    
    # Chuẩn hóa tỷ trọng AI trả về (Tránh lỗi vượt quá 100%)
    action = np.clip(action, 0, 1)
    action_sum = np.sum(action)
    if action_sum > 1.0:
        action = action / action_sum
        
    # ========================================================
    # BƯỚC 3: PHÂN BỔ VỐN THỰC TẾ & IN KHUYẾN NGHỊ
    # ========================================================
    current_prices = strategies_live.values[0].reshape(num_strategies_features, weights_dim).T[:, 2]
    
    # 💵 THIẾT LẬP VỐN ĐẦU TƯ CỦA BẠN (Ví dụ: 1 Tỷ VNĐ)
    CAPITAL = 100_000_000
    
    result = allocate_portfolio_real(
        tickers=tickers,
        w=action,
        p=current_prices,
        C=CAPITAL,
        LOT_SIZE=100
    )
    
    print("\n=========================================================")
    print(f"💰 TÍN HIỆU ĐI LỆNH TỪ AI BOT (Vốn: {CAPITAL:,.0f} đ)")
    print("=========================================================")
    
    if result['warning_flag']:
        print(f"⚠️ CẢNH BÁO MÔ HÌNH: {result['warning_msg']}\n")
        
    for item in result['allocations']:
        print(f" 🟢 LỆNH {item['ma_co_phieu']}: Mua {item['so_co_phieu']:,} cổ phiếu (Giá {item['gia_hien_tai']:,.0f} đ)")
        print(f"    - Tỷ trọng mục tiêu (AI): {item['ty_trong_goc_ppo']*100:.1f}%")
        print(f"    - Tiền thực tế cần có: {item['so_tien_chi']:,.0f} đ")
        
    print("---------------------------------------------------------")
    print(f" 💵 Tiền mặt còn dư trong tài khoản: {result['cash_left']:,.0f} đ")
    print(f" 📉 Sai số tỷ trọng do làm tròn lô (Tracking Error): {result['tracking_error']:.4f}")
    print("=========================================================")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AIQUANTUM Live Trading System")
    parser.add_argument("--crawl", action="store_true", help="Bật chế độ tự động Crawl và xử lý dữ liệu mới")
    parser.add_argument("--date", type=str, default=None, help="Ngày kết thúc dữ liệu (Format: YYYY-MM-DD)")
    
    args = parser.parse_args()
    
    daily_live_trading(run_crawl=args.crawl, target_date=args.date)
