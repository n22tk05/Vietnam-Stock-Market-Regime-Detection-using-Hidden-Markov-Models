import pandas as pd
import numpy as np
from scipy.stats import norm

def make_Z(df, features, window=252):
    """
    Chuẩn hóa dữ liệu theo phương pháp Normal Quantile Transform (NQT).
    Phù hợp cho Market features.
    """
    fd = df[['time'] + features].dropna().reset_index(drop=True)
    nqt_df = pd.DataFrame(index=fd.index)
    
    for col in features:
        rolling_rank = fd[col].rolling(window=window, min_periods=1).rank()
        rolling_count = fd[col].rolling(window=window, min_periods=1).count()
        pct = (rolling_rank - 0.5) / rolling_count
        nqt_values = norm.ppf(pct)
        nqt_df[col] = np.clip(nqt_values, -3.0, 3.0)
        
    Z_all = nqt_df.values
    return fd, Z_all

def normalize_market(df_market, selected_features, window=252):
    """
    Áp dụng chuẩn hóa Z-score (NQT) cho tập dữ liệu thị trường (Market).
    Đầu ra là dataframe đã chứa các biến `_Z`.
    """
    fd_market, Z_all_market = make_Z(df_market, selected_features, window)
    
    # Tạo các cột _Z
    z_columns = [c + '_Z' for c in selected_features]
    df_market_Z = pd.DataFrame(Z_all_market, columns=z_columns)
    
    # Giữ lại các cột quan trọng không bị chuẩn hóa
    keep_cols = ['time', 'vnindex_log_ret', 'vnindex_close', 'vnindex_vol20']
    available_keep_cols = [c for c in keep_cols if c in df_market.columns]
    
    fd_market = fd_market.merge(df_market[available_keep_cols], on='time', how='left')
    
    # Nối đặc trưng gốc và đặc trưng đã chuẩn hóa
    df_market_normalized = pd.concat([fd_market, df_market_Z], axis=1)
    
    return df_market_normalized
