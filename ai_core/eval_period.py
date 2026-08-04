import os
import sys
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import shutil

sys.stdout.reconfigure(encoding='utf-8')

script_dir = os.path.dirname(os.path.abspath(__file__))
tickers_file = os.path.join(script_dir, "success_tickers.txt")
data_dir = os.path.join(script_dir, "data", "stocks")

# 1. Định nghĩa khoảng thời gian cần đánh giá
start_date_str = '2025-08-13'
end_date_str = '2026-07-28'

print(f"🔄 Đang trích xuất dữ liệu thị trường từ {start_date_str} đến {end_date_str}...")

with open(tickers_file, 'r') as f:
    tickers = [line.strip() for line in f if line.strip()]

all_prices = {}
for ticker in tickers:
    file_path = os.path.join(data_dir, f"{ticker}.csv")
    if os.path.exists(file_path):
        df = pd.read_csv(file_path)
        df['time'] = pd.to_datetime(df['time'])
        df = df.sort_values('time').set_index('time')
        # Lọc dữ liệu trong khoảng thời gian
        mask = (df.index >= pd.to_datetime(start_date_str)) & (df.index <= pd.to_datetime(end_date_str))
        df_period = df.loc[mask]
        if not df_period.empty:
            all_prices[ticker] = df_period['close']

# Gộp thành 1 DataFrame
prices_df = pd.DataFrame(all_prices)
prices_df = prices_df.ffill().dropna(how='all')

if prices_df.empty:
    print("❌ Không có dữ liệu trong khoảng thời gian này.")
    sys.exit(1)

# Tính lợi nhuận
returns_df = prices_df.pct_change().dropna(how='all')
market_index_returns = returns_df.mean(axis=1)
# Biến đổi thành % (Bắt đầu từ 0%)
market_index = ((1 + market_index_returns).cumprod() - 1) * 100

print("\n" + "="*70)
print(f"📊 BÁO CÁO NHỊP ĐẬP THỊ TRƯỜNG CHUNG (GIAI ĐOẠN KHỦNG HOẢNG)")
print(f"   Thời gian: {prices_df.index[0].strftime('%d/%m/%Y')} -> {prices_df.index[-1].strftime('%d/%m/%Y')}")
print(f"   Số phiên giao dịch: {len(prices_df)} phiên")
print("="*70)

total_return = market_index.iloc[-1]
cummax = market_index.cummax()
drawdown = market_index - cummax # Vì đã là %, drawdown cũng tính bằng chênh lệch % tuyệt đối
max_drawdown = drawdown.min()

print(f"\n📉 1. TỔNG QUAN THIỆT HẠI:")
print(f"   - Mức tăng trưởng toàn thị trường (VN60): {total_return:+.2f}%")
print(f"   - Mức sụt giảm sâu nhất (Max Drawdown): {max_drawdown:+.2f}%")
if total_return < 0:
    print("   => THỊ TRƯỜNG TRONG TRẠNG THÁI SUY THOÁI TOÀN DIỆN (BEAR MARKET).")

# Tìm các mã bốc hơi mạnh nhất trong giai đoạn này
stock_returns = (prices_df.iloc[-1] / prices_df.iloc[0] - 1) * 100
bot_10 = stock_returns.nsmallest(10)
top_5 = stock_returns.nlargest(5)

print(f"\n💀 2. TOP 10 CỔ PHIẾU BỊ 'HỦY DIỆT' NẶNG NHẤT ({start_date_str} -> {end_date_str}):")
for ticker, val in bot_10.items():
    print(f"   - {ticker}: {val:+.2f}%")

print(f"\n🏆 3. NHỮNG MÃ HIẾM HOI ĐI NGƯỢC BÃO:")
for ticker, val in top_5.items():
    if val > 0:
        print(f"   - {ticker}: {val:+.2f}%")

# Vẽ biểu đồ riêng cho Market trong giai đoạn này (để so sánh)
plt.style.use('dark_background')
fig, ax = plt.subplots(figsize=(12, 6))

import matplotlib.ticker as mtick

ax.plot(market_index.index, market_index.values, color='#FF3333', linewidth=2.5, label='Thị trường chung (VN60 EW)')
ax.fill_between(market_index.index, market_index.values, 0, where=(market_index.values <= 0), color='#FF3333', alpha=0.3)
ax.fill_between(market_index.index, market_index.values, 0, where=(market_index.values > 0), color='#00FFCC', alpha=0.3)

ax.set_title(f'SỰ SỤT GIẢM CỦA THỊ TRƯỜNG CHUNG\n({start_date_str} đến {end_date_str})', color='gold', fontsize=16, fontweight='bold')
ax.axhline(0, color='white', linewidth=1.5, linestyle='--')
ax.set_ylabel('Lợi nhuận tích lũy (%)', fontsize=12)
ax.yaxis.set_major_formatter(mtick.PercentFormatter(decimals=0))
ax.legend()
plt.grid(color='#333333', linestyle='-.', linewidth=0.5)
plt.tight_layout()

# Lưu biểu đồ
output_img = os.path.join(script_dir, "output", "market_crash_period.png")
plt.savefig(output_img, dpi=300)
print(f"\n✅ Đã xuất biểu đồ sụt giảm thị trường tại: {output_img}")
