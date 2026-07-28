import React, { useState } from 'react';
import {
  Lightbulb,
  TrendingUp,
  Shield,
  Activity,
  ArrowUpRight,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle,
} from 'lucide-react';

export const InteractiveDashboardPreview: React.FC = () => {
  const [regime, setRegime] = useState<'bull' | 'bear' | 'volatile'>('bull');
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [rebalancedMessage, setRebalancedMessage] = useState(false);

  const regimeData = {
    bull: {
      score: 92,
      regimeLabel: 'Bull Market',
      regimeBadgeClass: 'text-[#009668] bg-[#009668]/10 border-[#009668]/30',
      description: 'Currently in a low-volatility growth phase. Maintain equity weight.',
      estReturn: '+18.6%',
      recommendation:
        'Slightly overweight in technology equities (+4.2%). Consider rebalancing 5% into global financials and treasury bonds.',
      allocation: [
        { asset: 'Global Tech Equities', pct: 45, color: 'bg-secondary' },
        { asset: 'US Index Funds', pct: 25, color: 'bg-[#316bf3]' },
        { asset: 'Fixed Income & Bonds', pct: 20, color: 'bg-primary-container' },
        { asset: 'Cash Reserves', pct: 10, color: 'bg-[#76777d]' },
      ],
    },
    bear: {
      score: 84,
      regimeLabel: 'Bear Defense',
      regimeBadgeClass: 'text-amber-600 bg-amber-500/10 border-amber-500/30',
      description: 'Macro indicator signals elevated downside risk. Capital preservation mode.',
      estReturn: '+6.2%',
      recommendation:
        'Increase defensive positioning. AI recommends trimming high-beta growth stocks by 12% and increasing short-duration Treasuries.',
      allocation: [
        { asset: 'Fixed Income & Treasuries', pct: 50, color: 'bg-primary-container' },
        { asset: 'Defensive Value Stocks', pct: 25, color: 'bg-secondary' },
        { asset: 'Gold & Commodities', pct: 15, color: 'bg-amber-500' },
        { asset: 'Cash Reserves', pct: 10, color: 'bg-[#76777d]' },
      ],
    },
    volatile: {
      score: 88,
      regimeLabel: 'Ranging / Volatile',
      regimeBadgeClass: 'text-purple-600 bg-purple-500/10 border-purple-500/30',
      description: 'High intraday swing frequency. Dollar-cost averaging recommended.',
      estReturn: '+12.4%',
      recommendation:
        'Market is moving sideways with high chop. Keep liquidity high and execute tactical rebalancing on dips exceeding 2.5%.',
      allocation: [
        { asset: 'Dividend Equities', pct: 35, color: 'bg-secondary' },
        { asset: 'Global Bonds', pct: 30, color: 'bg-primary-container' },
        { asset: 'Real Estate REITS', pct: 20, color: 'bg-purple-600' },
        { asset: 'Cash Reserves', pct: 15, color: 'bg-[#76777d]' },
      ],
    },
  };

  const activeData = regimeData[regime];

  const handleSimulateRebalance = () => {
    setIsRebalancing(true);
    setTimeout(() => {
      setIsRebalancing(false);
      setRebalancedMessage(true);
      setTimeout(() => setRebalancedMessage(false), 4000);
    }, 1200);
  };

  return (
    <section
      id="dashboard-preview"
      className="py-section-gap px-6 md:px-container-padding bg-surface-container-low overflow-hidden relative"
    >
      <div className="max-w-max-width mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-md text-xs mb-3">
              <Activity className="w-3.5 h-3.5 text-secondary" />
              <span>LIVE INTERACTIVE SIMULATION</span>
            </div>
            <h2 className="font-display-md text-3xl sm:text-4xl md:text-display-md text-on-background font-bold leading-tight">
              Your Portfolio, Reimagined.
            </h2>
            <p className="font-body-lg text-base md:text-body-lg text-on-surface-variant mt-2 max-w-lg">
              Test how Astera AI adapts portfolio weightings in real time across different market conditions.
            </p>
          </div>

          {/* Regime Selector Controls */}
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-full border border-outline-variant/40 shadow-sm self-start lg:self-auto">
            <span className="text-xs font-bold text-outline px-3 hidden sm:inline">
              Simulate Market:
            </span>
            <button
              onClick={() => setRegime('bull')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                regime === 'bull'
                  ? 'bg-secondary text-white shadow-md'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Bull Growth
            </button>
            <button
              onClick={() => setRegime('bear')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                regime === 'bear'
                  ? 'bg-secondary text-white shadow-md'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Bear Defense
            </button>
            <button
              onClick={() => setRegime('volatile')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                regime === 'volatile'
                  ? 'bg-secondary text-white shadow-md'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Volatile
            </button>
          </div>
        </div>

        {/* Dashboard Canvas Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Panel: Metrics & AI Advice (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Metric 1: Health Score */}
            <div className="glass-card p-6 rounded-premium flex items-start gap-6 border border-white/80 shadow-md">
              <div className="text-4xl md:text-5xl font-black text-secondary shrink-0">
                {activeData.score}
              </div>
              <div>
                <h4 className="font-headline-lg text-lg font-bold mb-1">
                  Portfolio Health Score
                </h4>
                <p className="text-on-surface-variant text-xs md:text-sm">
                  An aggregate metric of risk balance, diversification, and market trend alignment.
                </p>
              </div>
            </div>

            {/* Metric 2: Regime Indicator */}
            <div className="glass-card p-6 rounded-premium flex items-start gap-6 border border-white/80 shadow-md">
              <div
                className={`px-3 py-1.5 rounded-full font-black text-base md:text-lg border ${activeData.regimeBadgeClass} shrink-0`}
              >
                {activeData.regimeLabel}
              </div>
              <div>
                <h4 className="font-headline-lg text-lg font-bold mb-1">
                  Active Market Regime
                </h4>
                <p className="text-on-surface-variant text-xs md:text-sm">
                  {activeData.description}
                </p>
              </div>
            </div>

            {/* Metric 3: AI Recommendation */}
            <div className="glass-card p-6 rounded-premium border-l-4 border-secondary border-t border-r border-b border-white/80 shadow-md relative overflow-hidden">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-headline-lg text-lg font-bold mb-1 text-on-background flex items-center gap-2">
                    <span>AI Recommendation</span>
                    <span className="text-[10px] bg-secondary-fixed text-on-secondary-fixed-variant px-2 py-0.5 rounded-full font-bold">
                      LIVE
                    </span>
                  </h4>
                  <p className="text-on-surface-variant text-xs md:text-sm leading-relaxed mb-4">
                    {activeData.recommendation}
                  </p>

                  <button
                    onClick={handleSimulateRebalance}
                    disabled={isRebalancing}
                    className="btn-primary text-white text-xs font-semibold px-5 py-2.5 rounded-full flex items-center gap-2 disabled:opacity-75"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRebalancing ? 'animate-spin' : ''}`} />
                    <span>{isRebalancing ? 'Optimizing Portfolio...' : 'Execute One-Click Rebalance'}</span>
                  </button>
                </div>
              </div>

              {rebalancedMessage && (
                <div className="mt-4 p-3 rounded-xl bg-tertiary-container text-[#009668] text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-300">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Portfolio successfully realigned to target Sharpe ratio!</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Simulated Interactive Dashboard Graphic (7 Cols) */}
          <div className="lg:col-span-7 relative">
            <div className="glass-card p-6 md:p-8 rounded-premium border-2 border-white/80 shadow-2xl space-y-6">
              {/* Dashboard Topbar */}
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-error" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-[#009668]" />
                  <span className="text-xs font-mono text-outline ml-2">
                    Astera Wealth OS v2.4
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Auto-Pilot: ON</span>
                </div>
              </div>

              {/* Portfolio Performance Summary Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold text-outline uppercase tracking-wider">
                    Total Portfolio Value
                  </span>
                  <div className="text-3xl md:text-4xl font-extrabold text-on-background tracking-tight">
                    $284,520.00
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-tertiary-container text-[#009668] font-bold text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>{activeData.estReturn} Projected Annual</span>
                </div>
              </div>

              {/* Allocation Progress Visual Bar */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-on-surface">Target Asset Allocation</span>
                  <span className="text-secondary">100% Balanced</span>
                </div>
                <div className="h-4 w-full rounded-full overflow-hidden flex bg-surface-container gap-1 p-0.5">
                  {activeData.allocation.map((item, idx) => (
                    <div
                      key={idx}
                      style={{ width: `${item.pct}%` }}
                      className={`${item.color} h-full rounded-sm transition-all duration-700`}
                      title={`${item.asset}: ${item.pct}%`}
                    />
                  ))}
                </div>
              </div>

              {/* Asset Allocation Breakdown Table */}
              <div className="space-y-3 pt-2">
                {activeData.allocation.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/60 transition-colors border border-transparent hover:border-outline-variant/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3.5 h-3.5 rounded-full ${item.color}`} />
                      <span className="text-sm font-semibold text-on-surface">
                        {item.asset}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-mono font-bold text-on-background">
                        {item.pct}%
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-outline" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating Highlight Badge */}
            <div className="absolute -top-6 -right-6 glass-card p-4 rounded-2xl shadow-2xl hidden md:flex items-center gap-3 border border-white/80 animate-bounce">
              <div className="w-10 h-10 rounded-xl bg-secondary text-white flex items-center justify-center font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-black text-on-background">{activeData.estReturn}</div>
                <div className="text-[10px] text-outline uppercase font-semibold">
                  Est. Annual Return
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
