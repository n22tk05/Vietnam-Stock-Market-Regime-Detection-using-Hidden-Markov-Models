import React, { useState } from 'react';
import {
  Database,
  BarChart3,
  Radar,
  ShieldCheck,
  Sliders,
  CheckCircle2,
  ChevronRight,
  Zap,
} from 'lucide-react';

export const IntelligenceCoreTimeline: React.FC = () => {
  const [activeStep, setActiveStep] = useState(2);

  const steps = [
    {
      id: 0,
      title: 'Market Data',
      subtitle: 'Real-time global feeds & indices',
      icon: Database,
      details:
        'Continuously ingests over 50,000 tickers, order book liquidity, historical price action, and macroeconomic feeds 24/7.',
      metric: '50,000+ Instruments',
    },
    {
      id: 1,
      title: 'Economic Indicators',
      subtitle: 'CPI, Interest rates & Sentiment',
      icon: BarChart3,
      details:
        'Analyzes central bank interest rate trajectories, inflation trends, corporate earnings quality, and retail/institutional sentiment metrics.',
      metric: 'Real-time Macro Feed',
    },
    {
      id: 2,
      title: 'Regime Detection',
      subtitle: 'Identifying Bull/Bear cycles',
      icon: Radar,
      details:
        'Uses hidden Markov models and deep neural networks to accurately classify whether markets are in high-growth Bull, defensive Bear, or ranging Volatile regimes.',
      metric: '92% Classification Accuracy',
    },
    {
      id: 3,
      title: 'Risk Analysis',
      subtitle: 'Stress testing & Volatility',
      icon: ShieldCheck,
      details:
        'Simulates 10,000+ Monte Carlo shock scenarios (e.g., liquidity crunches, interest rate spikes) to calculate Value at Risk (VaR).',
      metric: '10,000 Monte Carlo Simulations',
    },
    {
      id: 4,
      title: 'Portfolio Optimization',
      subtitle: 'Black-Litterman refinement',
      icon: Sliders,
      details:
        'Constructs institutional-grade portfolios using mean-variance optimization enhanced by AI parameter estimates to prevent over-concentration.',
      metric: 'Sharpe Ratio Maximized',
    },
    {
      id: 5,
      title: 'Recommendation',
      subtitle: 'Transparent, actionable steps',
      icon: CheckCircle2,
      details:
        'Delivers clear, step-by-step rebalancing advice explained in plain natural language with exact target weightings.',
      metric: '100% Explainable AI',
    },
  ];

  const CurrentStep = steps[activeStep];
  const IconComp = CurrentStep.icon;

  return (
    <section id="timeline" className="py-section-gap px-6 md:px-container-padding bg-surface-container-low overflow-hidden">
      <div className="max-w-max-width mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-md text-xs mb-4">
            <Zap className="w-3.5 h-3.5 text-secondary" />
            <span>HOW ASTERA THINKS</span>
          </div>
          <h2 className="font-headline-lg text-3xl md:text-headline-lg text-on-background font-bold">
            Astera Intelligence Core
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-2 max-w-xl mx-auto">
            How we process millions of data points into actionable discipline. Click any step to inspect the AI engine.
          </p>
        </div>

        {/* Pipeline Nodes */}
        <div className="relative flex flex-col lg:flex-row justify-between items-center gap-6 lg:gap-4 mb-12">
          {/* Connector Line (Desktop) */}
          <div className="hidden lg:block absolute top-12 left-10 right-10 h-[2px] bg-outline-variant/40 z-0" />

          {steps.map((step) => {
            const StepIcon = step.icon;
            const isActive = step.id === activeStep;
            return (
              <div
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`relative z-10 flex flex-col items-center text-center cursor-pointer transition-all duration-300 group max-w-[170px] ${
                  isActive ? 'scale-105' : 'hover:scale-102 opacity-80 hover:opacity-100'
                }`}
              >
                <div
                  className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center mb-4 transition-all duration-300 shadow-md ${
                    isActive
                      ? 'bg-secondary text-white shadow-lg shadow-secondary/40 ring-4 ring-secondary/20'
                      : 'glass-card text-secondary group-hover:border-secondary'
                  }`}
                >
                  <StepIcon className="w-8 h-8 md:w-10 md:h-10" />
                </div>
                <h4
                  className={`font-label-md text-sm md:text-label-md font-bold mb-1 ${
                    isActive ? 'text-secondary' : 'text-on-surface'
                  }`}
                >
                  {step.title}
                </h4>
                <p className="text-[12px] text-on-surface-variant leading-tight">
                  {step.subtitle}
                </p>
              </div>
            );
          })}
        </div>

        {/* Selected Step Detail Panel */}
        <div className="glass-card p-8 md:p-10 rounded-premium max-w-3xl mx-auto border border-white/70 shadow-xl transition-all duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-outline-variant/30">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-secondary-fixed text-secondary flex items-center justify-center">
                <IconComp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                  Step {CurrentStep.id + 1} of 6
                </span>
                <h3 className="text-xl md:text-2xl font-bold text-on-background">
                  {CurrentStep.title}
                </h3>
              </div>
            </div>
            <div className="px-4 py-2 rounded-full bg-tertiary-container text-[#009668] text-xs font-bold border border-[#009668]/30">
              {CurrentStep.metric}
            </div>
          </div>

          <p className="text-on-surface-variant text-base md:text-body-lg leading-relaxed mb-6">
            {CurrentStep.details}
          </p>

          <div className="flex justify-between items-center text-xs text-outline font-medium">
            <span>Click nodes above to inspect pipeline steps</span>
            <button
              onClick={() => setActiveStep((prev) => (prev + 1) % steps.length)}
              className="flex items-center gap-1 text-secondary font-bold hover:underline"
            >
              Next step <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
