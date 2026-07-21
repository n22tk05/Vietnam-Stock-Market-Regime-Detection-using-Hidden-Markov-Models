import sys
import os
import subprocess
import argparse

# Cấu hình UTF-8 cho console để in được Emoji không bị lỗi
sys.stdout.reconfigure(encoding='utf-8')
script_dir = os.path.dirname(os.path.abspath(__file__))

def run_cmd(script_name, cwd):
    cmd = f'"{sys.executable}" -u {script_name}'
    print(f"\n[{cwd}] Running: {cmd}")
    res = subprocess.run(cmd, shell=True, cwd=cwd)
    if res.returncode != 0:
        print(f"FAILED: {cmd}")
        sys.exit(res.returncode)
    else:
        print(f"--- SUCCESS: {cmd} ---")

def main():
    parser = argparse.ArgumentParser(description="Master Training Pipeline cho AIQUANTUM")
    parser.add_argument('--date', type=str, default=None, help="End date for crawling (e.g., 2026-05-04)")
    parser.add_argument('--skip-crawl', action='store_true', help="Bỏ qua bước tải dữ liệu từ web")
    args = parser.parse_args()

    # BƯỚC 1: CRAWL DỮ LIỆU
    if not args.skip_crawl:
        target_date = args.date if args.date else "2026-05-04"
        print(f"\n🚀 [1/4] CHẠY CRAWL DỮ LIỆU ĐẾN NGÀY {target_date}...")
        run_cmd(f"pipeline.py --date {target_date}", cwd=os.path.join(script_dir, "crawl"))
    else:
        print("\n⚡ [1/4] BỎ QUA BƯỚC CRAWL DỮ LIỆU...")

    # BƯỚC 2: XỬ LÝ DỮ LIỆU
    print("\n⚙️ [2/4] CHẠY DATA PROCESSING...")
    run_cmd("pipeline.py", cwd=os.path.join(script_dir, "data_processing"))

    # BƯỚC 3: HUẤN LUYỆN HMM
    print("\n🧠 [3/4] HUẤN LUYỆN MÔ HÌNH HMM (HIDDEN MARKOV MODEL)...")
    run_cmd("hmm.py", cwd=os.path.join(script_dir, "model", "HMM"))

    # BƯỚC 4: HUẤN LUYỆN PPO
    print("\n🤖 [4/4] HUẤN LUYỆN MÔ HÌNH HỌC TĂNG CƯỜNG PPO...")
    run_cmd("ppo.py", cwd=os.path.join(script_dir, "model", "PPO"))

    print("\n✅ TẤT CẢ CÁC BƯỚC HUẤN LUYỆN ĐÃ HOÀN TẤT THÀNH CÔNG!")

if __name__ == "__main__":
    main()