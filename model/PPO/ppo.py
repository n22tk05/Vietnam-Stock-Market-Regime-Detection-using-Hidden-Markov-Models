import pandas as pd
import numpy as np
import gymnasium as gym
from gymnasium import spaces
from stable_baselines3 import PPO
from stable_baselines3.common.vec_env import DummyVecEnv
import torch as th
import datetime
import sys
import random
import shutil
import os

seed_val = random.randint(1, 100)
print(f"🎲 Random Seed: {seed_val}")
th.manual_seed(seed_val)
np.random.seed(seed_val)
random.seed(seed_val)
# os.environ['PYTHONHASHSEED'] = str(seed_val)
from torch import nn
from stable_baselines3.common.torch_layers import BaseFeaturesExtractor
import warnings
import matplotlib.ticker as mtick

warnings.filterwarnings('ignore') # Tắt các cảnh báo không cần thiết để Log sạch đẹp hơn

sys.stdout.reconfigure(encoding='utf-8')

script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)
root_dir = os.path.abspath(os.path.join(script_dir, "..", ".."))
if root_dir not in sys.path:
    sys.path.append(root_dir)
save_dir = os.path.join(root_dir, "output", "ppo_model")
os.makedirs(save_dir, exist_ok=True)

def log(msg):
    print(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}")
def allocate_portfolio_real(tickers, w, p, C, LOT_SIZE=100, tracking_err_threshold=0.3):
    import math
    
    # Ở VN, giá cổ phiếu trên data thường chia 1000 (VD: 40 tức là 40,000 đ)
    # Ta nhân lại cho đúng mệnh giá tiền mặt VND
    p = [price * 1000 for price in p]
    
    # Bước 1: Lọc mã không đủ vốn mua tối thiểu 1 lô
    E = []
    min_capital = {}
    for i in range(len(w)):
        if w[i] > 0 and p[i] > 0:
            min_cap = p[i] * LOT_SIZE
            if min_cap <= C:
                E.append(i)
                min_capital[i] = min_cap
                
    if not E:
        min_price = min([price for price in p if price > 0], default=0)
        warning_msg = f"Vốn quá nhỏ, không mua nổi mã nào. Vốn tối thiểu khuyến nghị là {min_price * LOT_SIZE:,.0f} đ." if min_price > 0 else "Không có mã hợp lệ."
        return {
            'warning_flag': True,
            'warning_msg': warning_msg,
            'allocations': [],
            'used': 0,
            'cash_left': C,
            'tracking_error': sum(w)
        }
        
    # Bước 2: Re-normalize lại tỷ trọng trên tập mã khả thi
    sum_w_E = sum(w[i] for i in E)
    w_norm = {i: w[i] / sum_w_E for i in E}
    
    # Bước 3: Tính số lô cho từng mã (làm tròn xuống)
    lot = {}
    shares = {}
    spent = {}
    for i in E:
        target_amount = w_norm[i] * C
        lot[i] = math.floor(target_amount / (p[i] * LOT_SIZE))
        shares[i] = lot[i] * LOT_SIZE
        spent[i] = shares[i] * p[i]
        
    # Bước 4: Xử lý phần vốn dư (greedy refill)
    used = sum(spent.values())
    cash_left = C - used
    
    # Sắp xếp E theo độ ưu tiên: w_norm[i] / p[i] giảm dần
    sorted_E = sorted(E, key=lambda i: w_norm[i] / p[i], reverse=True)
    
    while True:
        bought_any = False
        for i in sorted_E:
            if cash_left >= min_capital[i]:
                lot[i] += 1
                shares[i] = lot[i] * LOT_SIZE
                spent[i] = shares[i] * p[i]
                
                cash_left -= min_capital[i]
                used += min_capital[i]
                bought_any = True
        if not bought_any:
            break
            
    # Bước 5: Tính lại tỷ trọng thực tế & sai số
    w_actual = {}
    tracking_error = 0
    for i in range(len(w)):
        if i in E:
            w_act = spent[i] / C
        else:
            w_act = 0
        w_actual[i] = w_act
        tracking_error += abs(w[i] - w_act)
        
    # Bước 6: Ra quyết định / cảnh báo
    warning_flag = False
    warning_msg = ""
    if len(E) <= 5 or tracking_error > tracking_err_threshold:
        warning_flag = True
        warning_msg = f"Danh mục thực tế lệch khá nhiều so với khuyến nghị gốc do giới hạn vốn (Tracking Error: {tracking_error:.4f})."
        
    allocations = []
    for i in E:
        if lot[i] > 0:
            allocations.append({
                'ma_co_phieu': tickers[i],
                'so_lo': lot[i],
                'so_co_phieu': shares[i],
                'gia_hien_tai': p[i],
                'so_tien_chi': spent[i],
                'ty_trong_goc_ppo': w[i],
                'ty_trong_thuc_te': w_actual[i]
            })
            
    return {
        'warning_flag': warning_flag,
        'warning_msg': warning_msg,
        'allocations': allocations,
        'used': used,
        'cash_left': cash_left,
        'tracking_error': tracking_error
    }


# ## [CẤU HÌNH CHIẾN LƯỢC ĐẦU TƯ - AI TRADING]
class CONFIG:
    TRAINING_MODE = 'fast_split' # 'fast_split' or 'rolling_window'
    # 1. PHÍ GIAO DỊCH (Transaction Cost): 
    # Tỷ lệ phần trăm CTCK thu cho mỗi lần bạn mua hoặc bán cổ phiếu. (VD: 0.2% = 0.002)
    COST_RATE = 0.0001

    TURNOVER_PENALTY_RATE = 0.3
    DRAWDOWN_PENALTY_RATE = 5.0
    LIQUIDITY_BONUS_RATE = 0.02
    TRAIN_WINDOW = 252
    TEST_WINDOW = 21
    SAVE_MODEL_PATH = save_dir

    # Các giá trị tính điểm (Reward/Penalty System)
    REWARD_WIN_MULT = 100
    REWARD_LOSS_MULT = 200
    REWARD_ALPHA_MULT = 50
    REWARD_CASH_CRASH_MULT = 100
    PENALTY_OVER_DIVERSIFICATION = 0.01


    # 7. CHẾ ĐỘ CHỜ HÀNG VỀ T+2 (Rule 7: Settlement Lock):
    # Đặc sản của Chứng khoán VN. Số ngày cổ phiếu bị "nhốt" chưa về tài khoản. 
    # Trong những ngày này (VD: 2 ngày đầu tiên), AI tuyệt đối không thể bán cắt lỗ/chốt lời dù thị trường sập.
    T_PLUS_SETTLEMENT = 3

    # 8. SỐ BƯỚC ĐÀO TẠO (Training Timesteps):
    # Số vòng lặp để AI cập nhật bộ não. Càng cao (50k - 100k) AI càng thông minh nhưng thời gian train càng lâu.
    TRAINING_TIMESTEPS = 1_500_000

    # 9. ĐỘ PHÂN BỔ VỐN (Entropy Coefficient):
    # Quyết định AI sẽ All-in hay Rải rác.
    # Giá trị nhỏ (0.001) -> Ưu tiên All-in vài mã mạnh nhất.
    # Giá trị lớn (0.05) -> Ưu tiên chia đều tiền ra mua nhiều mã để phân tán rủi ro.
    ENT_COEF = 0.005

    # 10. NEURAL NETWORK & PPO HYPERPARAMETERS
    FEATURES_DIM = 256
    NET_ARCH = [64, 64]
    N_STEPS = 1024
    LEARNING_RATE = 0.00005
    BATCH_SIZE = 90
    USE_SDE = False
    SDE_SAMPLE_FREQ = 5

    # Neuron Network


# ## LUẬT 2: MARKET CONTEXT (TỔNG HỢP VĨ MÔ & VI MÔ)

# ## Hàm này nạp dữ liệu từ file Parquet (đã chạy HMM) và chế biến thêm các chỉ báo để tạo thành 


def load_data():
    # 1. Nạp dữ liệu thô
    log("Loading Master DRL")
    raw_df = pd.read_csv(os.path.join(root_dir,"output","hmm_model" ,"master_ticker_hmm_results.csv"))
    raw_df['time'] = pd.to_datetime(raw_df['time'])
    log("Loading sucess")
    # Lấy các DataFrame cơ sở
    returns_df = raw_df.pivot(index='time', columns='ticker', values='log_return').fillna(0)
    weights_dim = returns_df.shape[1] # Số lượng mã cổ phiếu

    vol_df = raw_df.pivot(index='time', columns='ticker', values='volume').fillna(0)
    close_df = raw_df.pivot(index='time', columns='ticker', values='close').ffill().fillna(0)
    open_df = raw_df.pivot(index='time', columns='ticker', values='open').ffill().fillna(0)
    low_df = raw_df.pivot(index='time', columns='ticker', values='low').ffill().fillna(0)
    high_df = raw_df.pivot(index='time', columns='ticker', values='high').ffill().fillna(0)

    # -------------------------------------
    # CÁC CHỈ BÁO VĨ MÔ & KỸ THUẬT (DÀNH CHO AI HỌC)
    # -------------------------------------
    print("-------------------------------------")
    log("CÁC CHỈ BÁO VĨ MÔ & KỸ THUẬT (DÀNH CHO AI HỌC)")
    print("return 5d, return 20d, vol 20d, price, ma20, dist ma20, momentum 3d")
    print("-------------------------------------")

    market_return_5d = returns_df.rolling(5).sum().mean(axis=1).fillna(0) 
    market_return_20d = returns_df.rolling(20).sum().mean(axis=1).fillna(0) 
    market_vol_20d = returns_df.rolling(20).std().mean(axis=1).fillna(0) 

    price_df = np.exp(returns_df.cumsum())
    ma20_df = price_df.rolling(20).mean()
    dist_ma20_df = ((price_df - ma20_df) / ma20_df).fillna(0)
    momentum_3d_df = (close_df / close_df.shift(3) - 1).fillna(0) # T+3 Momentum

    # -------------------------------------
    # CÁC CHỈ BÁO KỊCH BẢN LUẬT (KHÔNG CHO AI HỌC)
    # -------------------------------------
    log("-------------------------------------")
    log("CÁC CHỈ BÁO KỊCH BẢN LUẬT (KHÔNG CHO AI HỌC)")
    log("-------------------------------------")
    ema_df_20 = close_df.ewm(span=20, adjust=False).mean()
    ema_df_50 = close_df.ewm(span=50, adjust=False).mean()
    ema_df_200 = close_df.ewm(span=200, adjust=False).mean()

    # SMA Vol
    def calc_sma(df, n=5):
        return df.rolling(n).mean()
    log("SMA Vol")
    sma_vol_5_df = calc_sma(vol_df)
    sma_vol_20_df = calc_sma(vol_df, n=20)
    # RSI (Chuẩn Wilder's Smoothing)

    log("RSI")
    change_df = close_df - close_df.shift(1)
    gain_df = change_df.clip(lower=0)
    loss_df = change_df.clip(upper=0).abs()
    ema_gain = gain_df.ewm(alpha=1/20, min_periods=20, adjust=False).mean()
    ema_loss = loss_df.ewm(alpha=1/20, min_periods=20, adjust=False).mean()
    rs_df = ema_gain / ema_loss
    rsi_df = 100 - (100 / (1 + rs_df))
    rsi_df = rsi_df.fillna(100)

    # MACD
    log("MACD")
    macd_df = close_df.ewm(span=12, adjust=False).mean() - close_df.ewm(span=26, adjust=False).mean()
    signal_df = macd_df.ewm(span=9, adjust=False).mean()
    hist_df = macd_df - signal_df

    # Độ dốc xu hướng (Slope)
    log("Slope")
    def calc_slope(df, n=3):
        return (df - df.shift(n)) / n
    slope_ema20_3_df = calc_slope(ema_df_20, n=3)  
    slope_sma5_3_df = calc_sma(sma_vol_5_df, n=3)
    slope_sma5_3_df = calc_sma(sma_vol_5_df, n=20)
    slope_sma5_50_df = calc_sma(sma_vol_5_df, n=50)
    slope_sma5_200_df = calc_sma(sma_vol_5_df, n=200)
    # Candlestick Patterns
    log("Candlestick Patterns")
    body_df = (close_df - open_df).abs()
    tail_df = (np.minimum(close_df, open_df) - low_df)
    head_df = high_df - np.maximum(close_df, open_df)

    is_hammer_df = (tail_df >= 2 * body_df) & (head_df <= 0.1 * body_df) & (body_df > 0)
    is_bull_engulf_df = (close_df.shift(1) < open_df.shift(1)) & (close_df > open_df) & (close_df >= open_df.shift(1)) & (open_df <= close_df.shift(1))

    # LowestLow(5) và HighestHigh(10)
    log("Lowest and Highest")
    lowest_low_5_df = low_df.rolling(5).min()
    highest_high_5_df = high_df.rolling(5).max()
    highest_high_10_df = high_df.rolling(10).max()
    highest_high_20_df = high_df.rolling(20).max()

    # Đáy và đỉnh
    log("Is peak and is valley")
    # Ngày T-2 là Đỉnh nếu nó cao hơn T-4, T-3 (Quá khứ) VÀ cao hơn T-1, T (Hiện tại)
    is_peak = (high_df.shift(2) > high_df.shift(4)) & \
                (high_df.shift(2) > high_df.shift(3)) & \
                (high_df.shift(2) > high_df.shift(1)) & \
                (high_df.shift(2) > high_df)

    # Ngày T-2 là Đáy nếu nó thấp hơn T-4, T-3 (Quá khứ) VÀ thấp hơn T-1, T (Hiện tại)
    is_valley = (low_df.shift(2) < low_df.shift(4)) & \
                (low_df.shift(2) < low_df.shift(3)) & \
                (low_df.shift(2) < low_df.shift(1)) & \
                (low_df.shift(2) < low_df)

    peak_values = high_df.shift(2).where(is_peak, np.nan)
    valley_values = low_df.shift(2).where(is_valley, np.nan)

    last_peak_df = peak_values.ffill()
    last_valley_df = valley_values.ffill()

    # FIBONACCI
    log("Fibonacci")
    wave_amplitude_df = last_peak_df - last_valley_df
    wave_state_df = pd.DataFrame(np.nan, index=high_df.index, columns=high_df.columns)

    wave_state_df[is_peak] = 1
    wave_state_df[is_valley] = -1

    last_swing_type_df = wave_state_df.ffill()

    # SUP() RES()
    log("sup and res")
    n = 20 # Số phiên để xác nhận Đỉnh/Đáy (Bạn có thể tinh chỉnh 10 hoặc 20)
    window = 2 * n + 1

    # 1. Tìm mức cao nhất/thấp nhất trong 41 ngày gần nhất (20 ngày trước + 1 ngày giữa + 20 ngày sau)
    # V6 Fix: Tính đỉnh/đáy bằng trailing max/min (Bảo vệ tuyệt đối khỏi Lookahead Bias)
    rolling_max = high_df.rolling(window=2 * n + 1, min_periods=1).max()
    rolling_min = low_df.rolling(window=2 * n + 1, min_periods=1).min()

    is_peak = (high_df == rolling_max)
    is_valley = (low_df == rolling_min)

    # 3. Ghi nhớ mức giá tại Đỉnh/Đáy đó
    peak_values = high_df.where(is_peak, np.nan)
    valley_values = low_df.where(is_valley, np.nan)

    # 4. Kéo dài giá trị ra để lấy Hỗ trợ (Sup) và Kháng cự (Res) gần nhất
    res_df = peak_values.ffill() # Đỉnh gần nhất (Res)
    sup_df = valley_values.ffill() # Đáy gần nhất (Sup)


    # SÓNG TĂNG CHÍNH = Mốc cuối cùng được xác nhận là 1 cái Đỉnh
    # Trả về giá trị True/False cho từng ngày
    log("Up wave")
    is_upward_wave_df = (last_swing_type_df == 1)
    fib_382_df = last_peak_df - (0.382 * wave_amplitude_df)
    fib_500_df = last_peak_df - (0.500 * wave_amplitude_df)
    fib_618_df = last_peak_df - (0.618 * wave_amplitude_df)
    fib_ext_127_df = last_peak_df + (0.272 * wave_amplitude_df)
    fib_ext_161_df = last_peak_df + (0.618 * wave_amplitude_df)

    # Bollinger Bands 
    log("Bollinger Bands")
    bb_middle_df = close_df.rolling(20).mean()
    bb_std_df = close_df.rolling(20).std()
    bb_upper_df = bb_middle_df + (2 * bb_std_df)
    bb_lower_df = bb_middle_df - (2 * bb_std_df)

    # 2. TÍNH ĐỘ RỘNG DẢI BĂNG (BB WIDTH)
    bb_width_df = (bb_upper_df - bb_lower_df) / bb_middle_df

    # 3. TÍN HIỆU BIẾN ĐỘNG MẠNH (DẢI BĂNG MỞ RỘNG)
    # So sánh độ rộng hôm nay với hôm qua VÀ với Trung bình 20 ngày
    bb_expanding_df = (bb_width_df > bb_width_df.shift(1)) & \
                        (bb_width_df > bb_width_df.rolling(20).mean())

    # ACCUMULATION
    log("Accmulation")
    highest_high_21_df = high_df.rolling(21).max().shift(1)
    lowest_low_21_df = low_df.rolling(21).min().shift(1)

    # Biên độ dao động của cái hộp nhỏ hơn 15%
    is_accumulation_df = (highest_high_21_df - lowest_low_21_df) / lowest_low_21_df <= 0.15
    # Bóc tách dữ liệu HMM từ raw_df
    prob0_df = raw_df.pivot(index='time', columns='ticker', values='prob_ticker_0').fillna(0) 
    prob1_df = raw_df.pivot(index='time', columns='ticker', values='prob_ticker_1').fillna(0) 
    prob2_df = raw_df.pivot(index='time', columns='ticker', values='prob_ticker_2').fillna(0) 
    vol_20d_df = raw_df.pivot(index='time', columns='ticker', values='rolling_vol_20d').fillna(0)
    ret_20d_df = raw_df.pivot(index='time', columns='ticker', values='return_20d').fillna(0)
    vol_ratio_df = raw_df.pivot(index='time', columns='ticker', values='volume_ratio').fillna(0)

    # Broadcast vĩ mô
    mkt_ret5_df = pd.DataFrame(np.tile(market_return_5d.values.reshape(-1, 1), (1, weights_dim)), index=returns_df.index, columns=returns_df.columns)
    mkt_ret20_df = pd.DataFrame(np.tile(market_return_20d.values.reshape(-1, 1), (1, weights_dim)), index=returns_df.index, columns=returns_df.columns)
    mkt_vol_df = pd.DataFrame(np.tile(market_vol_20d.values.reshape(-1, 1), (1, weights_dim)), index=returns_df.index, columns=returns_df.columns)

    # -------------------------------------------------------------------------
    # GOM THÀNH 2 BẢNG BIỆT LẬP (1 CHO AI, 1 CHO LUẬT KỊCH BẢN)
    # -------------------------------------------------------------------------
    from scipy.stats import norm
    def apply_nqt(df):
        ranked = df.rank(axis=1, method='average')
        uniform = (ranked - 0.5) / df.shape[1]
        nqt = pd.DataFrame(norm.ppf(uniform), index=df.index, columns=df.columns)
        return nqt.replace([np.inf, -np.inf], 0).fillna(0)

    # BẢNG 1: Dành cho Mạng Nơ-ron (Đã qua NQT Cross-Sectional)
    core_list = [prob0_df, prob1_df, prob2_df, vol_20d_df, ret_20d_df, vol_ratio_df, mkt_ret5_df, mkt_ret20_df, mkt_vol_df, dist_ma20_df, momentum_3d_df]
    ai_features_df = pd.concat([apply_nqt(df) for df in core_list], axis=1).fillna(0)

    # BẢNG 2: Kho vũ khí cho kịch bản của con người (AI không được thấy)

    list_strategies = [vol_df ,low_df ,close_df, 
                       ema_df_20, ema_df_50, ema_df_200, 
                       bb_lower_df, bb_middle_df ,bb_upper_df,
                       rsi_df, hist_df, macd_df,
                       sma_vol_20_df,
                       slope_ema20_3_df, slope_sma5_3_df, 
                       slope_sma5_50_df, slope_sma5_200_df,
                       is_hammer_df.astype(float), is_bull_engulf_df.astype(float),
                       lowest_low_5_df, highest_high_5_df ,highest_high_10_df, highest_high_20_df,
                       fib_382_df, fib_500_df, fib_618_df, is_upward_wave_df, fib_ext_127_df, fib_ext_161_df,
                       sup_df, res_df,
                       bb_expanding_df,
                       is_accumulation_df,
                       ]

    strategies_features_df = pd.concat(list_strategies, axis=1).fillna(0)

    num_strategies_features = 33

    # HỢP NHẤT TOÀN BỘ CHỈ BÁO VÀO AI FEATURES (Áp dụng NQT cho mảng chiến lược đưa vào AI)
    ai_strategies_df = pd.concat([apply_nqt(df) for df in list_strategies], axis=1).fillna(0)
    ai_features_df = pd.concat([ai_features_df, ai_strategies_df], axis=1)
    num_ai_features = 10
    # Đồng bộ độ dài
    returns_df, ai_features_df = returns_df.align(ai_features_df, axis=0, join='inner')
    returns_df, strategies_features_df = returns_df.align(strategies_features_df, axis=0, join='inner')
    tickers = returns_df.columns.tolist()

    dates = returns_df.index.strftime('%d/%m/%Y').tolist()
    return returns_df, ai_features_df, strategies_features_df, weights_dim, tickers, num_strategies_features, dates


# ## LUẬT 1, 3, 5, 6: MÔI TRƯỜNG ĐẦU TƯ (GYM ENVIRONMENT)

# ## Lớp này mô phỏng lại Sàn chứng khoán. Nơi AI sẽ thử nghiệm các lệnh Mua/Bán và nhận Phạt/Thưởng (Reward).

log("Create Gym Environment")
class AdvancedPortfolioEnv(gym.Env):
        def __init__(self, returns_df, ai_features_df, script_features_df, weights_dim, num_script_features, tickers=None, step_size=1, cost_rate=CONFIG.COST_RATE, is_test=False, dates=None):

            super().__init__()
            self.returns_arr = np.exp(returns_df.values) - 1.0 

            # Lưu 2 mảng tách biệt
            self.features_arr = ai_features_df.values
            self.script_arr = script_features_df.values

            self.weights_dim = weights_dim
            self.num_script_features = num_script_features
            self.n_steps = len(self.returns_arr)

            self.step_size = step_size
            self.cost_rate = cost_rate
            self.is_test = is_test 
            self.tickers = tickers
            self.dates = dates
            self.prev_weights = np.zeros(self.weights_dim)
            self.high_watermark = 1.0
            self.current_portfolio_value = 1.0

            self.action_space = spaces.Box(low=0, high=1, shape=(self.weights_dim,), dtype=np.float32)
            # Báo cho AI biết là nó chỉ cần học 10 tính năng (vì ai_features_df có 10 cột)
            self.num_features = self.features_arr.shape[1] // self.weights_dim
            self.observation_space = spaces.Box(low=-np.inf, high=np.inf, shape=(self.weights_dim, self.num_features), dtype=np.float32)

            self.current_step = 0
            self.weights = np.zeros(self.weights_dim)
            self.entry_prices = np.zeros(self.weights_dim)
            self.entry_scenarios = np.zeros(self.weights_dim)
            self.entry_stages = np.zeros(self.weights_dim)
            self.weight_unlocked = np.zeros(self.weights_dim)
            self.locked_weights = np.zeros((3, self.weights_dim)) # FIFO Queue
            self.avg_entry_prices = np.zeros(self.weights_dim)
            self.initial_capital = 100_000_000 # Giả lập vốn 100 triệu
            self.current_capital = self.initial_capital
            self.peak_nav = self.initial_capital
            self.prev_drawdown = 0.0
        def reset(self, seed=None, options=None):
            self.current_step = 0
            self.weights = np.zeros(self.weights_dim)
            self.weight_unlocked = np.zeros(self.weights_dim)
            self.locked_weights = np.zeros((3, self.weights_dim))
            self.avg_entry_prices = np.zeros(self.weights_dim)
            self.current_capital = self.initial_capital
            self.peak_nav = self.initial_capital
            self.prev_drawdown = 0.0
            return self._get_obs(), {}

        def _get_obs(self):
            idx = min(self.current_step, self.n_steps - 1)
            obs_1d = self.features_arr[idx]
            obs_2d = obs_1d.reshape(self.num_features, self.weights_dim).T
            return obs_2d.astype(np.float32)

        def step(self, action):
            current_obs = self._get_obs()
            idx = min(self.current_step, self.n_steps - 1)

            current_scripts = self.script_arr[idx].reshape(self.num_script_features, self.weights_dim).T
            prev_idx = max(0, idx - 1)
            prev_scripts = self.script_arr[prev_idx].reshape(self.num_script_features, self.weights_dim).T

            # V6 Fix: Xóa Kịch bản Hard-code
            # V6 Fix: Tuyến tính hóa thay vì Softmax
            # Normalize action và sửa lỗi logic Zero-out của bản cũ
            action = np.clip(action, 0, 1)
            action_sum = np.sum(action)
            if action_sum > 1.0:
                action = action / action_sum

            # [HÀNG ĐỢI FIFO] Cập nhật hàng về tài khoản
            self.weight_unlocked += self.locked_weights[0]
            self.locked_weights[0] = self.locked_weights[1]
            self.locked_weights[1] = self.locked_weights[2]
            self.locked_weights[2] = 0.0

            # [FIFO] Áp dụng luật khoá: Chỉ được bán tối đa bằng số hàng đã về (unlocked)
            max_sell = self.weight_unlocked
            action = np.maximum(action, self.weights - max_sell)

            # Nếu vì ép bán ít đi mà tổng action > 1.0, ta phải giảm bớt lượng mua (buy)
            action_sum = np.sum(action)
            if action_sum > 1.0:
                buys = np.maximum(0, action - self.weights)
                sells = np.maximum(0, self.weights - action)
                excess = action_sum - 1.0
                total_buys = np.sum(buys)
                if total_buys > 0:
                    reduction_factor = 1.0 - (excess / total_buys)
                    buys = buys * reduction_factor
                action = self.weights - sells + buys

            # [FIFO] Cập nhật lại kho sau khi mua/bán
            delta = action - self.weights
            sells = np.maximum(0, -delta)
            buys = np.maximum(0, delta)

            self.weight_unlocked -= sells

            T_SETTLE = getattr(CONFIG, 'T_PLUS_SETTLEMENT', 3)
            if T_SETTLE == 0:
                self.weight_unlocked += buys
            else:
                idx = min(T_SETTLE - 1, 2)
                self.locked_weights[idx] += buys

            turnover = np.sum(np.abs(action - self.weights))
            cost = self.cost_rate * turnover

            self.prev_weights = self.weights.copy()
            self.weights = action

            # SỬA LỖI LOOKAHEAD BIAS: Mô hình phải ăn lợi nhuận của ngày T+3
            # (Thị trường VN là T+2.5, làm tròn T+3 để thuận tiện dữ liệu)
            if self.current_step + 3 < self.n_steps:
                next_return = self.returns_arr[self.current_step + 3]
            elif self.current_step + 1 < self.n_steps:
                next_return = self.returns_arr[self.current_step + 1]
            else:
                next_return = np.zeros(self.weights_dim)

            market_ret = np.mean(next_return)
            daily_ret = np.sum(self.weights * next_return) - cost

            self.current_portfolio_value = self.current_portfolio_value * (1 + daily_ret)

            # V7.2 Fix: Hàm Reward mượt mà, tránh sợ hãi cực độ

            base_reward = daily_ret * 100 
            if daily_ret < 0:
                base_reward *= 2.0  # Phạt gấp 2 lần nếu lỗ

            reward = base_reward

            if getattr(self, 'is_test', False):
                date_str = self.dates[self.current_step] if getattr(self, 'dates', None) else f'Step {self.current_step}'
                # Tracker for detailed logs
                trade_logs = []
                current_prices = current_scripts[:, 2] # close price is index 2
                for i in range(self.weights_dim):
                    old_w = self.prev_weights[i]
                    new_w = self.weights[i]
                    if new_w > old_w + 0.001: # Mua thêm
                        added_w = new_w - old_w
                        if old_w < 0.001:
                            self.avg_entry_prices[i] = current_prices[i]
                        else:
                            self.avg_entry_prices[i] = (old_w * self.avg_entry_prices[i] + added_w * current_prices[i]) / new_w
                        trade_logs.append(f"🟢 MUA {self.tickers[i]}: Tỷ trọng {old_w*100:.1f}% -> {new_w*100:.1f}% | Giá khớp: {current_prices[i]:.2f}")
                    elif new_w < old_w - 0.001: # Bán
                        sold_w = old_w - new_w
                        if self.avg_entry_prices[i] > 0:
                            profit_pct = (current_prices[i] - self.avg_entry_prices[i]) / self.avg_entry_prices[i]
                            profit_pct -= self.cost_rate # Tính luôn thuế phí
                            profit_money = (sold_w * self.current_capital) * profit_pct
                            icon = "🔥 CHỐT LỜI" if profit_pct > 0 else "🩸 CẮT LỖ"
                            trade_logs.append(f"{icon} {self.tickers[i]}: Tỷ trọng {old_w*100:.1f}% -> {new_w*100:.1f}% | Giá bán: {current_prices[i]:.2f} | Giá vốn: {self.avg_entry_prices[i]:.2f} | Lãi/Lỗ: {profit_pct*100:+.2f}% ({profit_money:+,.0f} đ)")
                        if new_w < 0.001:
                            self.avg_entry_prices[i] = 0
                # Cập nhật vốn hiện tại (NAV)
                prev_capital = self.current_capital
                self.current_capital = self.current_capital * (1 + daily_ret)
                daily_capital_change = self.current_capital - prev_capital
                weight_sum = np.sum(self.weights)
                if len(trade_logs) > 0 or weight_sum > 0.01:
                    cash_weight = max(0.0, 1.0 - weight_sum)
                    allocations = [f"{self.tickers[k]}: {self.weights[k]*100:.1f}%" for k in range(self.weights_dim) if self.weights[k] > 0.01]
                    alloc_str = ", ".join(allocations) if allocations else "Trống"
                    print(f"\n[{date_str}] 📅 BÁO CÁO GIAO DỊCH:")
                    for log_msg in trade_logs:
                        print(f"  > {log_msg}")
                    print(f"  💵 Tỷ trọng: Tiền mặt {cash_weight*100:.1f}% | Cổ phiếu: [{alloc_str}]")
                    print(f"  📈 Tài sản: {daily_capital_change:+,.0f} đ | Hiệu suất ngày: {daily_ret*100:+.2f}% | Tổng NAV: {self.current_capital:,.0f} đ")

                    # THÊM MỚI: In ra số tiền phân bổ thực tế (Lot size) thông qua pipeline chuẩn
                    capital_for_real = self.current_capital
                    print(f"  [+] KHUYẾN NGHỊ ĐI LỆNH THỰC TẾ (Vốn {capital_for_real:,.0f} đ - Lô 100):")
                    
                    real_alloc = allocate_portfolio_real(
                        tickers=self.tickers, 
                        w=self.weights, 
                        p=current_prices, 
                        C=capital_for_real, 
                        LOT_SIZE=100, 
                        tracking_err_threshold=0.3
                    )
                    
                    if real_alloc['warning_flag']:
                        print(f"      ⚠️ CẢNH BÁO: {real_alloc['warning_msg']}")
                        
                    for item in real_alloc['allocations']:
                        print(f"      - NẮM GIỮ / MUA {item['ma_co_phieu']}: {item['so_co_phieu']:,} cổ phiếu (Giá {item['gia_hien_tai']:,.0f}) => Tổng tiền {item['so_tien_chi']:,.0f} đ")
                        
                    print(f"      - 💵 TIỀN MẶT CÒN DƯ (Thực tế): {real_alloc['cash_left']:,.0f} đ")
                    print(f"      - 📉 Tracking Error: {real_alloc['tracking_error']:.4f}")
            # ------------ HỆ THỐNG PHẠT DRAWDOWN & GAME OVER ------------
            self.peak_nav = max(self.peak_nav, getattr(self, 'current_capital', 100_000_000))
            drawdown = (self.peak_nav - getattr(self, 'current_capital', 100_000_000)) / self.peak_nav
            prev_dd = getattr(self, 'prev_drawdown', 0.0)
            if drawdown > prev_dd:
                dd_increase = drawdown - prev_dd
                reward -= (dd_increase * 1000)
            self.prev_drawdown = drawdown
            force_terminate = False
            if drawdown > 0.30:
                reward -= 100
                force_terminate = True
                if getattr(self, 'is_test', False):
                    print(f"💀 GAME OVER: Cháy tài khoản! Drawdown {drawdown*100:.1f}% tại Step {self.current_step}")
            # -----------------------------------------------------------
            self.current_step += 1
            done = (self.current_step >= self.n_steps - 1) or force_terminate
            return self._get_obs(), float(reward), done, False, {'net_return': daily_ret}

# ## MẠNG NƠ-RON TRÍ TUỆ NHÂN TẠO (NEURAL NETWORK STRUCTURE)

# ## Đây là "Bộ Não" thực sự của AI. Mạng Nơ-ron này chịu trách nhiệm Đọc dữ liệu (Extractor).
log("NEURAL NETWORK STRUCTURE")
class AdvancedTickerExtractor(BaseFeaturesExtractor):
        def __init__(self, observation_space: spaces.Box, features_dim: int = 256):
            super().__init__(observation_space, features_dim)
            num_tickers = observation_space.shape[0] # 46 mã
            num_features_per_ticker = observation_space.shape[1] # 11 tính năng
            # Tầng 1 (Local): Học phân tích RIÊNG LẺ
            self.ticker_net = nn.Sequential(
                nn.Linear(num_features_per_ticker, 32),
                nn.ReLU(),
                # nn.Dropout(0.2),
                nn.Linear(32, 16),
                nn.ReLU()
            )
            # --- CẢI TIẾN: Tầng 1.5 (Attention) ---
            # Cho phép các cổ phiếu giao tiếp và so sánh sức mạnh với nhau
            self.attention = nn.MultiheadAttention(embed_dim=16, num_heads=4, batch_first=True)
            self.layer_norm = nn.LayerNorm(16)
            # --------------------------------------
            # Tầng 2 (Global): Tổng hợp ra quyết định
            self.global_net = nn.Sequential(
                nn.Linear(num_tickers * 16, features_dim),
                nn.ReLU()
            )

        def forward(self, observations: th.Tensor) -> th.Tensor:
            batch_size, num_tickers, num_features = observations.shape

            # 1. Trích xuất Local
            obs_reshaped = observations.view(batch_size * num_tickers, num_features)
            ticker_features = self.ticker_net(obs_reshaped)

            # Đưa về dạng 3D: (Batch, Số_Mã, Đặc_trưng) để chạy Attention
            ticker_features = ticker_features.view(batch_size, num_tickers, 16) 

            # 2. --- CẢI TIẾN: Cross-Ticker Attention ---
            # Các mã cổ phiếu "nhìn" nhau để tìm ra con mạnh nhất (Leader)
            attn_out, _ = self.attention(ticker_features, ticker_features, ticker_features)

            # Residual connection + LayerNorm (Bắt buộc phải có để đạo hàm không bị nổ))
            ticker_features = self.layer_norm(ticker_features + attn_out)
            # --------------------------------------------

            # 3. Đưa Tầng 1.5 vào Tầng 22
            flattened_features = ticker_features.view(batch_size, num_tickers * 16)
            global_features = self.global_net(flattened_features)

            return global_features


def run_training_cycle():
    from stable_baselines3.common.vec_env import VecNormalize
    log("\n[LUẬT 4] KHỞI ĐỘNG HỆ THỐNG HUẤN LUYỆN...")

    TRAINING_MODE = getattr(CONFIG, 'TRAINING_MODE', 'fast_split') # 'fast_split' or 'rolling_window'

    total_days = len(returns_df)

    model = None

    policy_kwargs = dict(
        features_extractor_class=AdvancedTickerExtractor,
        features_extractor_kwargs=dict(features_dim=CONFIG.FEATURES_DIM),
        net_arch=dict(pi=CONFIG.NET_ARCH, vf=CONFIG.NET_ARCH)
    )

    all_test_returns = []

    if TRAINING_MODE == 'fast_split':
        log(f"\n=======================================================")
        log(f"--- CHẾ ĐỘ HỌC NHANH (FAST SPLIT: 70% Train, 15% Val, 15% Test) ---")

        train_ratio = 0.7
        val_ratio = 0.15

        train_end = int(total_days * train_ratio)
        val_end = int(total_days * (train_ratio + val_ratio))

        returns_train = returns_df.iloc[:train_end]
        ai_train = ai_features_df.iloc[:train_end]
        strategies_train = strategies_features_df.iloc[:train_end]
        dates_train = dates[:train_end]

        returns_val = returns_df.iloc[train_end:val_end]
        ai_val = ai_features_df.iloc[train_end:val_end]
        strategies_val = strategies_features_df.iloc[train_end:val_end]
        dates_val = dates[train_end:val_end]

        returns_test = returns_df.iloc[val_end:]
        ai_test = ai_features_df.iloc[val_end:]
        strategies_test = strategies_features_df.iloc[val_end:]
        dates_test = dates[val_end:]

        train_env = DummyVecEnv([lambda: AdvancedPortfolioEnv(
            returns_train, ai_train, strategies_train, weights_dim, num_strategies_features, tickers=tickers, dates=dates_train
        )])
        train_env = VecNormalize(train_env, norm_obs=False, norm_reward=True, clip_reward=10.0)

        log(f"Khởi tạo Mạng Nơ-ron AI (Train: {len(dates_train)} days, Val: {len(dates_val)} days, Test: {len(dates_test)} days)...")
        model = PPO("MlpPolicy", train_env, 
                    policy_kwargs=policy_kwargs, 
                    verbose=0, 
                    n_steps=CONFIG.N_STEPS,
                    learning_rate=CONFIG.LEARNING_RATE,
                    ent_coef=CONFIG.ENT_COEF,
                    batch_size=CONFIG.BATCH_SIZE)
        
        log("\n[CURRICULUM LEARNING] Bắt đầu huấn luyện theo từng cấp độ độ trễ (T+0 -> T+1 -> T+3)...")

        CONFIG.T_PLUS_SETTLEMENT = 0
        log("Giai đoạn 1: Huấn luyện với T+0 (100,000 steps)...")
        model.learn(total_timesteps=10000, reset_num_timesteps=False)

        CONFIG.T_PLUS_SETTLEMENT = 1
        log("Giai đoạn 2: Huấn luyện với T+1 (100,000 steps)...")
        model.learn(total_timesteps=10000, reset_num_timesteps=False)

        CONFIG.T_PLUS_SETTLEMENT = 3
        log("Giai đoạn 3: Huấn luyện với T+3 (300,000 steps)...")
        model.learn(total_timesteps=30000, reset_num_timesteps=False)

        model.save(os.path.join(save_dir, "AI_Brain.zip"))
        train_env.save(os.path.join(save_dir, "vec_normalize.pkl"))

        log(f"\nĐang chạy Backtest trên Test Set (CÓ TÍNH PHÍ GIAO DỊCH {CONFIG.COST_RATE * 100}%)...")
        log("-------------------------------------------------------")

        test_env = DummyVecEnv([lambda: AdvancedPortfolioEnv(
            returns_test, ai_test, strategies_test, weights_dim, num_strategies_features, tickers=tickers, dates=dates_test, is_test=True
        )])
        test_env = VecNormalize.load(os.path.join(save_dir, "vec_normalize.pkl"), test_env)
        test_env.training = False
        test_env.norm_reward = False
        obs = test_env.reset()

        done = [False]
        while not done[0]:
            action, _states = model.predict(obs, deterministic=True)
            obs, reward, done, info = test_env.step(action)
            if 'net_return' in info[0]:
                all_test_returns.append(info[0]['net_return'])

        total_profit = (np.prod(1 + np.array(all_test_returns)) - 1) * 100
        log(f"\n🏆 TỔNG LỢI NHUẬN TEST SET: {total_profit:+.2f}%")

    elif TRAINING_MODE == 'rolling_window':
        train_window = getattr(CONFIG, 'TRAIN_WINDOW', 252)
        test_window = getattr(CONFIG, 'TEST_WINDOW', 21)

        current_start = 0
        fold_idx = 1

        while current_start + train_window < total_days:
            train_start = current_start
            train_end = current_start + train_window
            test_start = train_end
            test_end = min(test_start + test_window, total_days)

            if test_end - test_start < 2:
                break

            log(f"\n=======================================================")
            log(f"--- CHU KỲ {fold_idx}: HỌC {dates[train_start]} -> {dates[train_end-1]} | THỰC CHIẾN: {dates[test_start]} -> {dates[test_end-1]} ---")

            returns_train = returns_df.iloc[train_start:train_end]
            ai_train = ai_features_df.iloc[train_start:train_end]
            strategies_train = strategies_features_df.iloc[train_start:train_end]
            dates_train = dates[train_start:train_end]

            returns_test = returns_df.iloc[test_start:test_end]
            ai_test = ai_features_df.iloc[test_start:test_end]
            strategies_test = strategies_features_df.iloc[test_start:test_end]
            dates_test = dates[test_start:test_end]

            train_env = DummyVecEnv([lambda: AdvancedPortfolioEnv(
                returns_train, ai_train, strategies_train, weights_dim, num_strategies_features, tickers=tickers, dates=dates_train
            )])

            if model is None:
                log("Khởi tạo Mạng Nơ-ron AI hoàn toàn mới...")
                train_env = VecNormalize(train_env, norm_obs=False, norm_reward=True, clip_reward=10.0)
                model = PPO("MlpPolicy", train_env, 
                    policy_kwargs=policy_kwargs, 
                    verbose=0, 
                    n_steps=CONFIG.N_STEPS,
                    learning_rate=CONFIG.LEARNING_RATE,
                    ent_coef=CONFIG.ENT_COEF,
                    batch_size=CONFIG.BATCH_SIZE,
                    use_sde=CONFIG.USE_SDE,
                    sde_sample_freq=CONFIG.SDE_SAMPLE_FREQ)
            else:
                log("Nạp kiến thức cũ, chuyển Sàn môi trường để học tiếp (Continual Learning)...")
                train_env = VecNormalize.load(os.path.join(save_dir, "vec_normalize.pkl"), train_env)
                train_env.training = True
                train_env.norm_reward = True
                model.set_env(train_env)

            log("\n[CURRICULUM LEARNING] Bắt đầu huấn luyện theo từng cấp độ độ trễ (T+0 -> T+1 -> T+3)...")

            CONFIG.T_PLUS_SETTLEMENT = 0
            log("Giai đoạn 1: Huấn luyện với T+0 (1,000,000 steps)...")
            model.learn(total_timesteps=1000000, reset_num_timesteps=False)

            CONFIG.T_PLUS_SETTLEMENT = 1
            log("Giai đoạn 2: Huấn luyện với T+1 (1,000,000 steps)...")
            model.learn(total_timesteps=1000000, reset_num_timesteps=False)

            CONFIG.T_PLUS_SETTLEMENT = 3
            log("Giai đoạn 3: Huấn luyện với T+3 (3,000,000 steps)...")
            model.learn(total_timesteps=3000000, reset_num_timesteps=False)

            model.save(os.path.join(save_dir, "AI_Brain.zip"))
            train_env.save(os.path.join(save_dir, "vec_normalize.pkl"))

            log(f"Đang chạy Backtest thực chiến (CÓ TÍNH PHÍ GIAO DỊCH {CONFIG.COST_RATE * 100}%)...")
            log("-------------------------------------------------------")

            test_env = DummyVecEnv([lambda: AdvancedPortfolioEnv(
                returns_test, ai_test, strategies_test, weights_dim, num_strategies_features, tickers=tickers, dates=dates_test, is_test=True
            )])
            obs = test_env.reset()

            done = [False]
            fold_returns = []
            while not done[0]:
                action, _states = model.predict(obs, deterministic=True)
                obs, reward, done, info = test_env.step(action)
                if 'net_return' in info[0]:
                    all_test_returns.append(info[0]['net_return'])
                    fold_returns.append(info[0]['net_return'])


            # Tính lợi nhuận lũy kế cho chu kỳ hiện tại
            fold_profit = (np.prod(1 + np.array(fold_returns)) - 1) * 100
            log(f"💰 KẾT QUẢ CHU KỲ {fold_idx}: Lợi nhuận thực chiến = {fold_profit:+.2f}%")
            log("="*55 + "\n")
            current_start += test_window
            fold_idx += 1


        total_profit = (np.prod(1 + np.array(all_test_returns)) - 1) * 100
        log(f"\n🏆 TỔNG LỢI NHUẬN BACKTEST TOÀN BỘ THỜI GIAN: {total_profit:+.2f}%")
        log(f"\nĐã lưu bộ não AI mới nhất vào {getattr(CONFIG, 'SAVE_MODEL_PATH', 'AI_Brain.zip')}. Có thể dùng trực tiếp cho Live Trading ngày mai!")

    # --- Centralized Leaderboard Logger ---

    log_file = os.path.join(root_dir, "output", 'training_leaderboard.csv')
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    old_model_name = os.path.join(save_dir, "AI_Brain.zip")
    new_model_name = os.path.join(save_dir, f"AI_Brain_v7_Seed{seed_val}_Profit_{total_profit:.2f}.zip")

    if os.path.exists(old_model_name):
        shutil.copy(old_model_name, new_model_name)

    # Tạo dict chứa các thông số cơ bản
    new_row = {
        'Timestamp': timestamp,
        'Seed': seed_val,
        'Profit (%)': round(total_profit, 2),
        'Model Path': new_model_name,
        'Total Features': ai_features_df.shape[1] // weights_dim,
    }

    # Tự động quét và lấy toàn bộ các tham số trong class CONFIG
    for k in dir(CONFIG):
        blacklist_cols = ['TEST_WINDOW', 'TRAINING_MODE', 'TRAINING_TIMESTEPS', 'TRAIN_WINDOW']
        if not k.startswith('__') and k not in blacklist_cols:
            new_row[k] = getattr(CONFIG, k)

    # Đọc file cũ nếu có và nối thêm dòng mới (Pandas tự xử lý việc thiếu cột của dữ liệu cũ)
    if os.path.exists(log_file):
        try:
            df = pd.read_csv(log_file)
            df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
        except:
            df = pd.DataFrame([new_row])
    else:
        df = pd.DataFrame([new_row])

    df = df.drop(columns=[c for c in blacklist_cols if c in df.columns], errors='ignore')

    df.to_csv(log_file, index=False)

    log(f"🎯 Đã lưu log tự động cấu hình vào Leaderboard! Lợi nhuận: {total_profit:.2f}% | Model: {new_model_name}")

def run_auto_tuning(n_trials=10):
    log(f"=== BẮT ĐẦU CHẠY {n_trials} THỬ NGHIỆM (AUTO TUNING) ===")
    for i in range(n_trials):
        global seed_val
        seed_val = random.randint(1, 10000)
        log(f"\n{'='*60}")
        log(f"🚀 THỬ NGHIỆM {i+1}/{n_trials} | Seed: {seed_val}")
        log(f"{'='*60}")
        th.manual_seed(seed_val)
        np.random.seed(seed_val)
        random.seed(seed_val)

        # Thay đổi các tham số ngẫu nhiên
        CONFIG.SEED = seed_val
        CONFIG.LEARNING_RATE = random.choice([0.00001, 0.00005, 0.0001])
        CONFIG.ENT_COEF = random.choice([0.001, 0.005, 0.01])
        CONFIG.BATCH_SIZE = random.choice([64, 90, 128])
        CONFIG.N_STEPS = random.choice([512, 1024, 2048])
        CONFIG.FEATURES_DIM = random.choice([64 ,128 ,256, 512])
        CONFIG.SDE_SAMPLE_FREQ = random.randint(1, 5)
        log(f"🛠️  Params: SEED={CONFIG.SEED} | LR={CONFIG.LEARNING_RATE} | ENT={CONFIG.ENT_COEF} | BATCH={CONFIG.BATCH_SIZE} | STEPS={CONFIG.N_STEPS} | FEATURES DIMENSION={CONFIG.FEATURES_DIM} | SDE SAMPLE FREQ={CONFIG.SDE_SAMPLE_FREQ}")
        run_training_cycle()

if __name__ == "__main__":
    returns_df, ai_features_df, strategies_features_df, weights_dim, tickers, num_strategies_features, dates = load_data()

    # ==========================================
    # CÔNG TẮC BẬT/TẮT AUTO TUNING
    # ==========================================
    ENABLE_AUTO_TUNING = True  # Đổi thành True để chạy N lần tự động đổi tham số
    N_TRIALS = 10  # Số lần muốn chạy

    if ENABLE_AUTO_TUNING:
        run_auto_tuning(n_trials=N_TRIALS)
    else:
        run_training_cycle()
