import pandas as pd
df = pd.read_csv('ai_core/output/detailed_transaction_log.csv')
sells = df[df['Loại Lệnh'].isin(['CHỐT LỜI', 'CẮT LỖ'])].copy()
sells['Lãi_Lỗ'] = sells['Lãi/Lỗ (%)'].str.replace('%', '').astype(float)
wins = sells[sells['Lãi_Lỗ'] > 0]
losses = sells[sells['Lãi_Lỗ'] < 0]
print(f'Total Trades: {len(df)}')
print(f'Total Sells: {len(sells)}')
if len(sells) > 0:
    print(f'Win Rate: {len(wins)/len(sells)*100:.2f}%')
print(f'Avg Win: {wins["Lãi_Lỗ"].mean():.2f}%')
print(f'Avg Loss: {losses["Lãi_Lỗ"].mean():.2f}%')
print(f'Total Fees: {df["Phí GD"].sum():,.0f} VND')
