export interface StockPricePoint {
  date: string;
  price: number;
}

export interface StockItem {
  ticker: string;
  name: string;
  price: number;
  predictedPrice: number;
  expectedPct: string;
  stopLoss: number;
  category: 'buy' | 'hold' | 'sell';
  isPositive: boolean;
  targetWeight: number; // e.g. 0.270
  actionText: string;
  actionClass: string;
  reason: string;
  sector: string;
  dayRange: string;
  pe: string;
  roe: string;
  rsi: string;
  attention: string;
  history?: StockPricePoint[];
}

export interface SimulatedHolding {
  ma_co_phieu: string;
  name?: string;
  so_co_phieu: number;
  gia_von: number;
  gia_hien_tai: number;
  status: 'UNLOCKED' | 'LOCKED_T1' | 'LOCKED_T2';
  shares_unlocked: number;
  shares_t1: number;
  shares_t2: number;
}

export interface SimulatedHistoryPoint {
  date: string;
  nav: number;
  cash: number;
  stock_value: number;
  daily_change?: number;
  daily_change_pct?: number;
  delta_from_start?: number;
  delta_pct_from_start?: number;
}

export interface SimulatedUserPortfolio {
  user_tier: string;
  initial_capital: number;
  current_nav: number;
  cash_left: number;
  pnl_cash: number;
  pnl_pct: number;
  holdings: SimulatedHolding[];
  history?: SimulatedHistoryPoint[];
}

export const SIMULATED_USER_10M: SimulatedUserPortfolio = {
  user_tier: "10M",
  initial_capital: 10000000,
  current_nav: 9379000.0,
  cash_left: 164000.0,
  pnl_cash: -621000.0,
  pnl_pct: -6.21,
  holdings: [
    {
      ma_co_phieu: "VND",
      name: "Chứng khoán VNDirect",
      so_co_phieu: 100,
      gia_von: 13900.0,
      gia_hien_tai: 13200.0,
      status: "UNLOCKED",
      shares_unlocked: 100,
      shares_t1: 0,
      shares_t2: 0
    },
    {
      ma_co_phieu: "DIG",
      name: "Tổng Công ty Đầu tư Phát triển Xây dựng",
      so_co_phieu: 100,
      gia_von: 9250.0,
      gia_hien_tai: 9400.0,
      status: "UNLOCKED",
      shares_unlocked: 100,
      shares_t1: 0,
      shares_t2: 0
    },
    {
      ma_co_phieu: "VSC",
      name: "Container Việt Nam",
      so_co_phieu: 100,
      gia_von: 12950.0,
      gia_hien_tai: 13150.0,
      status: "UNLOCKED",
      shares_unlocked: 100,
      shares_t1: 0,
      shares_t2: 0
    },
    {
      ma_co_phieu: "DPM",
      name: "Phân bón & Hóa chất Dầu khí",
      so_co_phieu: 100,
      gia_von: 22150.0,
      gia_hien_tai: 21900.0,
      status: "LOCKED_T1",
      shares_unlocked: 0,
      shares_t1: 100,
      shares_t2: 0
    },
    {
      ma_co_phieu: "GEX",
      name: "Tập đoàn GELEX",
      so_co_phieu: 100,
      gia_von: 21800.0,
      gia_hien_tai: 22250.0,
      status: "LOCKED_T1",
      shares_unlocked: 0,
      shares_t1: 100,
      shares_t2: 0
    },
    {
      ma_co_phieu: "HT1",
      name: "Xi măng Vicem Hà Tiên",
      so_co_phieu: 100,
      gia_von: 12300.0,
      gia_hien_tai: 12250.0,
      status: "LOCKED_T1",
      shares_unlocked: 0,
      shares_t1: 100,
      shares_t2: 0
    }
  ]
};

export interface ChartDataPoint {
  date: string;
  aiPct: number;
  bmPct: number;
}

export interface PersonalNavDataPoint {
  date: string; // "17/10/2025"
  nav: number; // e.g. 10000000 -> 9379000
  initialCapital: number; // 10000000
  benchmarkNav: number; // VN-Index benchmark equivalent
  pnlPct: number; // e.g. 0.0, -0.80, -1.90, -3.20, -5.50, -6.60, -6.21
  event?: string;
}

export const USER_PERSONAL_NAV_HISTORY: PersonalNavDataPoint[] = [
  { date: "17/10/2025", nav: 10000000, initialCapital: 10000000, benchmarkNav: 10000000, pnlPct: 0.0, event: "Nạp vốn ban đầu 10.000.000 đ" },
  { date: "18/10/2025", nav: 9920000, initialCapital: 10000000, benchmarkNav: 9970000, pnlPct: -0.80, event: "Khớp lệnh mua 6 mã danh mục" },
  { date: "19/10/2025", nav: 9810000, initialCapital: 10000000, benchmarkNav: 9940000, pnlPct: -1.90 },
  { date: "20/10/2025", nav: 9680000, initialCapital: 10000000, benchmarkNav: 9890000, pnlPct: -3.20 },
  { date: "21/10/2025", nav: 9450000, initialCapital: 10000000, benchmarkNav: 9810000, pnlPct: -5.50, event: "Áp lực điều chỉnh nhóm chứng khoán" },
  { date: "22/10/2025", nav: 9340000, initialCapital: 10000000, benchmarkNav: 9800000, pnlPct: -6.60, event: "Chạm đáy ngắn hạn (-6,60%)" },
  { date: "23/10/2025", nav: 9379000, initialCapital: 10000000, benchmarkNav: 9820000, pnlPct: -6.21, event: "Hồi phục kỹ thuật (+39.000 đ)" }
];

export interface MetricCardData {
  nav: number;
  navProfitPct: number;
  totalAllocated: number;
  availableCash: number;
  cashRatioPct: number;
  marketRegime: string;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

export interface AssessmentProfile {
  riskTolerance: 'conservative' | 'balanced' | 'growth' | 'aggressive';
  capital: number;
  holdingHorizon: 'short' | 'medium' | 'long' | 'ultra';
  experienceYears: number;
  completedAt?: string;
}

export const INITIAL_CHART_DATA: ChartDataPoint[] = [
  { date: "17/10/2025", aiPct: 0.0, bmPct: 0.0 },
  { date: "05/11/2025", aiPct: 3.4, bmPct: 1.1 },
  { date: "24/11/2025", aiPct: 6.8, bmPct: 2.5 },
  { date: "15/12/2025", aiPct: 11.2, bmPct: 4.8 },
  { date: "08/01/2026", aiPct: 16.5, bmPct: 7.2 },
  { date: "28/01/2026", aiPct: 14.8, bmPct: 5.4 },
  { date: "20/02/2026", aiPct: 22.4, bmPct: 8.9 },
  { date: "12/03/2026", aiPct: 29.1, bmPct: 11.5 },
  { date: "05/04/2026", aiPct: 27.5, bmPct: 9.8 },
  { date: "26/04/2026", aiPct: 35.6, bmPct: 13.2 },
  { date: "18/05/2026", aiPct: 41.2, bmPct: 15.6 },
  { date: "10/06/2026", aiPct: 48.9, bmPct: 17.8 },
  { date: "02/07/2026", aiPct: 53.4, bmPct: 18.9 },
  { date: "28/07/2026", aiPct: 58.06, bmPct: 19.84 }
];

export const INITIAL_TOP_STOCKS: StockItem[] = [
  { 
    ticker: "FPT", 
    name: "Công ty Cổ phần FPT", 
    price: 135200, 
    predictedPrice: 142000, 
    expectedPct: "+5.0%", 
    stopLoss: 131000,
    category: "buy",
    isPositive: true,
    targetWeight: 0.270, 
    actionText: "MUA MỚI / GIA TĂNG", 
    actionClass: "status-buy", 
    reason: "Mô hình HMM xác nhận sóng tăng công nghệ; Dòng tiền tổ chức gom ròng",
    sector: "Công nghệ thông tin • Sàn HOSE",
    dayRange: "134,500 - 136,000 đ",
    pe: "21.4x",
    roe: "28.6%",
    rsi: "62.5",
    attention: "0.342",
    history: [
      { date: "14/10", price: 131500 },
      { date: "15/10", price: 132000 },
      { date: "16/10", price: 133200 },
      { date: "17/10", price: 134000 },
      { date: "18/10", price: 134800 },
      { date: "19/10", price: 134500 },
      { date: "20/10", price: 135200 }
    ]
  },
  { 
    ticker: "MWG", 
    name: "Thế Giới Di Động", 
    price: 64200, 
    predictedPrice: 67500, 
    expectedPct: "+5.1%", 
    stopLoss: 62000,
    category: "buy",
    isPositive: true,
    targetWeight: 0.130, 
    actionText: "MUA MỚI / GIA TĂNG", 
    actionClass: "status-buy", 
    reason: "Dòng tiền tiêu dùng bán lẻ phục hồi mạnh; Tỷ lệ PPO tối ưu hóa lợi nhuận",
    sector: "Bán lẻ tiêu dùng • Sàn HOSE",
    dayRange: "63,800 - 64,500 đ",
    pe: "16.8x",
    roe: "19.4%",
    rsi: "58.2",
    attention: "0.210",
    history: [
      { date: "14/10", price: 62000 },
      { date: "15/10", price: 62500 },
      { date: "16/10", price: 63100 },
      { date: "17/10", price: 63800 },
      { date: "18/10", price: 64000 },
      { date: "19/10", price: 63700 },
      { date: "20/10", price: 64200 }
    ]
  },
  { 
    ticker: "MBB", 
    name: "Ngân hàng Quân Đội", 
    price: 24500, 
    predictedPrice: 25600, 
    expectedPct: "+4.5%", 
    stopLoss: 23800,
    category: "buy",
    isPositive: true,
    targetWeight: 0.100, 
    actionText: "MUA MỚI / GIA TĂNG", 
    actionClass: "status-buy", 
    reason: "Tăng trưởng tín dụng vượt trội ngành, định giá P/B dưới 1.1x hấp dẫn",
    sector: "Ngân hàng thương mại • Sàn HOSE",
    dayRange: "24,200 - 24,700 đ",
    pe: "5.8x",
    roe: "22.1%",
    rsi: "54.0",
    attention: "0.180"
  },
  { 
    ticker: "TCB", 
    name: "Ngân hàng Kỹ Thương", 
    price: 23800, 
    predictedPrice: 24900, 
    expectedPct: "+4.6%", 
    stopLoss: 23100,
    category: "buy",
    isPositive: true,
    targetWeight: 0.100, 
    actionText: "MUA MỚI / GIA TĂNG", 
    actionClass: "status-buy", 
    reason: "Động lực phục hồi CASA dẫn đầu hệ thống; Vùng mua an toàn theo PPO",
    sector: "Ngân hàng thương mại • Sàn HOSE",
    dayRange: "23,500 - 24,000 đ",
    pe: "6.2x",
    roe: "16.8%",
    rsi: "56.4",
    attention: "0.165"
  },
  { 
    ticker: "HPG", 
    name: "Tập đoàn Hòa Phát", 
    price: 26500, 
    predictedPrice: 27800, 
    expectedPct: "+4.9%", 
    stopLoss: 25700,
    category: "buy",
    isPositive: true,
    targetWeight: 0.100, 
    actionText: "MUA MỚI / GIA TĂNG", 
    actionClass: "status-buy", 
    reason: "Biên lợi nhuận thép tạo đáy; Dự án Dung Quất 2 sắp vận hành thương mại",
    sector: "Sản xuất Thép & Kim loại • Sàn HOSE",
    dayRange: "26,200 - 26,800 đ",
    pe: "11.5x",
    roe: "14.2%",
    rsi: "52.8",
    attention: "0.150"
  },
  { 
    ticker: "VHM", 
    name: "Vinhomes", 
    price: 41200, 
    predictedPrice: 40500, 
    expectedPct: "-1.7%", 
    stopLoss: 39500,
    category: "hold",
    isPositive: false,
    targetWeight: 0.000, 
    actionText: "THEO DÕI / NẮM GIỮ", 
    actionClass: "status-hold", 
    reason: "Biến động tích lũy đi ngang; Chờ đợi thông tin bàn giao dự án lớn",
    sector: "Bất động sản dân cư • Sàn HOSE",
    dayRange: "40,800 - 41,600 đ",
    pe: "7.1x",
    roe: "18.5%",
    rsi: "46.2",
    attention: "0.080"
  },
  { 
    ticker: "VIC", 
    name: "Tập đoàn Vingroup", 
    price: 43500, 
    predictedPrice: 42800, 
    expectedPct: "-1.6%", 
    stopLoss: 41500,
    category: "hold",
    isPositive: false,
    targetWeight: 0.000, 
    actionText: "THEO DÕI / NẮM GIỮ", 
    actionClass: "status-hold", 
    reason: "Thị trường cần thêm thời gian hấp thụ dòng tiền mảng xe điện",
    sector: "Bất động sản & Công nghiệp • Sàn HOSE",
    dayRange: "43,000 - 44,000 đ",
    pe: "24.5x",
    roe: "6.2%",
    rsi: "44.0",
    attention: "0.065"
  },
  { 
    ticker: "VNM", 
    name: "Sữa Việt Nam (Vinamilk)", 
    price: 67800, 
    predictedPrice: 67200, 
    expectedPct: "-0.9%", 
    stopLoss: 66000,
    category: "hold",
    isPositive: false,
    targetWeight: 0.000, 
    actionText: "THEO DÕI / NẮM GIỮ", 
    actionClass: "status-hold", 
    reason: "Tăng trưởng doanh thu nội địa ổn định; Tỷ suất cổ tức duy trì trên 6%",
    sector: "Thực phẩm & Đồ uống • Sàn HOSE",
    dayRange: "67,400 - 68,200 đ",
    pe: "14.2x",
    roe: "26.4%",
    rsi: "48.1",
    attention: "0.055"
  },
  { 
    ticker: "MSN", 
    name: "Tập đoàn Masan", 
    price: 74500, 
    predictedPrice: 71800, 
    expectedPct: "-3.6%", 
    stopLoss: 72000,
    category: "sell",
    isPositive: false,
    targetWeight: 0.000, 
    actionText: "HẠ TỶ TRỌNG / BÁN", 
    actionClass: "status-sell", 
    reason: "Tín hiệu HMM báo hiệu áp lực chốt lời ngắn hạn; Cần thu hẹp rủi ro",
    sector: "Hàng tiêu dùng thiết yếu • Sàn HOSE",
    dayRange: "74,000 - 75,200 đ",
    pe: "38.5x",
    roe: "5.8%",
    rsi: "39.5",
    attention: "0.040"
  },
  { 
    ticker: "SSI", 
    name: "Chứng khoán SSI", 
    price: 32400, 
    predictedPrice: 31200, 
    expectedPct: "-3.7%", 
    stopLoss: 31000,
    category: "sell",
    isPositive: false,
    targetWeight: 0.000, 
    actionText: "HẠ TỶ TRỌNG / BÁN", 
    actionClass: "status-sell", 
    reason: "Thanh khoản chung thị trường hạ nhiệt; Áp lực điều chỉnh kỹ thuật ngắn hạn",
    sector: "Dịch vụ Tài chính • Sàn HOSE",
    dayRange: "32,100 - 32,800 đ",
    pe: "17.2x",
    roe: "12.9%",
    rsi: "41.2",
    attention: "0.035"
  }
];

export const USER_PORTFOLIO_STOCK_ITEMS: Record<string, StockItem> = {
  VND: {
    ticker: "VND",
    name: "Chứng khoán VNDirect",
    price: 13200,
    predictedPrice: 14000,
    expectedPct: "+6.1%",
    stopLoss: 12600,
    category: "hold",
    isPositive: true,
    targetWeight: 0.141,
    actionText: "THEO DÕI / NẮM GIỮ",
    actionClass: "status-hold",
    reason: "Thị trường thanh khoản ổn định; Cổ phiếu đã về khả dụng, giữ vị thế chờ nhịp hồi phục",
    sector: "Dịch vụ Tài chính • Sàn HOSE",
    dayRange: "13,100 - 13,350 đ",
    pe: "11.2x",
    roe: "14.8%",
    rsi: "44.5",
    attention: "0.220",
    history: [
      { date: "17/10", price: 13900 },
      { date: "18/10", price: 13600 },
      { date: "19/10", price: 13400 },
      { date: "20/10", price: 13300 },
      { date: "21/10", price: 13200 },
      { date: "22/10", price: 13150 },
      { date: "23/10", price: 13200 }
    ]
  },
  DIG: {
    ticker: "DIG",
    name: "Tổng Công ty Đầu tư Phát triển Xây dựng",
    price: 9400,
    predictedPrice: 10200,
    expectedPct: "+8.5%",
    stopLoss: 8900,
    category: "hold",
    isPositive: true,
    targetWeight: 0.100,
    actionText: "THEO DÕI / NẮM GIỮ",
    actionClass: "status-hold",
    reason: "Đang có lãi +1.62%, vùng hỗ trợ 9.000 đ vững chắc; Cổ phiếu đã khả dụng giao dịch",
    sector: "Bất động sản dân cư • Sàn HOSE",
    dayRange: "9,250 - 9,500 đ",
    pe: "18.5x",
    roe: "9.2%",
    rsi: "52.1",
    attention: "0.190",
    history: [
      { date: "17/10", price: 9250 },
      { date: "18/10", price: 9300 },
      { date: "19/10", price: 9200 },
      { date: "20/10", price: 9350 },
      { date: "21/10", price: 9400 },
      { date: "22/10", price: 9380 },
      { date: "23/10", price: 9400 }
    ]
  },
  VSC: {
    ticker: "VSC",
    name: "Container Việt Nam",
    price: 13150,
    predictedPrice: 14500,
    expectedPct: "+10.3%",
    stopLoss: 12500,
    category: "hold",
    isPositive: true,
    targetWeight: 0.140,
    actionText: "THEO DÕI / NẮM GIỮ",
    actionClass: "status-hold",
    reason: "Dòng tiền logistic cảng biển duy trì tốt, đang lãi nhẹ +1.54%; Cổ phiếu khả dụng",
    sector: "Cảng biển & Vận tải • Sàn HOSE",
    dayRange: "12,950 - 13,250 đ",
    pe: "10.8x",
    roe: "16.5%",
    rsi: "61.4",
    attention: "0.240",
    history: [
      { date: "17/10", price: 12950 },
      { date: "18/10", price: 13000 },
      { date: "19/10", price: 13050 },
      { date: "20/10", price: 13100 },
      { date: "21/10", price: 13150 },
      { date: "22/10", price: 13100 },
      { date: "23/10", price: 13150 }
    ]
  },
  DPM: {
    ticker: "DPM",
    name: "Phân bón & Hóa chất Dầu khí",
    price: 21900,
    predictedPrice: 23500,
    expectedPct: "+7.3%",
    stopLoss: 21200,
    category: "hold",
    isPositive: true,
    targetWeight: 0.234,
    actionText: "CHỜ KHỚP T+1",
    actionClass: "status-hold",
    reason: "Lỗ nhẹ -1.13%, giá vốn 22.150 đ; Cổ phiếu đang chờ về T+1 phiên ngày mai",
    sector: "Hóa chất & Phân bón • Sàn HOSE",
    dayRange: "21,700 - 22,200 đ",
    pe: "12.3x",
    roe: "15.1%",
    rsi: "49.8",
    attention: "0.175",
    history: [
      { date: "17/10", price: 22150 },
      { date: "18/10", price: 22000 },
      { date: "19/10", price: 21850 },
      { date: "20/10", price: 21950 },
      { date: "21/10", price: 22000 },
      { date: "22/10", price: 21800 },
      { date: "23/10", price: 21900 }
    ]
  },
  GEX: {
    ticker: "GEX",
    name: "Tập đoàn GELEX",
    price: 22250,
    predictedPrice: 23800,
    expectedPct: "+7.0%",
    stopLoss: 21400,
    category: "hold",
    isPositive: true,
    targetWeight: 0.237,
    actionText: "CHỜ KHỚP T+1",
    actionClass: "status-hold",
    reason: "Lãi nhẹ +2.06%, giá vốn 21.800 đ; Cổ phiếu đang chờ về T+1 phiên ngày mai",
    sector: "Thiết bị điện & Đa ngành • Sàn HOSE",
    dayRange: "21,900 - 22,400 đ",
    pe: "14.2x",
    roe: "13.4%",
    rsi: "56.6",
    attention: "0.210",
    history: [
      { date: "17/10", price: 21800 },
      { date: "18/10", price: 21900 },
      { date: "19/10", price: 22000 },
      { date: "20/10", price: 22100 },
      { date: "21/10", price: 22150 },
      { date: "22/10", price: 22200 },
      { date: "23/10", price: 22250 }
    ]
  },
  HT1: {
    ticker: "HT1",
    name: "Xi măng Vicem Hà Tiên",
    price: 12250,
    predictedPrice: 13200,
    expectedPct: "+7.8%",
    stopLoss: 11800,
    category: "hold",
    isPositive: true,
    targetWeight: 0.131,
    actionText: "CHỜ KHỚP T+1",
    actionClass: "status-hold",
    reason: "Lỗ nhẹ -0.41%, giá vốn 12.300 đ; Tỷ lệ an toàn cao, chờ nhịp kỹ thuật T+1",
    sector: "Vật liệu xây dựng • Sàn HOSE",
    dayRange: "12,100 - 12,350 đ",
    pe: "15.0x",
    roe: "7.8%",
    rsi: "48.5",
    attention: "0.130",
    history: [
      { date: "17/10", price: 12300 },
      { date: "18/10", price: 12250 },
      { date: "19/10", price: 12200 },
      { date: "20/10", price: 12150 },
      { date: "21/10", price: 12200 },
      { date: "22/10", price: 12200 },
      { date: "23/10", price: 12250 }
    ]
  }
};
