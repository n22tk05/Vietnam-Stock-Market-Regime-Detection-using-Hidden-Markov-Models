import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { MarketRegimeView } from '@/types/api';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Database,
  Info,
  Layers,
  LineChart,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  Zap,
} from 'lucide-react';

// Bull Vector Graphic Component
const BullMarketIllustration: React.FC<{ className?: string }> = ({ className = 'w-32 h-32' }) => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="120" height="120" rx="24" fill="#ECFDF5" />
    <path
      d="M30 75C30 75 36 62 50 62C64 62 68 75 86 75C98 75 102 67 102 67"
      stroke="#059669"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <path
      d="M35 55C39 46 47 42 55 46C59 38 71 34 83 42C91 38 99 42 99 46"
      stroke="#10B981"
      strokeWidth="4"
      strokeLinecap="round"
    />
    <circle cx="83" cy="46" r="3.5" fill="#047857" />
    <path
      d="M24 51L32 40M94 40L98 49"
      stroke="#047857"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <path
      d="M45 85L55 98M75 85L85 98"
      stroke="#059669"
      strokeWidth="4"
      strokeLinecap="round"
    />
  </svg>
);

// Mini Sparkline component
const Sparkline: React.FC<{ points: number[]; color?: string }> = ({ points, color = '#10b981' }) => {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const width = 80;
  const height = 28;

  const coords = points
    .map((val, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={coords} />
    </svg>
  );
};

export const MarketPage: React.FC = () => {
  const [_currentRegime, setCurrentRegime] = useState<MarketRegimeView | null>(null);
  const [_regimes, _setRegimes] = useState<MarketRegimeView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('3M');

  const loadMarketData = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const res = await fetch('/simulated_users.json');
      const data = await res.json();
      
      const dashboardData = data.dashboard_data;
      if (dashboardData && dashboardData.market_regime) {
        setCurrentRegime(dashboardData.market_regime as any);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể tải dữ liệu chế độ thị trường.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMarketData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="card" count={4} />
        <LoadingSkeleton type="chart" />
        <LoadingSkeleton type="table" count={5} />
      </div>
    );
  }

  if (errorMessage) {
    return <ErrorState title="Lỗi chế độ thị trường" message={errorMessage} onRetry={loadMarketData} />;
  }

  // Market Regime History Chart mock dataset with shaded regime regions
  const historyData = [
    { date: '21/02', vnindex: 1205.4, confidence: 62, regime: 'SIDEWAY', fill: '#f8fafc' },
    { date: '28/02', vnindex: 1220.1, confidence: 68, regime: 'SIDEWAY', fill: '#f8fafc' },
    { date: '07/03', vnindex: 1255.8, confidence: 75, regime: 'BULL', fill: '#ecfdf5' },
    { date: '14/03', vnindex: 1290.3, confidence: 82, regime: 'BULL', fill: '#ecfdf5' },
    { date: '21/03', vnindex: 1345.2, confidence: 88, regime: 'BULL', fill: '#ecfdf5' },
    { date: '28/03', vnindex: 1310.5, confidence: 80, regime: 'BULL', fill: '#ecfdf5' },
    { date: '04/04', vnindex: 1220.0, confidence: 65, regime: 'BULL', fill: '#ecfdf5' },
    { date: '11/04', vnindex: 1150.2, confidence: 74, regime: 'BEAR', fill: '#fef2f2' },
    { date: '18/04', vnindex: 1128.4, confidence: 85, regime: 'BEAR', fill: '#fef2f2' },
    { date: '25/04', vnindex: 1195.1, confidence: 70, regime: 'SIDEWAY', fill: '#f8fafc' },
    { date: '02/05', vnindex: 1210.8, confidence: 72, regime: 'SIDEWAY', fill: '#f8fafc' },
    { date: '09/05', vnindex: 1245.5, confidence: 78, regime: 'BULL', fill: '#ecfdf5' },
    { date: '16/05', vnindex: 1268.0, confidence: 81, regime: 'BULL', fill: '#ecfdf5' },
    { date: '21/05', vnindex: 1284.41, confidence: 68, regime: 'BULL', fill: '#ecfdf5' },
  ];

  // Shaded region boundaries
  const shadedRegions = [
    { label: 'SIDEWAY', startIdx: 0, endIdx: 1, color: '#f1f5f9', textColor: '#475569' },
    { label: 'BULL', startIdx: 2, endIdx: 6, color: '#dcfce7', textColor: '#15803d' },
    { label: 'BEAR', startIdx: 7, endIdx: 8, color: '#fee2e2', textColor: '#b91c1c' },
    { label: 'SIDEWAY', startIdx: 9, endIdx: 10, color: '#f1f5f9', textColor: '#475569' },
    { label: 'BULL', startIdx: 11, endIdx: 13, color: '#dcfce7', textColor: '#15803d' },
  ];

  const chartWidth = 600;
  const chartHeight = 220;
  const minVn = 1000;
  const maxVn = 1400;

  const getX = (idx: number) => (idx / (historyData.length - 1)) * chartWidth;
  const getY = (val: number) => chartHeight - ((val - minVn) / (maxVn - minVn)) * (chartHeight - 40) - 20;

  const linePoints = historyData.map((d, i) => `${getX(i)},${getY(d.vnindex)}`).join(' ');

  const confidencePoints = historyData
    .map((d, i) => {
      const yConf = chartHeight - (d.confidence / 100) * (chartHeight - 40) - 20;
      return `${getX(i)},${yConf}`;
    })
    .join(' ');

  // Market Cycle History
  const cycles = [
    { cycle: 'Chu kỳ 7', regime: 'BULL', startDate: '25/04/2025', endDate: 'Hiện tại', days: 26, startVn: '1,169.34', endVn: '1,284.41', change: '+9.84%', isPositive: true },
    { cycle: 'Chu kỳ 6', regime: 'SIDEWAY', startDate: '10/04/2025', endDate: '24/04/2025', days: 15, startVn: '1,168.20', endVn: '1,169.34', change: '+0.10%', isPositive: true },
    { cycle: 'Chu kỳ 5', regime: 'BEAR', startDate: '28/02/2025', endDate: '09/04/2025', days: 41, startVn: '1,306.80', endVn: '1,168.20', change: '-10.60%', isPositive: false },
    { cycle: 'Chu kỳ 4', regime: 'SIDEWAY', startDate: '15/01/2025', endDate: '27/02/2025', days: 44, startVn: '1,249.11', endVn: '1,306.80', change: '+4.62%', isPositive: true },
    { cycle: 'Chu kỳ 3', regime: 'BULL', startDate: '05/11/2024', endDate: '14/01/2025', days: 71, startVn: '1,092.10', endVn: '1,249.11', change: '+14.38%', isPositive: true },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Thị trường</span>
          </h1>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mt-1">
            <Link to="/app" className="hover:text-slate-600 transition-colors">Dashboard</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-700 font-bold">Thị trường</span>
            <span className="text-slate-400 font-normal">| Phân tích trạng thái thị trường và chu kỳ</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* VNINDEX Live Card Header Pill */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-800 border border-slate-200/60 shadow-2xs">
            <span>VN-Index</span>
            <span className="font-black text-slate-900">{(_currentRegime as any)?.vnindex ?? '1,284.41'}</span>
            <span className="text-emerald-600 flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full flex items-center gap-2">
            <span>Cập nhật lần cuối: 09:30:45 21/05/2025</span>
            <button onClick={loadMarketData} className="hover:rotate-180 transition-transform duration-300">
              <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Section 1 & 2 Grid: Current Market Regime Card (Left 6) + Market Snapshot 6-Cards (Right 6) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Section 1: Current Market Regime Card (col-span-6) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Trạng thái thị trường hiện tại</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 uppercase">
                {(_currentRegime as any)?.status || 'BULL MARKET'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 pt-4 items-center">
              {/* Left Side: Bull Graphic & Banner */}
              <div className="sm:col-span-5 flex flex-col items-center text-center space-y-2">
                <BullMarketIllustration className="w-28 h-28" />
                <h2 className="text-2xl font-black text-emerald-600 tracking-tight">{(_currentRegime as any)?.status || 'BULL MARKET'}</h2>
                <p className="text-xs font-bold text-slate-700">Thị trường tăng giá</p>
              </div>

              {/* Right Side: Key Metadata List */}
              <div className="sm:col-span-7 space-y-2.5 text-xs">
                {/* Confidence Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-emerald-600" />
                      Confidence
                    </span>
                    <span className="text-slate-900 font-extrabold">{(_currentRegime as any)?.confidence ?? 68}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(_currentRegime as any)?.confidence ?? 68}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="text-slate-500 font-medium">Ngày phát hiện</span>
                  <span className="font-bold text-slate-900">{(_currentRegime as any)?.date || '20/05/2025'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Ngày dữ liệu</span>
                  <span className="font-bold text-slate-900">{(_currentRegime as any)?.date || '20/05/2025'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Mô hình sử dụng</span>
                  <span className="font-extrabold text-slate-900">Hidden Markov Model</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Model version</span>
                  <span className="font-bold text-slate-700">{(_currentRegime as any)?.model_version || 'v2.1.0'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Chu kỳ hiện tại</span>
                  <span className="font-bold text-slate-900">Chu kỳ số 7</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Số ngày trong chu kỳ</span>
                  <span className="font-bold text-slate-900">26 ngày</span>
                </div>
              </div>
            </div>

            {/* Subtitle & Description text */}
            <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 leading-relaxed">
              {(_currentRegime as any)?.advice || 'Wealth4ward AI phát hiện thị trường đang trong giai đoạn tăng giá với động lực tích cực. Nhà đầu tư có thể xem xét tăng tỷ trọng cổ phiếu và tập trung vào các nhóm ngành dẫn dắt.'}
            </p>
          </div>

          <button className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors self-start">
            <span>Xem phân tích chi tiết</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Section 2: Market Snapshot (6 Cards in 2x3 Grid) (col-span-6) */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Card 1: VNINDEX */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase">VN-Index</span>
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg font-black text-slate-900">1,284.41</div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-emerald-600">+12.61 (+0.99%)</span>
              <Sparkline points={[1265, 1268, 1272, 1270, 1279, 1284.41]} color="#10b981" />
            </div>
          </div>

          {/* Card 2: VN30 */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase">VN30-Index</span>
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg font-black text-slate-900">1,337.26</div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-emerald-600">+11.45 (+0.86%)</span>
              <Sparkline points={[1320, 1324, 1328, 1330, 1335, 1337.26]} color="#10b981" />
            </div>
          </div>

          {/* Card 3: HNX-Index */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase">HNX-Index</span>
              <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <LineChart className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg font-black text-slate-900">244.35</div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-emerald-600">+1.98 (+0.82%)</span>
              <Sparkline points={[241, 242, 243, 242.8, 244, 244.35]} color="#10b981" />
            </div>
          </div>

          {/* Card 4: HOSE Liquidity */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase">GTGD (HOSE)</span>
              <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg font-black text-slate-900">21,458 tỷ</div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-emerald-600">+8.21% So với phiên trước</span>
              <Sparkline points={[18000, 19200, 18800, 20100, 20800, 21458]} color="#10b981" />
            </div>
          </div>

          {/* Card 5: Foreign Net Flow */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Khối ngoại (HOSE)</span>
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Database className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-lg font-black text-emerald-600">+1,245 tỷ</div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-emerald-600">Mua ròng</span>
              <Sparkline points={[-200, -50, 300, 500, 900, 1245]} color="#10b981" />
            </div>
          </div>

          {/* Card 6: Advancers / Decliners Ring */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Số mã tăng / giảm</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="text-lg font-black text-slate-900">312 / 89</div>
                <div className="text-[11px] font-medium text-slate-400">Không đổi: 45</div>
              </div>

              {/* Small Donut Ring */}
              <div className="relative w-10 h-10 flex items-center justify-center">
                <svg viewBox="0 0 36 36" className="w-10 h-10 transform -rotate-90">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#ef4444" strokeWidth="4" strokeDasharray="20, 100" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="70, 100" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3 & 4/5 Grid: Market Regime History Chart (Left 8) + Probability & Indicators (Right 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Section 3: Market Regime History (col-span-8) */}
        <div className="lg:col-span-8 bg-white p-5 md:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900">Lịch sử trạng thái thị trường</h3>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
              {['1M', '3M', '6M', '1Y', 'ALL'].map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    activeFilter === f
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center gap-6 text-xs font-bold pt-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span className="text-slate-600">VN-Index</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span className="text-slate-600">Xác suất trạng thái (Confidence)</span>
            </div>
          </div>

          {/* Shaded Regime Line Chart SVG */}
          <div className="relative w-full h-[260px] overflow-hidden pt-2">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" className="w-full h-full">
              {/* Shaded Regime Background Regions */}
              {shadedRegions.map((reg, idx) => {
                const x1 = getX(reg.startIdx);
                const x2 = getX(reg.endIdx);
                const w = Math.max(x2 - x1, 10);
                return (
                  <g key={idx}>
                    <rect x={x1} y="0" width={w} height={chartHeight} fill={reg.color} opacity="0.8" />
                    <text x={x1 + w / 2} y="22" textAnchor="middle" fill={reg.textColor} fontSize="10" fontWeight="bold">
                      {reg.label}
                    </text>
                  </g>
                );
              })}

              {/* Horizontal Grid lines */}
              <line x1="0" y1={getY(1100)} x2={chartWidth} y2={getY(1100)} stroke="#e2e8f0" strokeDasharray="3 3" />
              <line x1="0" y1={getY(1200)} x2={chartWidth} y2={getY(1200)} stroke="#e2e8f0" strokeDasharray="3 3" />
              <line x1="0" y1={getY(1300)} x2={chartWidth} y2={getY(1300)} stroke="#e2e8f0" strokeDasharray="3 3" />

              {/* Confidence Line (Dashed) */}
              <polyline fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" points={confidencePoints} />

              {/* VNINDEX Line (Solid Blue) */}
              <polyline fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={linePoints} />

              {/* Endpoint Marker */}
              {historyData.length > 0 && (() => {
                const lastIdx = historyData.length - 1;
                const lastX = getX(lastIdx);
                const lastY = getY(historyData[lastIdx].vnindex);
                return (
                  <circle cx={lastX} cy={lastY} r="4.5" className="fill-blue-600 stroke-white stroke-2" />
                );
              })()}
            </svg>

            {/* X-Axis Dates */}
            <div className="flex justify-between text-[10px] font-bold text-slate-400 pt-1 px-1">
              {historyData.filter((_, idx) => idx % 2 === 0).map((d) => (
                <span key={d.date}>{d.date}</span>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-medium pt-1 border-t border-slate-100">
            Chú thích: Mỗi màu sắc biểu thị trạng thái thị trường chiếm ưu thế trong thời gian tương ứng.
          </div>
        </div>

        {/* Right Side Panel (col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Section 4: Probability Panel */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">
              Xác suất các trạng thái
            </h3>

            <div className="space-y-3">
              {/* Bull */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-slate-800">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Bull Market
                  </span>
                  <span className="text-emerald-600 font-black">68%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '68%' }} />
                </div>
              </div>

              {/* Sideway */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-slate-800">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                    Sideway Market
                  </span>
                  <span className="text-slate-700 font-black">23%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-600 rounded-full" style={{ width: '23%' }} />
                </div>
              </div>

              {/* Bear */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-slate-800">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    Bear Market
                  </span>
                  <span className="text-rose-600 font-black">9%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: '9%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Leading Indicators */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">
              Các chỉ báo dẫn dắt
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                    <th className="py-2">Chỉ báo</th>
                    <th className="py-2 text-right">Giá trị</th>
                    <th className="py-2 text-right">Tín hiệu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2.5 font-bold text-slate-800">Xu hướng (MA200)</td>
                    <td className="py-2.5 text-right text-slate-600 font-semibold">Tăng</td>
                    <td className="py-2.5 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700">Tích cực</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-slate-800">Động lượng (Momentum)</td>
                    <td className="py-2.5 text-right text-slate-600 font-semibold">102.45</td>
                    <td className="py-2.5 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700">Tích cực</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-slate-800">Độ rộng thị trường</td>
                    <td className="py-2.5 text-right text-slate-600 font-semibold">72%</td>
                    <td className="py-2.5 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700">Tích cực</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-slate-800">Biến động (VIX)</td>
                    <td className="py-2.5 text-right text-slate-600 font-semibold">12.35</td>
                    <td className="py-2.5 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700">Tích cực</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-slate-800">Khối lượng giao dịch</td>
                    <td className="py-2.5 text-right text-slate-600 font-semibold">Cao</td>
                    <td className="py-2.5 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700">Tích cực</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-slate-800">Dòng tiền khối ngoại</td>
                    <td className="py-2.5 text-right text-slate-600 font-semibold">+1,245 tỷ</td>
                    <td className="py-2.5 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700">Tích cực</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors pt-1">
              <span>Xem giải thích chi tiết các chỉ báo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Section 6 & 7: Model Information (Left 6) + Backtest Performance (Right 6) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 6: Model Information */}
        <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">
            Thông tin mô hình
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-medium">Mô hình</span>
              <div className="font-extrabold text-slate-900 mt-0.5">Hidden Markov Model (HMM)</div>
            </div>

            <div>
              <span className="text-slate-400 font-medium">Thuật toán</span>
              <div className="font-extrabold text-slate-900 mt-0.5">Gaussian HMM</div>
            </div>

            <div>
              <span className="text-slate-400 font-medium">Số trạng thái</span>
              <div className="font-extrabold text-slate-900 mt-0.5">3 (Bear, Sideway, Bull)</div>
            </div>

            <div>
              <span className="text-slate-400 font-medium">Dữ liệu huấn luyện</span>
              <div className="font-extrabold text-slate-900 mt-0.5">01/2010 - 12/2024</div>
            </div>

            <div>
              <span className="text-slate-400 font-medium">Tần suất cập nhật</span>
              <div className="font-extrabold text-slate-900 mt-0.5">Hàng ngày</div>
            </div>

            <div>
              <span className="text-slate-400 font-medium">Độ dài chuỗi trạng thái trung bình</span>
              <div className="font-extrabold text-slate-900 mt-0.5">19 ngày</div>
            </div>
          </div>
        </div>

        {/* Section 7: Backtest Performance */}
        <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-black text-slate-900">Hiệu suất mô hình (Backtest)</h3>
              <Info className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Precision (Bull)</span>
              <div className="text-lg font-black text-slate-900 mt-1">72.45%</div>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Precision (Bear)</span>
              <div className="text-lg font-black text-slate-900 mt-1">76.12%</div>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Precision (Sideway)</span>
              <div className="text-lg font-black text-slate-900 mt-1">68.31%</div>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Tổng độ chính xác</span>
              <div className="text-lg font-black text-emerald-600 mt-1">72.91%</div>
            </div>
          </div>

          <button className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors pt-1">
            <span>Xem báo cáo backtest chi tiết</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Section 8: Market Cycle History Table */}
      <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-black text-slate-900">Lịch sử các chu kỳ thị trường</h3>
          <button className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
            <span>Xem tất cả chu kỳ</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/80">
                <th className="py-3 px-3">Chu kỳ</th>
                <th className="py-3 px-3">Trạng thái</th>
                <th className="py-3 px-3">Bắt đầu</th>
                <th className="py-3 px-3">Kết thúc</th>
                <th className="py-3 px-3 text-right">Số ngày</th>
                <th className="py-3 px-3 text-right">VN-Index (Bắt đầu)</th>
                <th className="py-3 px-3 text-right">VN-Index (Kết thúc)</th>
                <th className="py-3 px-3 text-right">Biến động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {cycles.map((row) => (
                <tr key={row.cycle} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-3 font-bold text-slate-900">{row.cycle}</td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        row.regime === 'BULL'
                          ? 'bg-emerald-100 text-emerald-700'
                          : row.regime === 'BEAR'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {row.regime}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 font-medium">{row.startDate}</td>
                  <td className="py-3.5 px-3 text-slate-600 font-medium">{row.endDate}</td>
                  <td className="py-3.5 px-3 text-slate-900 font-bold text-right">{row.days}</td>
                  <td className="py-3.5 px-3 text-slate-700 text-right">{row.startVn}</td>
                  <td className="py-3.5 px-3 text-slate-900 font-extrabold text-right">{row.endVn}</td>
                  <td
                    className={`py-3.5 px-3 font-black text-right ${
                      row.isPositive ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {row.change}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Disclaimer */}
      <div className="bg-slate-100/90 p-4 rounded-2xl border border-slate-200/80 flex items-start gap-3 text-xs text-slate-600">
        <ShieldAlert className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-extrabold text-slate-800">Miễn trừ trách nhiệm: </span>
          Phân tích thị trường được tạo bởi mô hình AI Hidden Markov Model dựa trên dữ liệu lịch sử. Kết quả chỉ mang tính tham khảo và không phải khuyến nghị đầu tư.
        </div>
      </div>
    </div>
  );
};
