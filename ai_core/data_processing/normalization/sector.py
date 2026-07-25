import pandas as pd
import numpy as np
from scipy.stats import norm

def make_nqt(series, window=252):
    """
    Chuẩn hóa Normal Quantile Transform (NQT) cho một Pandas Series.
    """
    rolling_rank = series.rolling(window=window, min_periods=1).rank()
    rolling_count = series.rolling(window=window, min_periods=1).count()
    pct = (rolling_rank - 0.5) / rolling_count
    return np.clip(norm.ppf(pct), -3.0, 3.0)

def normalize_sector(sector_df, window=252):
    """
    Thực hiện tính toán và chuẩn hóa Z-score cho các nhóm ngành (Sector).
    Dữ liệu truyền vào (sector_df) cần có các cột: 'time', 'industry', 'sector_log_ret', 'sector_volume'.
    """
    sector_dfs = []
    
    for ind, group in sector_df.groupby('industry'):
        group = group.sort_values('time').reset_index(drop=True)
        
        # Tính toán các features phái sinh nếu chưa có
        if 'sector_vol20' not in group.columns:
            group['sector_vol20'] = group['sector_log_ret'].rolling(20).std() * np.sqrt(252)
        if 'sector_vol5' not in group.columns:
            group['sector_vol5'] = group['sector_log_ret'].rolling(5).std() * np.sqrt(252)
        if 'sector_volume_ratio' not in group.columns:
            group['sector_volume_ratio'] = group['sector_volume'] / group['sector_volume'].rolling(20).mean()

        # Áp dụng chuẩn hóa (NQT)
        group['sector_log_ret_Z'] = make_nqt(group['sector_log_ret'], window)
        group['sector_vol20_Z'] = make_nqt(group['sector_vol20'], window)
        group['sector_vol5_Z'] = make_nqt(group['sector_vol5'], window)
        group['sector_volume_ratio_Z'] = make_nqt(group['sector_volume_ratio'], window)
        
        sector_dfs.append(group)

    df_sector_final = pd.concat(sector_dfs, ignore_index=True).dropna().reset_index(drop=True)
    return df_sector_final
