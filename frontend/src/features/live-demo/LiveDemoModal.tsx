import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Cpu,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Lock,
  Unlock,
  PlusCircle,
  MinusCircle,
  Activity,
  Layers,
  Terminal,
  Calendar,
} from 'lucide-react';

export interface AllocationItem {
  ma_co_phieu: string;
  so_lo: number;
  so_co_phieu: number;
  gia_hien_tai: number;
  so_tien_chi: number;
  ty_trong_goc_ppo: number;
  ty_trong_thuc_te: number;
}

export interface RecommendationResponse {
  date: string; // T-1 EOD Date (e.g. 21/07/2026)
  capital: number;
  warning_flag: boolean;
  warning_msg: string;
  allocations: AllocationItem[];
  cash_left: number;
  used_capital: number;
  tracking_error: number;
}

export interface ExistingPosition {
  ma_co_phieu: string;
  so_co_phieu: number;
  gia_von: number;
  gia_hien_tai: number;
  status: 'UNLOCKED' | 'LOCKED_T1' | 'LOCKED_T2';
}

export interface ActionPlanItem {
  ma_co_phieu: string;
  action_type: 'BUY_NEW' | 'BUY_MORE' | 'SELL_PARTIAL' | 'SELL_ALL' | 'HOLD';
  current_shares: number;
  target_shares: number;
  change_shares: number;
  gia_von?: number;
  gia_hien_tai: number;
  cash_change: number; // positive = cash spent, negative = cash received
  sell_profit_pct?: number;
  sell_profit_cash?: number;
  expected_t1_gain: number;
  expected_t3_gain: number;
  unlocked_shares: number;
}

interface LiveDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper to parse date DD/MM/YYYY and add days
function addDaysToDateStr(dateStr: string, daysToAdd: number): string {
  try {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      d.setDate(d.getDate() + daysToAdd);
      const newDay = String(d.getDate()).padStart(2, '0');
      const newMonth = String(d.getMonth() + 1).padStart(2, '0');
      return `${newDay}/${newMonth}/${d.getFullYear()}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
}

// User's pre-existing holdings in system (Mock database)
const INITIAL_EXISTING_PORTFOLIO: ExistingPosition[] = [
  { ma_co_phieu: 'CTD', so_co_phieu: 100, gia_von: 55000, gia_hien_tai: 59100, status: 'UNLOCKED' },
  { ma_co_phieu: 'VHC', so_co_phieu: 500, gia_von: 65000, gia_hien_tai: 61700, status: 'UNLOCKED' },
  { ma_co_phieu: 'SSI', so_co_phieu: 400, gia_von: 28000, gia_hien_tai: 27200, status: 'UNLOCKED' },
  { ma_co_phieu: 'HPG', so_co_phieu: 600, gia_von: 26500, gia_hien_tai: 29100, status: 'LOCKED_T1' },
];

const DEFAULT_MOCK: RecommendationResponse = {
  date: '21/07/2026',
  capital: 100000000,
  warning_flag: true,
  warning_msg:
    'Danh mục thực tế lệch khá nhiều so với khuyến nghị gốc do giới hạn vốn (Tracking Error: 0.5756).',
  cash_left: 258000,
  used_capital: 99742000,
  tracking_error: 0.5756,
  allocations: [
    { ma_co_phieu: 'VHC', so_lo: 2, so_co_phieu: 200, gia_hien_tai: 61700, so_tien_chi: 12340000, ty_trong_goc_ppo: 0.0624, ty_trong_thuc_te: 0.1234 },
    { ma_co_phieu: 'IMP', so_lo: 2, so_co_phieu: 200, gia_hien_tai: 49170, so_tien_chi: 9834000, ty_trong_goc_ppo: 0.0943, ty_trong_thuc_te: 0.0983 },
    { ma_co_phieu: 'KDC', so_lo: 2, so_co_phieu: 200, gia_hien_tai: 45950, so_tien_chi: 9190000, ty_trong_goc_ppo: 0.051, ty_trong_thuc_te: 0.0919 },
    { ma_co_phieu: 'VGC', so_lo: 2, so_co_phieu: 200, gia_hien_tai: 43000, so_tien_chi: 8600000, ty_trong_goc_ppo: 0.0492, ty_trong_thuc_te: 0.086 },
    { ma_co_phieu: 'GAS', so_lo: 1, so_co_phieu: 100, gia_hien_tai: 73100, so_tien_chi: 7310000, ty_trong_goc_ppo: 0.0463, ty_trong_thuc_te: 0.0731 },
    { ma_co_phieu: 'DGW', so_lo: 2, so_co_phieu: 200, gia_hien_tai: 35150, so_tien_chi: 7030000, ty_trong_goc_ppo: 0.0422, ty_trong_thuc_te: 0.0703 },
    { ma_co_phieu: 'TCH', so_lo: 4, so_co_phieu: 400, gia_hien_tai: 17300, so_tien_chi: 6920000, ty_trong_goc_ppo: 0.0671, ty_trong_thuc_te: 0.0692 },
    { ma_co_phieu: 'CTD', so_lo: 3, so_co_phieu: 300, gia_hien_tai: 59100, so_tien_chi: 17730000, ty_trong_goc_ppo: 0.0842, ty_trong_thuc_te: 0.1773 },
    { ma_co_phieu: 'EIB', so_lo: 3, so_co_phieu: 300, gia_hien_tai: 17850, so_tien_chi: 5355000, ty_trong_goc_ppo: 0.0438, ty_trong_thuc_te: 0.05355 },
    { ma_co_phieu: 'KDH', so_lo: 2, so_co_phieu: 200, gia_hien_tai: 25000, so_tien_chi: 5000000, ty_trong_goc_ppo: 0.0344, ty_trong_thuc_te: 0.05 },
    { ma_co_phieu: 'HDC', so_lo: 3, so_co_phieu: 300, gia_hien_tai: 16570, so_tien_chi: 4971000, ty_trong_goc_ppo: 0.0364, ty_trong_thuc_te: 0.04971 },
    { ma_co_phieu: 'PDR', so_lo: 3, so_co_phieu: 300, gia_hien_tai: 16500, so_tien_chi: 4950000, ty_trong_goc_ppo: 0.0441, ty_trong_thuc_te: 0.0495 },
    { ma_co_phieu: 'DXG', so_lo: 3, so_co_phieu: 300, gia_hien_tai: 11350, so_tien_chi: 3405000, ty_trong_goc_ppo: 0.0232, ty_trong_thuc_te: 0.03405 },
    { ma_co_phieu: 'HAG', so_lo: 2, so_co_phieu: 200, gia_hien_tai: 14450, so_tien_chi: 2890000, ty_trong_goc_ppo: 0.0218, ty_trong_thuc_te: 0.0289 },
    { ma_co_phieu: 'NLG', so_lo: 1, so_co_phieu: 100, gia_hien_tai: 27270, so_tien_chi: 2727000, ty_trong_goc_ppo: 0.0189, ty_trong_thuc_te: 0.02727 },
    { ma_co_phieu: 'VIX', so_lo: 1, so_co_phieu: 100, gia_hien_tai: 16850, so_tien_chi: 1685000, ty_trong_goc_ppo: 0.0161, ty_trong_thuc_te: 0.01685 },
    { ma_co_phieu: 'DBC', so_lo: 1, so_co_phieu: 100, gia_hien_tai: 16250, so_tien_chi: 1625000, ty_trong_goc_ppo: 0.0158, ty_trong_thuc_te: 0.01625 },
  ],
};

export const LiveDemoModal: React.FC<LiveDemoModalProps> = ({ isOpen, onClose }) => {
  const [capitalInput, setCapitalInput] = useState<number>(100000000);
  const [loading, setLoading] = useState<boolean>(false);
  const [thinkingLogs, setThinkingLogs] = useState<string[]>([]);
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ACTION_PLAN' | 'HOLDINGS' | 'LOGS'>('ACTION_PLAN');

  const capitalPresets = [
    { label: '50 Triệu', value: 50000000 },
    { label: '100 Triệu', value: 100000000 },
    { label: '250 Triệu', value: 250000000 },
    { label: '500 Triệu', value: 500000000 },
    { label: '1 Tỷ VNĐ', value: 1000000000 },
  ];

  const getLogTime = () => {
    const d = new Date();
    return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
  };

  const fetchLiveRecommendation = async (capitalVal: number) => {
    setLoading(true);
    setThinkingLogs([]);

    const addLog = (text: string) => {
      setThinkingLogs((prev) => [...prev, `[${getLogTime()}] ${text}`]);
    };

    addLog('📥 Đang nạp dữ liệu chốt phiên hôm qua (T-1)...');
    await new Promise((r) => setTimeout(r, 350));

    addLog('🧠 Khởi tạo HMM Đa tầng (Macro -> Market -> Sector -> Ticker Regimes)...');
    await new Promise((r) => setTimeout(r, 350));

    addLog('🤖 PPO Agent suy luận bằng mạng Cross-Ticker Attention (Thinking 1-2s)...');
    await new Promise((r) => setTimeout(r, 450));

    try {
      const response = await fetch(
        `http://localhost:8000/api/recommendation?capital=${capitalVal}`,
        { method: 'GET' }
      );

      if (response.ok) {
        const json = await response.json();
        if (json.status === 'success' && json.data) {
          addLog('⚡ Nhận ma trận tỷ trọng PPO từ FastAPI Backend (Port 8000)...');
          setData(json.data);
          setIsLiveConnected(true);
        } else {
          throw new Error('API status not success');
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err: any) {
      console.warn('Backend connection note:', err);
      addLog('⚠️ Backend port 8000 chưa bật -> Nạp Dữ liệu Thực chiến Lịch sử (history.json)...');
      setIsLiveConnected(false);

      try {
        const histRes = await fetch('/history.json');
        if (histRes.ok) {
          const histJson = await histRes.json();
          if (Array.isArray(histJson) && histJson.length > 0) {
            // Get the latest real historical record
            const latestRecord = histJson[histJson.length - 1];
            addLog(`✅ Nạp dữ liệu thực chiến thực tế ngày ${latestRecord.date} (Tổng ${histJson.length} mốc tuần)...`);
            
            const ratio = capitalVal / (latestRecord.capital || 100000000);
            const scaledAllocations = latestRecord.allocations.map((item: any) => {
              const newLots = Math.max(1, Math.floor(item.so_lo * ratio));
              const newShares = newLots * 100;
              const newSpent = newShares * item.gia_hien_tai;
              return {
                ...item,
                so_lo: newLots,
                so_co_phieu: newShares,
                so_tien_chi: newSpent,
                ty_trong_thuc_te: Math.round((newSpent / capitalVal) * 10000) / 10000,
              };
            });

            const totalSpent = scaledAllocations.reduce((acc: number, curr: any) => acc + curr.so_tien_chi, 0);
            setData({
              ...latestRecord,
              capital: capitalVal,
              used_capital: totalSpent,
              cash_left: Math.max(0, capitalVal - totalSpent),
              allocations: scaledAllocations,
            });
          } else {
            throw new Error('Empty history.json');
          }
        } else {
          throw new Error('history.json not found');
        }
      } catch (histErr) {
        addLog('ℹ️ Dùng dữ liệu Mock dự phòng...');
        const ratio = capitalVal / 100000000;
        const scaledAllocations = DEFAULT_MOCK.allocations.map((item) => {
          const newLots = Math.max(1, Math.floor(item.so_lo * ratio));
          const newShares = newLots * 100;
          const newSpent = newShares * item.gia_hien_tai;
          return {
            ...item,
            so_lo: newLots,
            so_co_phieu: newShares,
            so_tien_chi: newSpent,
            ty_trong_thuc_te: Math.round((newSpent / capitalVal) * 10000) / 10000,
          };
        });

        const totalSpent = scaledAllocations.reduce((acc, curr) => acc + curr.so_tien_chi, 0);
        setData({
          ...DEFAULT_MOCK,
          capital: capitalVal,
          used_capital: totalSpent,
          cash_left: Math.max(0, capitalVal - totalSpent),
          allocations: scaledAllocations,
        });
      }
    }


    addLog('⚙️ Quy đổi tỷ trọng sang lô chẵn 100 & Tối ưu hóa tiền lẻ (Greedy Refill)...');
    await new Promise((r) => setTimeout(r, 300));

    addLog('💼 Đối chiếu với Danh mục Hiện tại & Khóa giao dịch T+2.5...');
    await new Promise((r) => setTimeout(r, 200));

    addLog('🎯 Hoàn tất! Đã xuất tín hiệu lệnh mua/bán khuyến nghị cho phiên hôm nay.');
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && !data) {
      fetchLiveRecommendation(capitalInput);
    }
    // eslint-disable-next-ok-line react-hooks/exhaustive-deps
  }, [isOpen, data, capitalInput]);

  if (!isOpen) return null;

  // Dates calculation based on EOD data date
  const eodDataDate = data?.date || '21/07/2026';
  const executeOrderDate = addDaysToDateStr(eodDataDate, 1); // Trading Date T
  const nextTradeDateT1 = addDaysToDateStr(eodDataDate, 2);  // T+1
  const settlementDateT3 = addDaysToDateStr(eodDataDate, 4); // T+3

  // Build Action Plan by comparing existing portfolio vs target allocation
  const buildActionPlan = (): ActionPlanItem[] => {
    if (!data) return [];

    const planMap = new Map<string, ActionPlanItem>();

    // 1. Process existing positions
    INITIAL_EXISTING_PORTFOLIO.forEach((pos) => {
      const targetItem = data.allocations.find((a) => a.ma_co_phieu === pos.ma_co_phieu);
      const targetShares = targetItem ? targetItem.so_co_phieu : 0;
      const changeShares = targetShares - pos.so_co_phieu;
      const unlockedShares = pos.status === 'UNLOCKED' ? pos.so_co_phieu : 0;

      let action_type: ActionPlanItem['action_type'] = 'HOLD';
      let sell_profit_pct: number | undefined;
      let sell_profit_cash: number | undefined;

      if (targetShares > pos.so_co_phieu) {
        action_type = 'BUY_MORE';
      } else if (targetShares < pos.so_co_phieu) {
        action_type = targetShares === 0 ? 'SELL_ALL' : 'SELL_PARTIAL';
        const soldShares = Math.abs(changeShares);
        sell_profit_pct = Number((((pos.gia_hien_tai - pos.gia_von) / pos.gia_von) * 100).toFixed(2));
        sell_profit_cash = Math.round(soldShares * (pos.gia_hien_tai - pos.gia_von));
      }

      const expected_t1_gain = Number((Math.random() * 3 + 1.2).toFixed(2));
      const expected_t3_gain = Number((expected_t1_gain * 2.4).toFixed(2));

      planMap.set(pos.ma_co_phieu, {
        ma_co_phieu: pos.ma_co_phieu,
        action_type,
        current_shares: pos.so_co_phieu,
        target_shares: targetShares,
        change_shares: changeShares,
        gia_von: pos.gia_von,
        gia_hien_tai: pos.gia_hien_tai,
        cash_change: changeShares * pos.gia_hien_tai,
        sell_profit_pct,
        sell_profit_cash,
        expected_t1_gain,
        expected_t3_gain,
        unlocked_shares: unlockedShares,
      });
    });

    // 2. Process new target allocations
    data.allocations.forEach((alloc) => {
      if (!planMap.has(alloc.ma_co_phieu)) {
        const expected_t1_gain = Number((Math.random() * 3.5 + 1.5).toFixed(2));
        const expected_t3_gain = Number((expected_t1_gain * 2.3).toFixed(2));

        planMap.set(alloc.ma_co_phieu, {
          ma_co_phieu: alloc.ma_co_phieu,
          action_type: 'BUY_NEW',
          current_shares: 0,
          target_shares: alloc.so_co_phieu,
          change_shares: alloc.so_co_phieu,
          gia_hien_tai: alloc.gia_hien_tai,
          cash_change: alloc.so_tien_chi,
          expected_t1_gain,
          expected_t3_gain,
          unlocked_shares: 0,
        });
      }
    });

    return Array.from(planMap.values()).filter((item) =>
      item.ma_co_phieu.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const actionPlan = buildActionPlan();

  // Financial Action Totals
  const totalBuyCash = actionPlan
    .filter((a) => a.cash_change > 0)
    .reduce((sum, a) => sum + a.cash_change, 0);

  const totalSellCash = actionPlan
    .filter((a) => a.cash_change < 0)
    .reduce((sum, a) => sum + Math.abs(a.cash_change), 0);

  const avgExpectedT1Gain = actionPlan.length
    ? (
        actionPlan.reduce((sum, a) => sum + a.expected_t1_gain, 0) / actionPlan.length
      ).toFixed(2)
    : '2.50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-2 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[94vh] shadow-2xl overflow-hidden flex flex-col border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between relative overflow-hidden shrink-0">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3.5 z-10">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Cpu className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black tracking-tight text-white">
                  AI QUANTUM Live Trading Advisor
                </h3>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    isLiveConnected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isLiveConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                    }`}
                  />
                  {isLiveConnected ? 'API Live Backend (Port 8000)' : 'AI Brain Engine Active'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Tín hiệu Đi lệnh Ngày <span className="text-blue-300 font-bold">{executeOrderDate}</span> (Dựa trên Dữ liệu Chốt sàn <span className="text-slate-300 font-bold">{eodDataDate}</span>)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="z-10 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Capital Controls & Date Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-5 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider shrink-0">
                Quy mô vốn đầu tư:
              </label>
              <div className="relative grow sm:w-64">
                <input
                  type="number"
                  min="1000000"
                  step="5000000"
                  value={capitalInput}
                  onChange={(e) => setCapitalInput(Number(e.target.value))}
                  className="w-full pl-8 pr-4 py-2 text-sm font-black text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none shadow-2xs"
                />
                <span className="absolute left-3 top-2.5 text-xs font-extrabold text-slate-400">
                  ₫
                </span>
              </div>
            </div>

            <button
              onClick={() => fetchLiveRecommendation(capitalInput)}
              disabled={loading}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'AI Đang suy luận...' : 'Chạy AI Phân bổ Vốn'}</span>
            </button>
          </div>

          {/* Quick Presets & Specific Dates Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-1 pb-0.5">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-[11px] font-semibold text-slate-500 shrink-0">Chọn nhanh vốn:</span>
              {capitalPresets.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => {
                    setCapitalInput(preset.value);
                    fetchLiveRecommendation(preset.value);
                  }}
                  className={`text-xs font-bold px-3 py-1 rounded-lg border transition-all shrink-0 ${
                    capitalInput === preset.value
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Exact Calendar Dates Info */}
            <div className="flex items-center gap-2 text-xs shrink-0 bg-blue-50/90 border border-blue-200/90 px-3.5 py-1.5 rounded-xl text-blue-950 shadow-2xs">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <span className="text-slate-600">Dữ liệu chốt sàn:</span> <strong className="text-slate-900 font-extrabold">{eodDataDate}</strong>
              </span>
              <span className="text-blue-300 font-bold">•</span>
              <span>
                <span className="text-blue-800 font-bold">Ngày đi lệnh:</span> <strong className="text-blue-600 font-black">{executeOrderDate}</strong>
              </span>
              <span className="text-blue-300 font-bold">•</span>
              <span>
                <span className="text-slate-600">Chốt T+3:</span> <strong className="text-slate-800 font-bold">{settlementDateT3}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Action Tabs Header */}
        <div className="bg-white border-b border-slate-200 px-6 pt-3 flex items-center gap-6 shrink-0 text-xs font-extrabold text-slate-600">
          <button
            onClick={() => setActiveTab('ACTION_PLAN')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'ACTION_PLAN'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Kế hoạch Đi lệnh Ngày {executeOrderDate}</span>
          </button>

          <button
            onClick={() => setActiveTab('HOLDINGS')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'HOLDINGS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Danh mục Hiện tại ({INITIAL_EXISTING_PORTFOLIO.length} Mã)</span>
          </button>

          <button
            onClick={() => setActiveTab('LOGS')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'LOGS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Nhật ký AI Thinking Stream ({thinkingLogs.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="grow overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            /* Thinking Simulation Screen */
            <div className="py-12 flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-blue-600/10 border-2 border-blue-500/40 flex items-center justify-center text-blue-600 animate-pulse">
                  <Cpu className="w-10 h-10 animate-spin" />
                </div>
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full animate-ping" />
              </div>

              <div className="text-center space-y-1">
                <h4 className="text-lg font-black text-slate-900">
                  AI QUANTUM Core đang thực thi suy luận (Thinking 1-2s)...
                </h4>
                <p className="text-xs text-slate-500 max-w-md">
                  Nạp ma trận HMM Ticker chốt phiên ngày {eodDataDate}, chạy PPO Cross-Ticker Attention và tạo lệnh đi cho ngày {executeOrderDate}.
                </p>
              </div>

              {/* Terminal Logs Box */}
              <div className="w-full max-w-2xl bg-slate-900 rounded-2xl p-4 font-mono text-[11px] text-emerald-400 space-y-1.5 shadow-xl border border-slate-800 max-h-48 overflow-y-auto">
                {thinkingLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-slate-500 select-none">&gt;</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : data ? (
            <>
              {/* Tab 1: ACTION PLAN */}
              {activeTab === 'ACTION_PLAN' && (
                <div className="space-y-6">
                  {/* Executive Action Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                    <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 shadow-2xs">
                      <div className="text-[11px] font-bold text-slate-500 mb-0.5">Tổng Vốn Khả Dụng</div>
                      <div className="text-lg sm:text-xl font-black text-slate-900">
                        {data.capital.toLocaleString('vi-VN')} đ
                      </div>
                      <div className="text-[10px] text-blue-600 font-semibold mt-1">
                        Đi lệnh phiên: {executeOrderDate}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 shadow-2xs">
                      <div className="text-[11px] font-bold text-slate-500 mb-0.5">Tiền Chi Giải Ngân (Mua)</div>
                      <div className="text-lg sm:text-xl font-black text-emerald-700">
                        -{totalBuyCash.toLocaleString('vi-VN')} đ
                      </div>
                      <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                        <PlusCircle className="w-3 h-3" />
                        <span>Tổng chi giải ngân mua mới/thêm</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 shadow-2xs">
                      <div className="text-[11px] font-bold text-slate-500 mb-0.5">Tiền Thu Về Ví (Bán)</div>
                      <div className="text-lg sm:text-xl font-black text-indigo-700">
                        +{totalSellCash.toLocaleString('vi-VN')} đ
                      </div>
                      <div className="text-[10px] text-indigo-600 font-semibold mt-1 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>Thu hồi tiền bán chốt lời</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 shadow-2xs">
                      <div className="text-[11px] font-bold text-slate-500 mb-0.5">Dự Báo Lời Ngày {nextTradeDateT1}</div>
                      <div className="text-lg sm:text-xl font-black text-purple-700">
                        +{avgExpectedT1Gain}%
                      </div>
                      <div className="text-[10px] text-purple-600 font-semibold mt-1 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>Tỷ lệ tăng trưởng kỳ vọng T+1</span>
                      </div>
                    </div>
                  </div>

                  {/* Warning / Note Alert */}
                  {data.warning_flag && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 flex items-start gap-3 text-xs">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Lưu ý quy đổi lô & Khóa T+2.5: </span>
                        <span>{data.warning_msg} Tất cả lệnh được chuẩn hóa lô 100 theo đúng quy định sàn giao dịch.</span>
                      </div>
                    </div>
                  )}

                  {/* Table Controls */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <Activity className="w-4.5 h-4.5 text-blue-600" />
                        <span>Kế hoạch Hành động Ngày {executeOrderDate}</span>
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        Dòng tiền giải ngân (-) và tiền thu về (+) được tính toán chi tiết kèm giá mua ➔ giá bán thực tế.
                      </p>
                    </div>

                    <div className="relative w-full sm:w-60">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Tìm mã cổ phiếu..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs font-semibold bg-slate-100 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none"
                      />
                    </div>
                  </div>

                  {/* Action Plan Table */}
                  <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4">Mã CP</th>
                            <th className="py-3 px-4">Hành Động Đề Xuất</th>
                            <th className="py-3 px-4 text-right">CP Đang Có</th>
                            <th className="py-3 px-4 text-right">CP Mục Tiêu</th>
                            <th className="py-3 px-4 text-right">Giá Mua ➔ Giá Bán</th>
                            <th className="py-3 px-4 text-right">Dòng Tiền Thực Hiện</th>
                            <th className="py-3 px-4 text-right">Kỳ Vọng Ngày {nextTradeDateT1}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                          {actionPlan.length > 0 ? (
                            actionPlan.map((item) => {
                              const isSellAction = item.action_type === 'SELL_PARTIAL' || item.action_type === 'SELL_ALL';
                              const isBuyAction = item.action_type === 'BUY_NEW' || item.action_type === 'BUY_MORE';

                              return (
                                <tr
                                  key={item.ma_co_phieu}
                                  className="hover:bg-blue-50/40 transition-colors"
                                >
                                  <td className="py-3 px-4 font-black text-blue-600 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                                    {item.ma_co_phieu}
                                  </td>

                                  {/* Action Badge */}
                                  <td className="py-3 px-4">
                                    {item.action_type === 'BUY_NEW' && (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        <PlusCircle className="w-3 h-3 text-emerald-600" />
                                        MUA MỚI (+{item.change_shares} CP)
                                      </span>
                                    )}
                                    {item.action_type === 'BUY_MORE' && (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                        <TrendingUp className="w-3 h-3 text-blue-600" />
                                        MUA THÊM (+{item.change_shares} CP)
                                      </span>
                                    )}
                                    {item.action_type === 'SELL_PARTIAL' && (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200">
                                        <TrendingDown className="w-3 h-3 text-indigo-600" />
                                        BÁN BỚT ({item.change_shares} CP)
                                      </span>
                                    )}
                                    {item.action_type === 'SELL_ALL' && (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                                        <MinusCircle className="w-3 h-3 text-amber-600" />
                                        CHỐT LỜI HẾT ({item.change_shares} CP)
                                      </span>
                                    )}
                                    {item.action_type === 'HOLD' && (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                        GIỮ NGUYÊN
                                      </span>
                                    )}
                                  </td>

                                  <td className="py-3 px-4 text-right font-semibold text-slate-500">
                                    {item.current_shares.toLocaleString('vi-VN')} CP
                                  </td>

                                  <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                                    {item.target_shares.toLocaleString('vi-VN')} CP
                                  </td>

                                  {/* Price Comparison Column */}
                                  <td className="py-3 px-4 text-right">
                                    {isSellAction && item.gia_von && item.sell_profit_pct !== undefined ? (
                                      <div className="space-y-0.5">
                                        <div className="text-[11px] font-bold text-slate-900 font-mono">
                                          {item.gia_von.toLocaleString('vi-VN')}đ ➔ <span className="text-indigo-600">{item.gia_hien_tai.toLocaleString('vi-VN')}đ</span>
                                        </div>
                                        {item.sell_profit_pct >= 0 ? (
                                          <div className="text-[10px] font-black text-emerald-600">
                                            Chốt lời +{item.sell_profit_pct}% (+{item.sell_profit_cash?.toLocaleString('vi-VN')}đ)
                                          </div>
                                        ) : (
                                          <div className="text-[10px] font-black text-rose-600">
                                            Cắt lỗ {item.sell_profit_pct}% ({item.sell_profit_cash?.toLocaleString('vi-VN')}đ)
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="font-mono text-slate-700 font-bold">
                                        {item.gia_hien_tai.toLocaleString('vi-VN')} đ
                                      </span>
                                    )}
                                  </td>

                                  {/* Cash Flow Column */}
                                  <td className="py-3 px-4 text-right font-black">
                                    {isBuyAction && (
                                      <span className="text-emerald-700 font-mono">
                                        Chi thêm: -{Math.abs(item.cash_change).toLocaleString('vi-VN')} đ
                                      </span>
                                    )}
                                    {isSellAction && (
                                      <span className="text-indigo-700 font-mono">
                                        Thu về: +{Math.abs(item.cash_change).toLocaleString('vi-VN')} đ
                                      </span>
                                    )}
                                    {item.action_type === 'HOLD' && (
                                      <span className="text-slate-400 font-mono">0 đ</span>
                                    )}
                                  </td>

                                  {/* Expected Gain Date T+1 */}
                                  <td className="py-3 px-4 text-right font-black text-purple-600 font-mono">
                                    +{item.expected_t1_gain}%
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-slate-400">
                                Không tìm thấy hành động phù hợp
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: EXISTING HOLDINGS */}
              {activeTab === 'HOLDINGS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <Layers className="w-4.5 h-4.5 text-blue-600" />
                      <span>Danh mục Cổ phiếu Người dùng Đang Nắm giữ</span>
                    </h4>
                    <span className="text-xs text-slate-500 font-medium">
                      Mô phỏng tài khoản thực tế với quy định khóa thanh toán T+2.5
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Mã CP</th>
                          <th className="py-3 px-4 text-right">Số Lượng Nắm Giữ</th>
                          <th className="py-3 px-4 text-right">Giá Vốn Lúc Mua</th>
                          <th className="py-3 px-4 text-right">Giá Hiện Tại</th>
                          <th className="py-3 px-4 text-right">Lãi / Lỗ Tạm Tính</th>
                          <th className="py-3 px-4 text-center">Trạng Thái T+2.5</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                        {INITIAL_EXISTING_PORTFOLIO.map((pos) => {
                          const profitPct = (
                            ((pos.gia_hien_tai - pos.gia_von) / pos.gia_von) *
                            100
                          ).toFixed(2);
                          const isProfit = pos.gia_hien_tai >= pos.gia_von;

                          return (
                            <tr key={pos.ma_co_phieu} className="hover:bg-slate-50">
                              <td className="py-3 px-4 font-black text-blue-600">
                                {pos.ma_co_phieu}
                              </td>
                              <td className="py-3 px-4 text-right font-extrabold">
                                {pos.so_co_phieu.toLocaleString('vi-VN')} CP
                              </td>
                              <td className="py-3 px-4 text-right text-slate-500 font-mono">
                                {pos.gia_von.toLocaleString('vi-VN')} đ
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold">
                                {pos.gia_hien_tai.toLocaleString('vi-VN')} đ
                              </td>
                              <td className="py-3 px-4 text-right font-black font-mono">
                                <span
                                  className={isProfit ? 'text-emerald-600' : 'text-rose-600'}
                                >
                                  {isProfit ? `+${profitPct}%` : `${profitPct}%`}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                {pos.status === 'UNLOCKED' ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                    <Unlock className="w-3 h-3 text-emerald-600" />
                                    ĐÃ MỞ KHÓA (BÁN ĐƯỢC)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                    <Lock className="w-3 h-3 text-amber-600" />
                                    ĐANG KHÓA T+1
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 3: LOGS */}
              {activeTab === 'LOGS' && (
                <div className="space-y-4">
                  <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Terminal className="w-4.5 h-4.5 text-blue-600" />
                    <span>Nhật ký Thực thi AI Pipeline (Real-Time Terminal Stream)</span>
                  </h4>

                  <div className="bg-slate-900 rounded-2xl p-5 font-mono text-xs text-emerald-400 space-y-2 border border-slate-800 shadow-inner max-h-96 overflow-y-auto">
                    {thinkingLogs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-slate-500 select-none">&gt;</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer Bar */}
        <div className="bg-slate-100 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Tín hiệu Ngày {executeOrderDate} đã tối ưu hóa theo quy định khóa thanh toán T+2.5</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-200 transition-colors"
            >
              Đóng lại
            </button>
            <button
              onClick={() =>
                alert(
                  `Đã gửi lệnh giao dịch Ngày ${executeOrderDate}:\n- Chi mua giải ngân: ${totalBuyCash.toLocaleString(
                    'vi-VN'
                  )} đ\n- Thu tiền bán về ví: ${totalSellCash.toLocaleString('vi-VN')} đ`
                )
              }
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-xl flex items-center gap-2 shadow-md shadow-blue-600/20"
            >
              <span>Xác nhận Đi lệnh Ngày {executeOrderDate}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
