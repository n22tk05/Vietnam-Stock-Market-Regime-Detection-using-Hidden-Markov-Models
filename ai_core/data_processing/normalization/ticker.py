import pandas as pd
import numpy as np
from scipy.stats import norm

def make_Z_ticker(df_source, features, window=252):
    """
    Chuẩn hóa Normal Quantile Transform (NQT) áp dụng cho dữ liệu Ticker riêng lẻ.
    """
    fd = df_source[['time'] + features].dropna().reset_index(drop=True)
    nqt_df = pd.DataFrame(index=fd.index)
    
    for col in features:
        rolling_rank = fd[col].rolling(window=window, min_periods=1).rank()
        rolling_count = fd[col].rolling(window=window, min_periods=1).count()
        pct = (rolling_rank - 0.5) / rolling_count
        nqt_values = norm.ppf(pct)
        nqt_df[col] = np.clip(nqt_values, -3.0, 3.0)
        
    Z_all = nqt_df.values
    return fd, Z_all

def normalize_ticker(ticker_aligned, hybrid_features, window=252):
    """
    Chuẩn hóa các tính năng hỗn hợp (hybrid features) của một mã cổ phiếu cụ thể.
    Bao gồm features của cổ phiếu + xác suất thị trường + xác suất ngành...
    """
    fd_z_tick, Z_all_tick = make_Z_ticker(ticker_aligned, hybrid_features, window)
    
    # Trả về ma trận Z_all_tick (dùng trực tiếp cho huấn luyện HMM)
    # và DataFrame df_Z (đã gán tên cột với hậu tố _Z) để tiện inspect
    z_columns = [c + '_Z' for c in hybrid_features]
    df_Z = pd.DataFrame(Z_all_tick, columns=z_columns)
    
    df_ticker_normalized = pd.concat([fd_z_tick, df_Z], axis=1)
    
    return df_ticker_normalized, Z_all_tick
