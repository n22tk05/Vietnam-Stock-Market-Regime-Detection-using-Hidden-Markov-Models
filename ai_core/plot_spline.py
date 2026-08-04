import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from scipy.interpolate import make_interp_spline
import os

def plot_spline_area():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, "output")
    csv_file = os.path.join(output_dir, "daily_nav_log.csv")
    
    if not os.path.exists(csv_file):
        print("❌ Không tìm thấy daily_nav_log.csv!")
        return
        
    df = pd.read_csv(csv_file)
    df['Date'] = pd.to_datetime(df['Date'])
    
    x = np.arange(len(df))
    y_ai = df['AI_Cum_Return (%)'].values
    y_bm = df['Benchmark_Cum_Return (%)'].values
    
    # Tạo Spline mượt mà (300 điểm)
    x_smooth = np.linspace(x.min(), x.max(), 300)
    
    spl_ai = make_interp_spline(x, y_ai, k=3)
    y_ai_smooth = spl_ai(x_smooth)
    
    spl_bm = make_interp_spline(x, y_bm, k=3)
    y_bm_smooth = spl_bm(x_smooth)
    
    plt.style.use('dark_background')
    fig, ax = plt.subplots(figsize=(14, 7))
    
    # Vẽ Line
    ax.plot(x_smooth, y_ai_smooth, color='#00FFCC', linewidth=2.5, label='AI Model')
    ax.plot(x_smooth, y_bm_smooth, color='#FF3333', linewidth=2.5, label='VN-Index Benchmark')
    
    # Vẽ Area lấp đầy (Spline Area)
    ax.fill_between(x_smooth, y_ai_smooth, 0, color='#00FFCC', alpha=0.3)
    ax.fill_between(x_smooth, y_bm_smooth, 0, color='#FF3333', alpha=0.3)
    
    # Đặt nhãn trục X
    num_ticks = 10
    tick_indices = np.linspace(0, len(df)-1, num_ticks, dtype=int)
    tick_dates = df['Date'].iloc[tick_indices].dt.strftime('%d-%m-%Y')
    
    ax.set_xticks(tick_indices)
    ax.set_xticklabels(tick_dates, rotation=45)
    
    ax.set_title('SPLINE AREA: SỰ THỐNG TRỊ CỦA AI TRONG KHỦNG HOẢNG', fontsize=18, fontweight='bold', color='gold')
    ax.set_ylabel('Lợi nhuận tích lũy (%)', fontsize=12)
    ax.set_xlabel('Thời gian', fontsize=12)
    
    ax.axhline(0, color='white', linewidth=1.5, linestyle='--')
    ax.legend(loc='upper left', fontsize=12)
    plt.grid(color='#333333', linestyle='-.', linewidth=0.5, alpha=0.5)
    
    plt.tight_layout()
    
    plot_file = os.path.join(output_dir, "spline_nav_chart.png")
    plt.savefig(plot_file, dpi=300)
    print(f"Đã lưu biểu đồ Spline Area tại: {plot_file}")

if __name__ == "__main__":
    plot_spline_area()
