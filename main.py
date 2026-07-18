with open("success_tickers.txt", 'r') as f: 
    tickers = [line.strip() for line in f]


all_symbols = ['BID', 'BMP', 'BVH', 'CII', 'CTD', 'CTG', 'DCM', 'DGW', 'DIG', 'DPM', 'DXG', 'EIB', 'FPT', 'GAS', 'GMD', 'HAG', 'HCM', 'HDC', 'HPG', 'HSG', 'HT1', 'KBC', 'KDC', 'KDH', 'MBB', 'MSN', 'MWG', 'NKG', 'NLG', 'NT2', 'PDR', 'PHR', 'PNJ', 'PVD', 'PVT', 'REE', 'SBT', 'SJS', 'SSI', 'STB', 'TCH', 'VCB', 'VHC', 'VIC', 'VNM', 'VSC']

print(len(all_symbols))
print(len(tickers))

for t in tickers:
    if t not in all_symbols:
        print(t)