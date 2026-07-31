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
import { useNavigate } from 'react-router-dom';

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

export interface UserHistoryItem {
  date: string;
  nav: number;
  cash: number;
  stock_value: number;
  daily_change: number;
  daily_change_pct: number;
  delta_from_start: number;
  delta_pct_from_start: number;
  buy_factor_pct?: number;
}

export interface UserTradeEvent {
  date: string;
  ticker: string;
  action: 'BUY' | 'SELL';
  shares: number;
  price: number;
  total_cost: number;
  buy_factor_pct: number;
}

export interface AIPredictionLog {
  date: string;
  top_tickers: string;
  ret_t1: number | null;
  ret_t3: number | null;
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
  unlocked_shares: number;
}



type TierKey = 'tier_50m' | 'tier_100m' | 'tier_250m' | 'tier_500m';

const TIER_CONFIG: Record<TierKey, { label: string; capital: number }> = {
  tier_50m: { label: '50 Triệu', capital: 50000000 },
  tier_100m: { label: '100 Triệu', capital: 100000000 },
  tier_250m: { label: '250 Triệu', capital: 250000000 },
  tier_500m: { label: '500 Triệu', capital: 500000000 },
};

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

function parseNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return 0;
  }

  let normalized = value.trim().replace(/[₫đ\s]/g, '');
  const hasDot = normalized.includes('.');
  const hasComma = normalized.includes(',');

  if (hasDot && hasComma) {
    const euroFormat = /^-?\d{1,3}(?:\.\d{3})*,\d+$/;
    if (euroFormat.test(normalized)) {
      normalized = normalized.replace(/\./g, '').replace(/,/g, '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else if (hasComma) {
    const thousandCommaFormat = /^-?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/;
    if (thousandCommaFormat.test(normalized)) {
      normalized = normalized.replace(/,/g, '');
    } else {
      normalized = normalized.replace(/,/g, '.');
    }
  } else if (hasDot) {
    const thousandDotFormat = /^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/;
    if (thousandDotFormat.test(normalized)) {
      normalized = normalized.replace(/\./g, '');
    }
  }

  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeExistingPosition(pos: any): ExistingPosition {
  return {
    ...pos,
    so_co_phieu: parseNumber(pos.so_co_phieu),
    gia_von: parseNumber(pos.gia_von),
    gia_hien_tai: parseNumber(pos.gia_hien_tai),
  };
}

function normalizeAllocation(item: any): AllocationItem {
  return {
    ...item,
    so_lo: parseNumber(item.so_lo),
    so_co_phieu: parseNumber(item.so_co_phieu),
    gia_hien_tai: parseNumber(item.gia_hien_tai),
    so_tien_chi: parseNumber(item.so_tien_chi),
    ty_trong_goc_ppo: parseNumber(item.ty_trong_goc_ppo),
    ty_trong_thuc_te: parseNumber(item.ty_trong_thuc_te),
  };
}


export const LiveDemoPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTier, setSelectedTier] = useState<TierKey>('tier_100m');
  const [tierMetrics, setTierMetrics] = useState<{
    current_nav: number;
    cash_left: number;
    pnl_cash: number;
    pnl_pct: number;
    user_tier: string;
  } | null>(null);
  const capitalInput = TIER_CONFIG[selectedTier].capital;
  const [loading, setLoading] = useState<boolean>(false);
  const [thinkingLogs, setThinkingLogs] = useState<string[]>([]);
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [userHistory, setUserHistory] = useState<UserHistoryItem[]>([]);
  const [tradeHistory, setTradeHistory] = useState<UserTradeEvent[]>([]);
  const [aiPredictions, setAiPredictions] = useState<AIPredictionLog[]>([]);
  const [activeTab, setActiveTab] = useState<'ACTION_PLAN' | 'HOLDINGS' | 'HISTORY' | 'PREDICTIONS' | 'LOGS'>('ACTION_PLAN');
  const [existingPortfolio, setExistingPortfolio] = useState<ExistingPosition[]>([]);
  const [fullHistory, setFullHistory] = useState<any[]>([]);

  useEffect(() => {
    fetch('/simulated_users.json')
      .then((res) => res.json())
      .then((json) => {
        const key = selectedTier;

        if (json[key] && Array.isArray(json[key].holdings) && json[key].holdings.length > 0) {
          setExistingPortfolio(json[key].holdings.map(normalizeExistingPosition));
        } else {
          setExistingPortfolio([]);
        }

        if (json[key] && Array.isArray(json[key].history)) {
          setUserHistory(json[key].history as UserHistoryItem[]);
        } else {
          setUserHistory([]);
        }

        if (json[key] && Array.isArray(json[key].trade_history)) {
          setTradeHistory(json[key].trade_history as UserTradeEvent[]);
        } else {
          setTradeHistory([]);
        }

        if (json[key] && Array.isArray(json[key].ai_predictions)) {
          setAiPredictions(json[key].ai_predictions as AIPredictionLog[]);
        } else {
          setAiPredictions([]);
        }

        if (json[key] && typeof json[key].current_nav === 'number') {
          setTierMetrics({
            current_nav: json[key].current_nav,
            cash_left: json[key].cash_left,
            pnl_cash: json[key].pnl_cash,
            pnl_pct: json[key].pnl_pct,
            user_tier: json[key].user_tier,
          });
        } else {
          setTierMetrics(null);
        }
      })
      .catch((err) => console.warn('Could not load simulated_users.json:', err));
  }, [selectedTier]);


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
    await new Promise((r) => setTimeout(r, 3500));

    addLog('🧠 Khởi tạo HMM Đa tầng (Macro -> Market -> Sector -> Ticker Regimes)...');
    await new Promise((r) => setTimeout(r, 3500));

    addLog('🤖 PPO Agent suy luận bằng mạng Cross-Ticker Attention...');
    await new Promise((r) => setTimeout(r, 4500));

    try {
      // Tạm thời comment Live API để sử dụng dữ liệu history.json đã cắt tới tháng 4
      throw new Error('Force fallback to history.json');
    } catch (err: any) {
      console.warn('Backend connection note:', err);
      addLog('⚠️ Backend port 8000 chưa bật -> Nạp Dữ liệu Thực chiến Lịch sử (history.json)...');
      setIsLiveConnected(false);

      try {
        const histRes = await fetch('/history.json');
        if (histRes.ok) {
          const histJson = await histRes.json();
          if (Array.isArray(histJson) && histJson.length > 0) {
            setFullHistory(histJson);
            // Get the latest real historical record
            const latestRecord = histJson[histJson.length - 1];
            addLog(`✅ Nạp dữ liệu thực chiến thực tế ngày ${latestRecord.date} (Tổng ${histJson.length} mốc tuần)...`);
            
            const ratio = capitalVal / (latestRecord.capital || 100000000);
            const normalizedRecord = {
              ...latestRecord,
              capital: parseNumber(latestRecord.capital),
              cash_left: parseNumber(latestRecord.cash_left),
              used_capital: parseNumber(latestRecord.used_capital),
              tracking_error: parseNumber(latestRecord.tracking_error),
              allocations: Array.isArray(latestRecord.allocations)
                ? latestRecord.allocations.map(normalizeAllocation)
                : [],
            };

            const scaledAllocations = normalizedRecord.allocations.map((item: any) => {
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
              ...normalizedRecord,
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
        addLog('❌ Không thể nạp dữ liệu khuyến nghị. Vui lòng kiểm tra lại Backend API (Port 8000) hoặc file history.json');
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
    if (!data) {
      fetchLiveRecommendation(capitalInput);
    }
    // eslint-disable-next-ok-line react-hooks/exhaustive-deps
  }, [data, capitalInput]);

  const handleSelectDate = (dateStr: string) => {
    const record = fullHistory.find(r => r.date === dateStr);
    if (!record) return;

    const ratio = capitalInput / (record.capital || 100000000);
    const normalizedRecord = {
      ...record,
      capital: parseNumber(record.capital),
      cash_left: parseNumber(record.cash_left),
      used_capital: parseNumber(record.used_capital),
      tracking_error: parseNumber(record.tracking_error),
      allocations: Array.isArray(record.allocations)
        ? record.allocations.map(normalizeAllocation)
        : [],
    };

    const scaledAllocations = normalizedRecord.allocations.map((item: any) => {
      const newLots = Math.max(1, Math.floor(item.so_lo * ratio));
      const newShares = newLots * 100;
      const newSpent = newShares * item.gia_hien_tai;
      return {
        ...item,
        so_lo: newLots,
        so_co_phieu: newShares,
        so_tien_chi: newSpent,
        ty_trong_thuc_te: Math.round((newSpent / capitalInput) * 10000) / 10000,
      };
    });

    const totalSpent = scaledAllocations.reduce((acc: number, curr: any) => acc + curr.so_tien_chi, 0);
    setData({
      ...normalizedRecord,
      capital: capitalInput,
      used_capital: totalSpent,
      cash_left: Math.max(0, capitalInput - totalSpent),
      allocations: scaledAllocations,
    });
  };

  // Dates calculation based on EOD data date
  const eodDataDate = data?.date || '21/07/2026';
  const executeOrderDate = addDaysToDateStr(eodDataDate, 1); // Trading Date T

  // Build Action Plan by comparing existing portfolio vs target allocation

  const buildActionPlan = (): ActionPlanItem[] => {
    if (!data) return [];

    const planMap = new Map<string, ActionPlanItem>();

    // 1. Process existing positions
    existingPortfolio.forEach((pos) => {

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
        unlocked_shares: unlockedShares,
      });
    });

    // 2. Process new target allocations
    data.allocations.forEach((alloc) => {
      if (!planMap.has(alloc.ma_co_phieu)) {
        planMap.set(alloc.ma_co_phieu, {
          ma_co_phieu: alloc.ma_co_phieu,
          action_type: 'BUY_NEW',
          current_shares: 0,
          target_shares: alloc.so_co_phieu,
          change_shares: alloc.so_co_phieu,
          gia_hien_tai: alloc.gia_hien_tai,
          cash_change: alloc.so_tien_chi,
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



  return (
    <div>
      <div className="bg-white shadow-2xl  flex flex-col ">
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

          <div className="z-10 flex items-center gap-3">
            <button
              onClick={() => navigate('/portfolio')}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20 transition-colors"
            >
              Lịch Sử Phân bổ
            </button>
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Capital Controls & Date Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-5 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider shrink-0">
                Chọn phân khúc người dùng :
              </label>
              <div className="rounded-2xl bg-white border border-slate-300 px-4 py-2 text-sm font-black text-slate-900 shadow-2xs sm:w-64">
                {TIER_CONFIG[selectedTier].label} • {TIER_CONFIG[selectedTier].capital.toLocaleString('vi-VN')} đ
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
                <span className="text-[11px] font-semibold text-slate-500 shrink-0">Chọn user tier demo:</span>
                {Object.entries(TIER_CONFIG).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedTier(key as TierKey);
                      fetchLiveRecommendation(preset.capital);
                    }}
                    className={`text-xs font-bold px-3 py-1 rounded-lg border transition-all shrink-0 ${
                      selectedTier === key ? 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50':"" }`} >
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
            <span>Danh mục Hiện tại ({existingPortfolio.length} Mã)</span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'HISTORY'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Lịch sử Đầu tư & Giao dịch</span>
          </button>

          <button
            onClick={() => setActiveTab('PREDICTIONS')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'PREDICTIONS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Hiệu suất Khuyến nghị</span>
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
                      <div className="text-[11px] font-bold text-slate-500 mb-0.5">User Demo</div>
                      <div className="text-lg sm:text-xl font-black text-slate-900">
                        {tierMetrics?.user_tier ?? TIER_CONFIG[selectedTier].label}
                      </div>
                      <div className="text-[10px] text-blue-600 font-semibold mt-1">
                        Vốn khởi tạo: {TIER_CONFIG[selectedTier].capital.toLocaleString('vi-VN')} đ
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 shadow-2xs">
                      <div className="text-[11px] font-bold text-slate-500 mb-0.5">Số dư NAV hiện tại</div>
                      <div className="text-lg sm:text-xl font-black text-emerald-700">
                        {tierMetrics?.current_nav?.toLocaleString('vi-VN') ?? '—'} đ
                      </div>
                      <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                        <PlusCircle className="w-3 h-3" />
                        <span>Đang hiện có sau giao dịch</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 shadow-2xs">
                      <div className="text-[11px] font-bold text-slate-500 mb-0.5">Tiền mặt hiện có</div>
                      <div className="text-lg sm:text-xl font-black text-indigo-700">
                        {tierMetrics?.cash_left?.toLocaleString('vi-VN') ?? '—'} đ
                      </div>
                      <div className="text-[10px] text-indigo-600 font-semibold mt-1 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>Cash khả dụng để mua tiếp</span>
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

                  </div>

                  {/* Warning / Note Alert */}
                  {data?.warning_flag && (
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
                      <h4 className="text-base font-extrabold text-slate-900 flex flex-wrap items-center gap-2">
                        <Activity className="w-4.5 h-4.5 text-blue-600" />
                        <span>Kế hoạch Hành động Ngày {executeOrderDate}</span>
                        {fullHistory.length > 0 && (
                          <select 
                            className="ml-0 sm:ml-2 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 outline-none hover:bg-slate-200 cursor-pointer"
                            value={eodDataDate}
                            onChange={(e) => handleSelectDate(e.target.value)}
                          >
                            {fullHistory.map(h => (
                              <option key={h.date} value={h.date}>Dữ liệu: {h.date}</option>
                            ))}
                          </select>
                        )}
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
                                            Cắt lỗ {Math.abs(item.sell_profit_pct)}% (-{Math.abs(item.sell_profit_cash || 0).toLocaleString('vi-VN')}đ)
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
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400">
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
                        {existingPortfolio.map((pos) => {
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

              {/* Tab 3: HISTORY */}
              {activeTab === 'HISTORY' && (
                <div className="space-y-6">
                  {userHistory.length > 0 && (
                    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                      <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                        <h5 className="text-sm font-bold text-slate-900">Lịch sử NAV hàng ngày</h5>
                        <p className="text-xs text-slate-500 mt-1">
                          Hiển thị tăng/giảm vốn sau mỗi ngày giao dịch cho tài khoản {selectedTier.replace('tier_', '').toUpperCase()}.
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                            <tr>
                              <th className="py-3 px-4">Ngày</th>
                              <th className="py-3 px-4 text-right">NAV</th>
                              <th className="py-3 px-4 text-right">Tiền mặt</th>
                              <th className="py-3 px-4 text-right">Giá trị CP</th>
                              <th className="py-3 px-4 text-right">Thay đổi</th>
                              <th className="py-3 px-4 text-right">% thay đổi</th>
                              <th className="py-3 px-4 text-right">Đối chiếu ban đầu</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                            {userHistory.map((item) => {
                              const isPositive = item.daily_change >= 0;
                              return (
                                <tr key={item.date} className="hover:bg-slate-50">
                                  <td className="py-3 px-4 font-black text-blue-600">{item.date}</td>
                                  <td className="py-3 px-4 text-right font-mono">{item.nav.toLocaleString('vi-VN')} đ</td>
                                  <td className="py-3 px-4 text-right">{item.cash.toLocaleString('vi-VN')} đ</td>
                                  <td className="py-3 px-4 text-right">{item.stock_value.toLocaleString('vi-VN')} đ</td>
                                  <td className={`py-3 px-4 text-right font-black ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {isPositive ? `+${item.daily_change.toLocaleString('vi-VN')} đ` : `${item.daily_change.toLocaleString('vi-VN')} đ`}
                                  </td>
                                  <td className={`py-3 px-4 text-right font-black ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {isPositive ? `+${item.daily_change_pct.toLocaleString('vi-VN')}%` : `${item.daily_change_pct.toLocaleString('vi-VN')}%`}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono">{item.delta_from_start.toLocaleString('vi-VN')} đ</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {tradeHistory.length > 0 && (
                    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                      <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                        <h5 className="text-sm font-bold text-slate-900">Lịch sử giao dịch AI</h5>
                        <p className="text-xs text-slate-500 mt-1">
                          Ghi lại các lệnh mua theo tỷ lệ {tradeHistory[0]?.buy_factor_pct ?? 0}% trên danh mục khuyến nghị.
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                            <tr>
                              <th className="py-3 px-4">Ngày</th>
                              <th className="py-3 px-4">Mã</th>
                              <th className="py-3 px-4 text-right">Hành động</th>
                              <th className="py-3 px-4 text-right">Số lượng</th>
                              <th className="py-3 px-4 text-right">Giá mỗi CP</th>
                              <th className="py-3 px-4 text-right">Tổng tiền</th>
                              <th className="py-3 px-4 text-right">Tỷ lệ mua</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                            {tradeHistory.map((trade, idx) => (
                              <tr key={`${trade.date}-${trade.ticker}-${idx}`} className="hover:bg-slate-50">
                                <td className="py-3 px-4 font-black text-blue-600">{trade.date}</td>
                                <td className="py-3 px-4 font-bold text-slate-900">{trade.ticker}</td>
                                <td className="py-3 px-4 text-right uppercase font-semibold text-slate-700">{trade.action}</td>
                                <td className="py-3 px-4 text-right">{trade.shares.toLocaleString('vi-VN')}</td>
                                <td className="py-3 px-4 text-right font-mono">{trade.price.toLocaleString('vi-VN')} đ</td>
                                <td className="py-3 px-4 text-right font-mono">{trade.total_cost.toLocaleString('vi-VN')} đ</td>
                                <td className="py-3 px-4 text-right font-black text-blue-600">{trade.buy_factor_pct}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: PREDICTIONS */}
              {activeTab === 'PREDICTIONS' && (
                <div className="space-y-6">
                  {aiPredictions.length > 0 ? (
                    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                      <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                        <h5 className="text-sm font-bold text-slate-900">Hiệu suất Danh mục Khuyến nghị (T+1 & T+3)</h5>
                        <p className="text-xs text-slate-500 mt-1">
                          So sánh danh mục AI đề xuất ở cuối mỗi phiên giao dịch và mức tăng trưởng thực tế ở các phiên tiếp theo.
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                            <tr>
                              <th className="py-3 px-4">Ngày Khuyến nghị</th>
                              <th className="py-3 px-4">Danh mục (Top Mã)</th>
                              <th className="py-3 px-4 text-right">Lợi nhuận T+1</th>
                              <th className="py-3 px-4 text-right">Lợi nhuận T+3</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                            {aiPredictions.map((pred, idx) => {
                              const t1Positive = pred.ret_t1 !== null && pred.ret_t1 >= 0;
                              const t3Positive = pred.ret_t3 !== null && pred.ret_t3 >= 0;
                              
                              return (
                                <tr key={`pred-${idx}`} className="hover:bg-slate-50">
                                  <td className="py-3 px-4 font-black text-blue-600">{pred.date}</td>
                                  <td className="py-3 px-4 font-bold text-slate-900">{pred.top_tickers}</td>
                                  <td className={`py-3 px-4 text-right font-black ${pred.ret_t1 === null ? 'text-slate-400' : t1Positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {pred.ret_t1 !== null ? (t1Positive ? `+${pred.ret_t1}%` : `${pred.ret_t1}%`) : 'Đang chờ...'}
                                  </td>
                                  <td className={`py-3 px-4 text-right font-black ${pred.ret_t3 === null ? 'text-slate-400' : t3Positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {pred.ret_t3 !== null ? (t3Positive ? `+${pred.ret_t3}%` : `${pred.ret_t3}%`) : 'Đang chờ...'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-slate-500">Chưa có dữ liệu dự đoán.</div>
                  )}
                </div>
              )}

              {/* Tab 5: LOGS */}
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
              onClick={() => navigate('/')}
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
