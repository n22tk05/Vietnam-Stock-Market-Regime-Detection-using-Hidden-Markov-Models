import vnstock
import pandas as pd
import sys
import os
import subprocess
import datetime
sys.stdout.reconfigure(encoding='utf-8')

script_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(script_dir, ".."))
save_dir = os.path.join(root_dir,'data','industry')

def log(msg):
    print(f"[{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}")

log("==========================================")
log("Industry Indicator Crawler Execution Started")
log("==========================================")


ref = vnstock.Reference()
df = ref.equity.list_by_industry()
if isinstance(df, pd.DataFrame):
    output_dir = os.path.join(save_dir, "industries.csv")
    df.to_csv(output_dir, index=False, encoding='utf-8-sig')
else:
    pd.DataFrame(df).to_csv(output_dir, index=False, encoding='utf-8-sig')

log(f"Save Industry in path: {output_dir}")