import React, { useState } from 'react';
import {
  Compass,
  ShieldCheck,
  Cpu,
  MessageSquareText,
  RotateCcw,
  GraduationCap,
  ArrowRight,
  X,
  Check,
} from 'lucide-react';

interface FeatureItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  tag: string;
  details: string[];
}

export const FeaturesGrid: React.FC = () => {
  const [selectedFeature, setSelectedFeature] = useState<FeatureItem | null>(null);

  const features: FeatureItem[] = [
    {
      id: 'builder',
      title: 'AI Portfolio Builder',
      description: 'Custom portfolios built on mathematical frontiers, not gut feeling.',
      icon: Compass,
      tag: 'Core Feature',
      details: [
        'Black-Litterman mathematical optimization framework',
        'Personalized risk-return frontier tailored to your time horizon',
        'Multi-asset class allocation (Global Equities, Fixed Income, Commodities)',
        'Automatic tax loss harvesting considerations',
      ],
    },
    {
      id: 'risk',
      title: 'Risk Management',
      description: 'Active monitoring to protect your downside before the market turns.',
      icon: ShieldCheck,
      tag: 'Institutional Grade',
      details: [
        'Real-time Value at Risk (VaR) tracking',
        'Automated drawdown limit warnings and stop-loss prompts',
        'Macro stress-testing against historical crash scenarios (2008, 2020)',
        'Correlation matrix monitoring to prevent false diversification',
      ],
    },
    {
      id: 'regime',
      title: 'Regime Detection',
      description: 'AI recognizes if we are in a bull, bear, or sideways market instantly.',
      icon: Cpu,
      tag: 'Machine Learning',
      details: [
        'Hidden Markov Model market state classification',
        'Volatility index & credit spread anomaly detection',
        'Dynamic equity-to-cash weight shifting depending on market regime',
        'Early warning indicator for momentum reversals',
      ],
    },
    {
      id: 'explainable',
      title: 'Explainable AI',
      description: "We don't just give advice; we explain exactly why using data logic.",
      icon: MessageSquareText,
      tag: 'Transparency',
      details: [
        'Plain English summaries for every trade recommendation',
        'Breakdown of key quantitative factors driving each signal',
        'No black box algorithms — full audit trail of decision logic',
        'Interactive AI Chat assistant to ask questions about your portfolio',
      ],
    },
    {
      id: 'rebalancing',
      title: 'Rebalancing',
      description: 'Stay aligned with your goals with automated rebalancing prompts.',
      icon: RotateCcw,
      tag: 'Automation',
      details: [
        'Smart threshold-based rebalancing alerts',
        'Minimizes trading friction and capital gains impact',
        'Automated dividend reinvestment strategies',
        'One-click execution across connected brokerage accounts',
      ],
    },
    {
      id: 'learning',
      title: 'Learning Hub',
      description: 'Education that evolves with your portfolio performance.',
      icon: GraduationCap,
      tag: 'Personalized',
      details: [
        'Bite-sized modules tailored to your active asset classes',
        'Behavioral psychology exercises to curb panic buying/selling',
        'Weekly market regime briefings and macroeconomic context',
        'Interactive financial literacy quizzes with reward badges',
      ],
    },
  ];

  return (
    <section id="features" className="py-section-gap px-6 md:px-container-padding bg-surface">
      <div className="max-w-max-width mx-auto">
        <div className="mb-16">
          <span className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 block">
            POWERFUL FEATURES
          </span>
          <h2 className="font-display-md text-3xl sm:text-4xl md:text-display-md text-on-background mb-4 font-bold">
            Institutional intelligence for you.
          </h2>
          <p className="font-body-xl text-lg md:text-body-xl text-on-surface-variant max-w-xl">
            Everything you need to grow wealth sustainably. Designed for clarity, discipline, and long-term peace of mind.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedFeature(item)}
                className="glass-card p-8 md:p-10 rounded-premium hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group border border-outline-variant/40 relative overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-12 h-12 bg-secondary-fixed rounded-xl flex items-center justify-center text-secondary group-hover:scale-110 group-hover:bg-secondary group-hover:text-white transition-all shadow-sm">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-surface-container text-on-surface-variant group-hover:bg-secondary-fixed group-hover:text-on-secondary-fixed-variant transition-colors">
                      {item.tag}
                    </span>
                  </div>

                  <h3 className="font-headline-lg text-xl md:text-[24px] mb-4 font-bold text-on-background group-hover:text-secondary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-on-surface-variant font-body-lg text-sm md:text-base leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-outline-variant/20 flex items-center gap-2 text-xs font-bold text-secondary group-hover:translate-x-1 transition-transform">
                  <span>Explore details</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Details Modal */}
      {selectedFeature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-premium p-8 md:p-10 max-w-xl w-full shadow-2xl relative border border-outline-variant/40">
            <button
              onClick={() => setSelectedFeature(null)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-surface-container text-on-surface-variant"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-secondary text-white flex items-center justify-center shadow-lg shadow-secondary/30">
                <selectedFeature.icon className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                  {selectedFeature.tag}
                </span>
                <h3 className="text-2xl font-bold text-on-background">
                  {selectedFeature.title}
                </h3>
              </div>
            </div>

            <p className="text-on-surface-variant text-base mb-6 leading-relaxed">
              {selectedFeature.description}
            </p>

            <div className="space-y-3 mb-8">
              <h4 className="text-xs font-bold text-outline uppercase tracking-wider">
                Key Capabilities
              </h4>
              {selectedFeature.details.map((detail, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm text-on-surface">
                  <div className="w-5 h-5 rounded-full bg-tertiary-container text-[#009668] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>{detail}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedFeature(null)}
              className="w-full btn-primary text-white py-3.5 rounded-full font-semibold text-sm"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
