import pandas as pd
import numpy as np
import os

def get_circuit_breaker_flags(dates):
    # Lấy đường dẫn tới file vn60
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.abspath(os.path.join(script_dir, "..", ".."))
    m1_path = os.path.join(root_dir, "ai_core", "data", "processed", "m1_vn60.csv")
    
    if not os.path.exists(m1_path):
        m1_path = os.path.join(root_dir, "data", "processed", "m1_vn60.csv")
        
    df_m1 = pd.read_csv(m1_path)
    df_m1['time'] = pd.to_datetime(df_m1['time']).dt.normalize()
    
    # Tạo VNINDEX proxy (trung bình giá và tổng khối lượng của 60 mã)
    vnindex = df_m1.groupby('time').agg({'close':'mean', 'volume':'sum'}).reset_index()
    vnindex = vnindex.sort_values('time').set_index('time')
    
    # 1. EMAs
    vnindex['EMA20'] = vnindex['close'].ewm(span=20, adjust=False).mean()
    vnindex['EMA50'] = vnindex['close'].ewm(span=50, adjust=False).mean()
    vnindex['EMA200'] = vnindex['close'].ewm(span=200, adjust=False).mean()
    
    # 2. MACD
    ema12 = vnindex['close'].ewm(span=12, adjust=False).mean()
    ema26 = vnindex['close'].ewm(span=26, adjust=False).mean()
    vnindex['MACD'] = ema12 - ema26
    
    # 3. RSI
    delta = vnindex['close'].diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)
    avg_gain = gain.ewm(alpha=1/14, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1/14, adjust=False).mean()
    rs = avg_gain / avg_loss
    vnindex['RSI'] = 100 - (100 / (1 + rs))
    
    # 4. Hỗ trợ cứng (Đáy thấp nhất 60 phiên)
    vnindex['Strong_Sup'] = vnindex['close'].rolling(60).min()
    
    # 5. Khối lượng giảm liên tục (MA5 Vol < MA20 Vol)
    vnindex['Vol_MA5'] = vnindex['volume'].rolling(5).mean()
    vnindex['Vol_MA20'] = vnindex['volume'].rolling(20).mean()
    
    # Điều kiện Hold Cash
    vnindex['Hold_Cash'] = (vnindex['EMA20'] < vnindex['EMA50']) & \
                           (vnindex['EMA50'] < vnindex['EMA200']) & \
                           (vnindex['MACD'] < 0) & \
                           (vnindex['RSI'] < 50) & \
                           (vnindex['close'] < vnindex['Strong_Sup'].shift(1) * 1.02) & \
                           (vnindex['Vol_MA5'] < vnindex['Vol_MA20'])
                           
    vnindex = vnindex.fillna(False)
    
    # Chuyển index thành chuỗi ngày dd/mm/yyyy để map với mảng dates
    vnindex.index = vnindex.index.strftime('%d/%m/%Y')
    
    # Tạo danh sách cờ Hold_Cash theo đúng thứ tự của dates truyền vào
    hold_cash_flags = []
    for d in dates:
        if d in vnindex.index:
            hold_cash_flags.append(bool(vnindex.loc[d, 'Hold_Cash']))
        else:
            hold_cash_flags.append(False)
            
    return hold_cash_flags
