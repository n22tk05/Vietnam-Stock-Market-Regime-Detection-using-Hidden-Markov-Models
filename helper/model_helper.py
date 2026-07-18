from hmmlearn.hmm import GMMHMM, GaussianHMM
import numpy as np
from .statinonarity import n_params
def evaluate_hmm(K, Z_train, Z_oos, seeds=3):
    Z_train = Z_train + np.random.normal(0, 1e-4, Z_train.shape)
    if len(Z_oos) > 0: Z_oos = Z_oos + np.random.normal(0, 1e-4, Z_oos.shape)
    best_bic, best_ll_oos, best_model = np.inf, -np.inf, None
    best_min_dur, best_min_share, best_max_share = 0, 0, 1

    for seed in range(seeds):
        try:
            m = GMMHMM(n_components=K, n_mix=2, covariance_type='diag', min_covar=0.01, n_iter=200, random_state=seed*7)
            m.fit(Z_train)
            ll_train = m.score(Z_train)

            p = n_params(K, Z_train.shape[1])
            bic = -2 * ll_train + p * np.log(len(Z_train))
            ll_oos = m.score(Z_oos) if len(Z_oos)>0 else np.nan

            persist = np.diag(m.transmat_)
            min_dur = float((1.0 / (1.0 - persist + 1e-9)).min())

            preds = m.predict(Z_train)
            counts = np.bincount(preds, minlength=K) / len(Z_train)
            min_share = float(counts.min())
            max_share = float(counts.max())

            if bic < best_bic and min_dur >= 2.0 and min_share >= 0.05 and max_share <= 0.85:
                best_bic, best_ll_oos, best_model = bic, ll_oos, m
                best_min_dur, best_min_share, best_max_share = min_dur, min_share, max_share
        except Exception as e:
            continue
    return best_model, best_bic, best_ll_oos, best_min_dur, best_min_share, best_max_share



def get_hmm_filtered_inference(model, Z):
    N = len(Z)
    K = model.n_components
    filtered_probs = np.zeros((N, K))
    filtered_regimes = np.zeros(N, dtype=int)
    for t in range(1, N + 1):
        Z_slice = Z[:t]
        try:
            probs_slice = model.predict_proba(Z_slice)
            filtered_probs[t-1] = probs_slice[-1]
            regimes_slice = model.predict(Z_slice)
            filtered_regimes[t-1] = regimes_slice[-1]
        except Exception as e:
            filtered_probs[t-1] = np.ones(K) / K
            filtered_regimes[t-1] = 0
    return filtered_regimes, filtered_probs


def auto_label(rs, K):
    ret = rs['mean_ret_%'].values
    vol = rs['vol_%'].values
    if K == 2:
        return {int(np.argmin(ret)): 'Bear', int(np.argmax(ret)): 'Bull'}
    elif K == 3:
        sharpe = ret / (vol + 1e-9)
        order = np.argsort(sharpe)
        return {int(order[0]): 'Bear', int(order[1]): 'Sideways', int(order[2]): 'Bull'}
    elif K >= 4:
        from scipy.optimize import linear_sum_assignment
        ret_Z = (ret - np.mean(ret)) / (np.std(ret) + 1e-9)
        vol_Z = (vol - np.mean(vol)) / (np.std(vol) + 1e-9)

        scores = np.zeros((K, 4))
        for i in range(K):
            scores[i, 0] = -ret_Z[i] + vol_Z[i] # Crisis
            scores[i, 1] = -ret_Z[i] - vol_Z[i] # Tranquil
            scores[i, 2] =  ret_Z[i] - vol_Z[i] # CalmBull
            scores[i, 3] =  ret_Z[i] + vol_Z[i] # Euphoria

        row_ind, col_ind = linear_sum_assignment(-scores)
        label_names = ['Crisis', 'Tranquil', 'CalmBull', 'Euphoria']
        labels = {r: label_names[c] for r, c in zip(row_ind, col_ind)}

        unassigned = set(range(K)) - set(row_ind)
        for i, st in enumerate(unassigned):
            labels[st] = f'Daily_Tier{i+5}'

        return labels
    return {i: f'State_{i}' for i in range(K)}

def auto_label_sector(rs, K):
    ret = rs['mean_ret'].values; vol = rs['mean_vol'].values
    if K == 2: return {int(np.argmin(ret)): 'Bear', int(np.argmax(ret)): 'Bull'}
    elif K == 3:
        sharpe = ret / (vol + 1e-9)
        order = np.argsort(sharpe)
        return {int(order[0]): 'Bear', int(order[1]): 'Sideways', int(order[2]): 'Bull'}
    elif K >= 4:
        from scipy.optimize import linear_sum_assignment
        ret_Z = (ret - np.mean(ret)) / (np.std(ret) + 1e-9)
        vol_Z = (vol - np.mean(vol)) / (np.std(vol) + 1e-9)
        scores = np.zeros((K, 4))
        for i in range(K):
            scores[i, 0] = -ret_Z[i] + vol_Z[i]
            scores[i, 1] = -ret_Z[i] - vol_Z[i]
            scores[i, 2] =  ret_Z[i] - vol_Z[i]
            scores[i, 3] =  ret_Z[i] + vol_Z[i]
        row_ind, col_ind = linear_sum_assignment(-scores)
        label_names = ['Crisis', 'Sideways', 'Bull', 'Euphoria']
        labels = {r: label_names[c] for r, c in zip(row_ind, col_ind)}
        unassigned = set(range(K)) - set(row_ind)
        for i, st in enumerate(unassigned): labels[st] = f'Tier{i}'
        return labels
    return {i: f'State_{i}' for i in range(K)}