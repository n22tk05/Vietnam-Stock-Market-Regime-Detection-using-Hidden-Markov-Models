import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  ArrowLeft, 
  RotateCcw, 
  Wallet, 
  TrendingUp, 
  Cpu, 
  ShieldCheck, 
  Sparkles, 
  HelpCircle,
  Clock,
  Layers,
  User,
  LogOut
} from 'lucide-react';
import { MetricsGrid } from '@/components/dashboard/MetricsGrid';
import { ForecastTable } from '@/components/dashboard/ForecastTable';
import { TradingViewAreaChart } from '@/components/charts/TradingViewAreaChart';
import { StockDetailModal } from '@/components/common/StockDetailModal';
import { DisclaimerModal } from '@/components/common/DisclaimerModal';
import { AssessmentModal } from '@/features/assessment/AssessmentModal';
import { 
  StockItem, 
  MetricCardData, 
  INITIAL_TOP_STOCKS, 
  INITIAL_CHART_DATA 
} from '@/types/dashboard';

export const DashboardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, logout } = useAuth();

  // Initialize Capital State from URL param or LocalStorage or default 500M VND
  const getInitialCapital = () => {
    const paramCap = searchParams.get('capital');
    if (paramCap) {
      const parsed = parseInt(paramCap, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const localCap = localStorage.getItem('aiquantum_capital');
    if (localCap) {
      const parsed = parseInt(localCap, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 500000000;
  };

  const [capital, setCapital] = useState<number>(getInitialCapital);
  const [customCapitalInput, setCustomCapitalInput] = useState<string>(() => getInitialCapital().toString());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const paramCap = searchParams.get('capital');
    if (paramCap) {
      const parsed = parseInt(paramCap, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed !== capital) {
        setCapital(parsed);
        setCustomCapitalInput(parsed.toString());
      }
    }
  }, [searchParams]);

  // Selected Stock for Modal
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);

  // Modals state
  const [isAssessmentOpen, setIsAssessmentOpen] = useState<boolean>(false);
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState<boolean>(false);

  // Stocks state
  const [stocks] = useState<StockItem[]>(INITIAL_TOP_STOCKS);

  // Calculate Metrics dynamically based on capital
  const totalAllocatedWeight = stocks.reduce((acc, s) => acc + (s.category === 'buy' ? s.targetWeight : 0), 0);
  const totalAllocated = Math.round(capital * totalAllocatedWeight);
  const availableCash = Math.max(0, capital - totalAllocated);
  const cashRatioPct = Math.round((availableCash / capital) * 100);

  const metrics: MetricCardData = {
    nav: capital,
    navProfitPct: 58.06,
    totalAllocated,
    availableCash,
    cashRatioPct,
    marketRegime: 'Bullish Continuation (Tăng trưởng ổn định)',
    winRate: 74.2,
    sharpeRatio: 2.18,
    maxDrawdown: -4.8,
  };

  // Handle Capital Change with Simulated 300ms Loading Skeleton
  const handleCapitalPreset = (amount: number) => {
    setIsLoading(true);
    setCapital(amount);
    setCustomCapitalInput(amount.toString());
    setTimeout(() => {
      setIsLoading(false);
    }, 300);
  };

  const handleCustomCapitalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customCapitalInput.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= 10000000) {
      setIsLoading(true);
      setCapital(parsed);
      setTimeout(() => {
        setIsLoading(false);
      }, 300);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-3.5 shadow-xs">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          {/* Brand & Market Status */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <span className="font-black text-lg text-slate-900 tracking-tight">AI QUANTUM</span>
                <span className="text-[10px] block font-mono font-bold text-blue-600 uppercase tracking-widest -mt-1">
                  Terminal v7.0
                </span>
              </div>
            </Link>

            {/* Market Regime Badge */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>Thị trường: {metrics.marketRegime}</span>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDisclaimerOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <span>Miễn trừ trách nhiệm</span>
            </button>

            <button
              onClick={() => setIsAssessmentOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Khảo Sát Khẩu Vị Rủi Ro</span>
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>{user?.fullName || user?.email?.split('@')[0] || 'Nhà đầu tư'}</span>
                </div>
                <button
                  onClick={logout}
                  title="Đăng xuất"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors"
              >
                Đăng Nhập
              </Link>
            )}

            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Về Trang Chủ</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Capital Controls Header Banner */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Không Gian Điều Hành Khuyến Nghị
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                PPO Model Active
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Nhập quy mô vốn để hệ thống tự động tính toán khối lượng mua và phân bổ tỷ trọng an toàn.
            </p>
          </div>

          {/* Quick Capital Switcher Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
              {[
                { label: '100 Triệu', value: 100000000 },
                { label: '500 Triệu', value: 500000000 },
                { label: '1 Tỷ', value: 1000000000 },
                { label: '3 Tỷ', value: 3000000000 },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleCapitalPreset(item.value)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    capital === item.value
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Custom Capital Input */}
            <form onSubmit={handleCustomCapitalSubmit} className="flex items-center gap-1.5">
              <div className="relative">
                <input
                  type="text"
                  value={new Intl.NumberFormat('vi-VN').format(
                    parseInt(customCapitalInput.replace(/\D/g, '') || '0', 10)
                  )}
                  onChange={(e) => setCustomCapitalInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Nhập số vốn..."
                  className="w-36 px-3 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
              >
                Áp Dụng
              </button>
            </form>
          </div>
        </div>

        {/* 3 Core Asset Cards */}
        <MetricsGrid metrics={metrics} isLoading={isLoading} />

        {/* TradingView Performance Chart Section */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  Tăng Trưởng Danh Mục Mô Phỏng (HMM-PPO vs VN-Index)
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Lợi nhuận vượt trội: +38.22%
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Dữ liệu kiểm thử ngược (backtest) 10 tháng gần nhất trên toàn bộ rổ cổ phiếu VN30.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-600" />
                <span className="text-slate-700">AI QUANTUM (+58.06%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-400" />
                <span className="text-slate-600">VN-Index (+19.84%)</span>
              </div>
            </div>
          </div>

          {/* Chart Container Height 380px */}
          <div className="h-[380px] w-full">
            <TradingViewAreaChart data={INITIAL_CHART_DATA} navValue={capital} />
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between text-xs text-slate-600 border-t border-slate-100 gap-2">
            <div className="flex items-center gap-4">
              <span>Tỷ lệ Sharpe: <strong className="text-slate-800 font-mono">2.18</strong></span>
              <span>Tỷ lệ Lệnh Thắng: <strong className="text-slate-800 font-mono">74.2%</strong></span>
              <span>Mức Sụt Giảm Tối Đa (Max DD): <strong className="text-slate-800 font-mono">-4.8%</strong></span>
            </div>
            <span className="text-slate-400">TradingView Lightweight Charts v4.2 Engine</span>
          </div>
        </div>

        {/* Forecast Table 100% Full Width */}
        <ForecastTable
          stocks={stocks}
          capital={capital}
          isLoading={isLoading}
          onSelectStock={(stk) => setSelectedStock(stk)}
        />
      </main>

      {/* Stock Detail Modal */}
      <StockDetailModal
        stock={selectedStock}
        capital={capital}
        onClose={() => setSelectedStock(null)}
      />

      {/* Legal Disclaimer Modal */}
      <DisclaimerModal
        isOpen={isDisclaimerOpen}
        onClose={() => setIsDisclaimerOpen(false)}
      />

      {/* Risk Assessment Modal */}
      <AssessmentModal
        isOpen={isAssessmentOpen}
        onClose={() => setIsAssessmentOpen(false)}
        onComplete={(newCap) => {
          handleCapitalPreset(newCap);
        }}
      />
    </div>
  );
};

export default DashboardPage;
