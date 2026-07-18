import pandas as pd
import re
import os
import vnstock
import pandas as pd
import sys
sys.stdout.reconfigure(encoding='utf-8')

ref = vnstock.Reference()
df = ref.equity.list()
df.to_csv('all_stocks_icb.csv', index=False, encoding='utf-8-sig')
print(df.columns)
if 'industry' in df.columns:
    print(df['industry'].unique())
elif 'icb_code' in df.columns:
    print(df['icb_code'].unique())
elif 'icb_name' in df.columns:
    print(df['icb_name'].unique())
else:
    print("Columns are:", df.columns)


script_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(script_dir, ".."))
folder_path = os.path.join(root_dir, "data", "processed")
# Read mapping.txt to get the 46 symbols
with open(r'c:\Users\ADMIN\Desktop\Kaggle\docs\mapping.txt', 'r', encoding='utf-8') as f:
    content = f.read()

symbols = re.findall(r'^-\s+([A-Z0-9]{3}):', content, flags=re.MULTILINE)
if not symbols:
    symbols = re.findall(r'^([A-Z0-9]{3}):\s', content, flags=re.MULTILINE)
symbols = list(set(symbols))

df_icb = pd.read_csv(r'c:\Users\ADMIN\Desktop\Kaggle\src\data_collection\industries.csv')
# filter level 2 or 3
df_icb_level = df_icb[df_icb['icb_level'] == 2]

mapping = []
for sym in symbols:
    row = df_icb_level[df_icb_level['symbol'] == sym]
    if not row.empty:
        mapping.append({'symbol': sym, 'icb_name': row.iloc[0]['icb_name']})

df_map = pd.DataFrame(mapping)
print(df_map.groupby('icb_name').size())
