import os
import sys
import pandas as pd
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

script_dir = os.path.dirname(os.path.abspath(__file__))
tickers_file = os.path.join(script_dir, "success_tickers.txt")
data_dir = os.path.join(script_dir, "data", "stocks")

if not os.path.exists(tickers_file):
    print("❌ Không tìm thấy success_tickers.txt")
    sys.exit(1)

with open(tickers_file, 'r') as f:
    tickers = [line.strip() for line in f if line.strip()]

all_prices = {}
for ticker in tickers:
    file_path = os.path.join(data_dir, f"{ticker}.csv")
    if os.path.exists(file_path):
        df = pd.read_csv(file_path)
        df['time'] = pd.to_datetime(df['time'])
        df = df.sort_values('time').set_index('time')
        # Loại bỏ các mã bị thiếu dữ liệu quá nhiều
        all_prices[ticker] = df['close']

# Gộp thành 1 DataFrame
prices_df = pd.DataFrame(all_prices)

# Xử lý missing data bằng forward fill
prices_df = prices_df.ffill().dropna(how='all')

# Tính lợi nhuận hàng ngày của từng cổ phiếu
returns_df = prices_df.pct_change().dropna(how='all')

# Tính chỉ số VN60-EW (Trọng số đều cho 60 mã)
market_index_returns = returns_df.mean(axis=1)
market_index = (1 + market_index_returns).cumprod() * 1000  # Base 1000

print("📊 ĐÁNH GIÁ THỊ TRƯỜNG CHUNG (TẬP HỢP 60 MÃ CỔ PHIẾU LÕI)")
print("="*60)
print(f"Tổng số mã phân tích: {len(prices_df.columns)}")
print(f"Giai đoạn dữ liệu: {prices_df.index[0].strftime('%Y-%m-%d')} đến {prices_df.index[-1].strftime('%Y-%m-%d')}")
print(f"Tổng số phiên giao dịch: {len(prices_df)}")

# Tính các thông số dài hạn
total_return = (market_index.iloc[-1] / market_index.iloc[0] - 1) * 100
annualized_return = ((market_index.iloc[-1] / market_index.iloc[0]) ** (252 / len(market_index)) - 1) * 100
volatility = market_index_returns.std() * np.sqrt(252) * 100

# Max Drawdown
cummax = market_index.cummax()
drawdown = (market_index - cummax) / cummax
max_drawdown = drawdown.min() * 100

print("\n📈 1. BỨC TRANH TOÀN CẢNH (DÀI HẠN):")
print(f"   - Lợi nhuận tổng cộng: {total_return:+.2f}%")
print(f"   - Lợi nhuận trung bình năm: {annualized_return:+.2f}%")
print(f"   - Biến động (Rủi ro hàng năm): {volatility:.2f}%")
print(f"   - Sụt giảm sâu nhất (Max Drawdown): {max_drawdown:.2f}%")

# Tính hiệu suất ngắn/trung hạn
def get_period_return(days):
    if len(market_index) < days: return None
    return (market_index.iloc[-1] / market_index.iloc[-days] - 1) * 100

ret_1m = get_period_return(21)
ret_3m = get_period_return(63)
ret_6m = get_period_return(126)
ret_1y = get_period_return(252)

print("\n📉 2. ĐỘNG LỰC HIỆN TẠI (NGẮN & TRUNG HẠN):")
if ret_1y: print(f"   - Hiệu suất 1 năm qua (252 phiên): {ret_1y:+.2f}%")
if ret_6m: print(f"   - Hiệu suất 6 tháng qua (126 phiên): {ret_6m:+.2f}%")
if ret_3m: print(f"   - Hiệu suất 3 tháng qua (63 phiên): {ret_3m:+.2f}%")
if ret_1m: print(f"   - Hiệu suất 1 tháng qua (21 phiên): {ret_1m:+.2f}%")

# Phân tích độ rộng thị trường (Market Breadth) hiện tại (so với MA50)
ma50 = prices_df.rolling(window=50).mean()
current_prices = prices_df.iloc[-1]
current_ma50 = ma50.iloc[-1]
above_ma50 = (current_prices > current_ma50).sum()
percent_above_ma50 = (above_ma50 / len(prices_df.columns)) * 100

print("\n🔥 3. SỨC KHỎE DÒNG TIỀN HIỆN TẠI:")
print(f"   - Số cổ phiếu nằm trên đường trung bình 50 ngày (MA50): {above_ma50}/{len(prices_df.columns)} ({percent_above_ma50:.1f}%)")
if percent_above_ma50 > 70:
    state = "QUÁ MUA (Hưng phấn)"
elif percent_above_ma50 > 50:
    state = "TÍCH CỰC (Uptrend)"
elif percent_above_ma50 > 30:
    state = "TIÊU CỰC (Downtrend)"
else:
    state = "QUÁ BÁN (Sợ hãi tột độ - Cơ hội bắt đáy)"
print(f"   - Đánh giá trạng thái: {state}")

# Cổ phiếu dẫn dắt 1 tháng qua
if len(prices_df) >= 21:
    month_returns = (prices_df.iloc[-1] / prices_df.iloc[-21] - 1) * 100
    top_5 = month_returns.nlargest(5)
    bot_5 = month_returns.nsmallest(5)
    print("\n🏆 4. TOP 5 CỔ PHIẾU DẪN DẮT (1 THÁNG QUA):")
    for ticker, val in top_5.items():
        print(f"   - {ticker}: {val:+.2f}%")
    print("\n💀 5. TOP 5 CỔ PHIẾU TỆ NHẤT (1 THÁNG QUA):")
    for ticker, val in bot_5.items():
        print(f"   - {ticker}: {val:+.2f}%")
