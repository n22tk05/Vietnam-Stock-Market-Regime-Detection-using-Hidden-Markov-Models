import os
import sys

# Bypass vnstock Community Edition limits (such as 8-year OHLCV and quarter limits)
try:
    import vnai
    import vnai.beam.patching
    vnai.beam.patching.apply_all_patches = lambda *args, **kwargs: {}
except Exception:
    pass

import pandas as pd
import numpy as np
import datetime
import time

import argparse

# Configure stdout for UTF-8
sys.stdout.reconfigure(encoding='utf-8')

# Đường dẫn tương đối an toàn dựa trên vị trí file script
script_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(script_dir, ".."))
RAW_DATA_DIR = os.path.join(root_dir, "data", "stocks")
BASE_DIR = os.path.join(root_dir)
os.makedirs(RAW_DATA_DIR, exist_ok=True)

parser = argparse.ArgumentParser()
parser.add_argument("--date", type=str, default=None, help="Target end date")
args = parser.parse_args()

START_DATE = '2016-11-10'
END_DATE = args.date if args.date else datetime.datetime.now().strftime('%Y-%m-%d') 
MIN_SESSIONS = 2300
sources =['kbs', 'msn', 'vci']
def log(msg):
    print(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}")

def download_ticker(symbol):
    try:
        import vnstock
        out_path = os.path.join(RAW_DATA_DIR, f"{symbol}.csv")
        current_start = START_DATE
        old_df = pd.DataFrame()
        if os.path.exists(out_path):
            old_df = pd.read_csv(out_path)
            old_date_col = 'time' if 'time' in old_df.columns else ('Date' if 'Date' in old_df.columns else None)
            if old_date_col and not old_df.empty:
                old_df[old_date_col] = pd.to_datetime(old_df[old_date_col])
                last_date = old_df[old_date_col].max()
                current_start = (last_date + pd.Timedelta(days=1)).strftime('%Y-%m-%d')
                
        # Bỏ qua gọi API nếu đã lấy kịch kim tới END_DATE rồi
        if pd.to_datetime(current_start) > pd.to_datetime(END_DATE):
            df = pd.DataFrame()
        else:
            # Nghỉ 7 giây mỗi lần lấy để tránh lỗi Rate Limit (vì vnstock gọi 2 API mỗi lần tạo Quote & history)
            time.sleep(7.0)
            q = vnstock.Quote(symbol=symbol, source='kbs')
            try:
                df = q.history(start=current_start, end=END_DATE)
            except Exception as e:
                log(f"API Error for {symbol} (possibly empty data on holiday). Cooling down for 60s to avoid rate limit ban...")
                time.sleep(60)
                df = pd.DataFrame()

        if (df is not None and not df.empty) or not old_df.empty:
            if df is not None and not df.empty:
                date_col = 'time' if 'time' in df.columns else ('Date' if 'Date' in df.columns else None)
                if date_col:
                    df[date_col] = pd.to_datetime(df[date_col])
                    if not old_df.empty:
                        if old_date_col and old_date_col != date_col:
                            old_df.rename(columns={old_date_col: date_col}, inplace=True)
                        df = pd.concat([old_df, df], ignore_index=True)
            else:
                df = old_df
                date_col = 'time' if 'time' in df.columns else 'Date'
                
            if date_col:
                df = df.drop_duplicates(subset=[date_col], keep='last')
                df = df.sort_values(date_col)
                
                # Save raw data unconditionally
                df.to_csv(out_path, index=False)
                
                first_date = df[date_col].min().strftime('%Y-%m-%d')
                num_sessions = len(df)
                
                if first_date <= START_DATE and num_sessions >= MIN_SESSIONS:
                    return {
                        'symbol': symbol,
                        'status': 'SUCCESS',
                        'first_date': first_date,
                        'current_start': current_start,
                        'sessions': num_sessions
                    }
                else:
                    return {
                        'symbol': symbol,
                        'status': 'FILTERED',
                        'first_date': first_date,
                        'current_start': current_start,
                        'sessions': num_sessions
                    }
        return {'symbol': symbol, 'status': 'EMPTY'}
    except Exception as e:
        return {'symbol': symbol, 'status': 'ERROR', 'error': str(e)}

def main():
    log("==========================================")
    log("Stock Ticker Crawler & Filter Started (Rate-Limited)")
    log("Constraints:")
    log("------------------------------------------")
    log(f"Min Sessions: {MIN_SESSIONS}")
    log(f"Time Start: {START_DATE}")
    log(f"Time End: {END_DATE}")
    log("------------------------------------------")
    log("==========================================")
    
    # Load tickers
    success_path = os.path.join(BASE_DIR, "success_tickers.txt")
    all_symbols = []
    if os.path.exists(success_path):
        log(f"Loading tickers from {success_path}...")
        with open(success_path, 'r', encoding='utf-8') as f:
            all_symbols = [line.strip() for line in f if line.strip()]
            
    if not all_symbols:
        log("success_tickers.txt not found or empty. Loading tickers from VN100...")
        import vnstock
        ref = vnstock.Reference()
        vn100_series = ref.equity.list_by_group('VN100')
        all_symbols = vn100_series.tolist() if isinstance(vn100_series, pd.Series) else (
            vn100_series['symbol'].tolist() if 'symbol' in vn100_series.columns else vn100_series['ticker'].tolist()
        )
        
    all_symbols = sorted(set(all_symbols))
    log(f"Loaded {len(all_symbols)} symbols to crawl.")
    
    success_tickers = []
    filtered_tickers = []
    failed_tickers = []
    
    start_time = time.time()
    
    for idx, symbol in enumerate(all_symbols):
        completed = idx + 1
        res = download_ticker(symbol)
        
        if res['status'] == 'SUCCESS':
            success_tickers.append(res)
            log(f"[{completed}/{len(all_symbols)}] {symbol}: SUCCESS (total {res['sessions']} sessions, appended from {res['current_start']})")
        elif res['status'] == 'FILTERED':
            filtered_tickers.append(res)
            log(f"[{completed}/{len(all_symbols)}] {symbol}: FILTERED OUT (total {res['sessions']} sessions, appended from {res['current_start']})")
        elif res['status'] == 'ERROR':
            failed_tickers.append(res)
            log(f"[{completed}/{len(all_symbols)}] {symbol}: ERROR - {res['error']}")
        else:
            log(f"[{completed}/{len(all_symbols)}] {symbol}: EMPTY")
            
    elapsed = time.time() - start_time
    log("==========================================")
    log(f"Scanning completed in {elapsed:.2f} seconds.")
    log(f"Success (saved and validated): {len(success_tickers)}")
    log(f"Filtered out (saved raw only): {len(filtered_tickers)}")
    log(f"Failed/Error: {len(failed_tickers)}")
    log("==========================================")
    
    # Write list of successful tickers to a txt file
    success_path = os.path.join(BASE_DIR, "success_tickers.txt")
    with open(success_path, "w") as f:
        for t in success_tickers:
            f.write(f"{t['symbol']}\n")
    log(f"Number symbols download success: {len(success_tickers)}")
    log(f"List of successful symbols saved to {success_path}")
            
if __name__ == "__main__":
    main()
