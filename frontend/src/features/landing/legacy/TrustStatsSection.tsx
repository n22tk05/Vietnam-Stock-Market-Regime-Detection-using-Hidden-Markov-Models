import React from 'react';
import { Brain, UserCheck, Eye, ShieldCheck } from 'lucide-react';

export const TrustStatsSection: React.FC = () => {
  const trustPillars = [
    {
      icon: Brain,
      title: 'AI-Driven',
      description: 'Objective quantitative data processing free from human emotion or cognitive bias.',
    },
    {
      icon: UserCheck,
      title: 'Personalized',
      description: 'Strategies engineered to match your individual risk tolerance and life milestones.',
    },
    {
      icon: Eye,
      title: 'Transparent',
      description: 'Understand the underlying logic behind every single rebalance recommendation.',
    },
  ];

  const stats = [
    { value: '10K+', label: 'Portfolios Generated' },
    { value: '50M+', label: 'Data points processed daily' },
    { value: '92%', label: 'AI Regime Prediction Accuracy' },
  ];

  return (
    <section id="why-astera" className="py-section-gap px-6 md:px-container-padding bg-white">
      <div className="max-w-max-width mx-auto">
        {/* Trust Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-28">
          {trustPillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="text-center p-8 glass-card rounded-premium hover:shadow-xl transition-all border border-outline-variant/30 group"
              >
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-secondary-fixed text-secondary flex items-center justify-center group-hover:scale-110 group-hover:bg-secondary group-hover:text-white transition-all shadow-sm">
                  <Icon className="w-8 h-8" />
                </div>
                <h3 className="font-headline-lg text-xl font-bold text-on-background mb-3">
                  {pillar.title}
                </h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Stats Summary Counter */}
        <div className="border-t border-outline-variant/30 pt-20 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          {stats.map((stat, idx) => (
            <div key={idx} className="group">
              <div className="text-4xl md:text-display-md text-secondary font-black mb-2 tracking-tight group-hover:scale-105 transition-transform">
                {stat.value}
              </div>
              <div className="font-label-md text-xs md:text-label-md text-outline uppercase tracking-widest font-semibold">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Security Trust Banner */}
        <div className="mt-20 p-6 rounded-2xl bg-surface-container flex flex-col sm:flex-row items-center justify-between gap-4 border border-outline-variant/40">
          <div className="flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-on-background">
                Bank-Grade 256-Bit SSL Encryption
              </h4>
              <p className="text-xs text-on-surface-variant">
                Your data is strictly encrypted at rest and in transit. Astera never sells user data.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-secondary bg-white px-4 py-2 rounded-full border border-outline-variant/40 shrink-0">
            SOC2 Certified
          </span>
        </div>
      </div>
    </section>
  );
};
