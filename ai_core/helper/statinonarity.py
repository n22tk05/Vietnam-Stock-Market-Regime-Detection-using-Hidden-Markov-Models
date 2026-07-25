from scipy.stats import skew, kurtosis
from statsmodels.tsa.stattools import adfuller, kpss
import numpy as np
from statsmodels.stats.outliers_influence import variance_inflation_factor

def check_stationarity(s):
    s = s.dropna()
    if len(s) < 30: return False, np.nan, np.nan, np.nan, np.nan
    p_adf = adfuller(s, autolag='AIC')[1]
    p_kpss = kpss(s, regression='c', nlags='auto')[1] 
    kurt = kurtosis(s)
    skw = skew(s)
    is_stat = (p_adf < 0.05) and (p_kpss >= 0.05) and (abs(kurt) < 10)
    return is_stat, p_adf, p_kpss, kurt, skw

def filter_vif_greedy(df, features, threshold=5.0):
    selected = []
    for f in features:
        trial = selected + [f]
        X_sub = df[trial].values
        X_sub = np.column_stack([np.ones(len(X_sub)), X_sub])
        vif = variance_inflation_factor(X_sub, len(trial))
        if vif < threshold:
            selected.append(f)
    return selected

def n_params(K, D, M=2):
    return (K - 1) + K * (K - 1) + K * (M - 1) + K * M * D + K * M * D * (D + 1) // 2