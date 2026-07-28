import React from 'react';
import { Frown, AlertCircle, TrendingDown, ShieldAlert } from 'lucide-react';

export const ProblemSection: React.FC = () => {
  const stats = [
    {
      percentage: '73%',
      label: 'Lack a clear strategy',
      description: 'Entering trades without defined entry, exit, or position size targets.',
      icon: TrendingDown,
    },
    {
      percentage: '68%',
      label: 'Trade on emotion',
      description: 'Buying at peak FOMO and panic selling at the bottom during dips.',
      icon: Frown,
    },
    {
      percentage: '90%',
      label: 'No risk monitoring',
      description: 'Exposing portfolios to catastrophic downside without stress testing.',
      icon: ShieldAlert,
    },
  ];

  return (
    <section className="py-section-gap px-6 md:px-container-padding bg-white relative overflow-hidden">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-error-container text-error mb-8 shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>

        <h2 className="font-display-md text-3xl sm:text-4xl md:text-display-md text-on-background mb-6 font-bold leading-tight">
          95% of new investors lose money because of emotional decisions.
        </h2>

        <p className="font-body-xl text-base sm:text-lg md:text-body-xl text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
          Not because they lack opportunities, but because they lack discipline. Market volatility triggers FOMO and panic, leading to inconsistent results.
        </p>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {stats.map((stat, idx) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={idx}
                className="glass-card p-8 rounded-premium text-center hover:shadow-xl transition-all hover:-translate-y-1 group border border-outline-variant/30"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-secondary-fixed text-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <IconComponent className="w-6 h-6" />
                </div>
                <div className="text-4xl md:text-headline-lg font-headline-lg text-secondary mb-2 font-black">
                  {stat.percentage}
                </div>
                <div className="font-label-md text-label-md text-on-surface font-semibold mb-2">
                  {stat.label}
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {stat.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
