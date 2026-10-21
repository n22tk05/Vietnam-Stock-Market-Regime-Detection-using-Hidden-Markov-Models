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

export interface ChartDataPoint {
  date: string;
  aiPct: number;
  bmPct: number;
}

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
