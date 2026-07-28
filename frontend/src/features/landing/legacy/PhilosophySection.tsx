import React from 'react';
import { Quote } from 'lucide-react';

export const PhilosophySection: React.FC = () => {
  return (
    <section
      id="philosophy"
      className="py-32 md:py-[160px] px-6 md:px-container-padding bg-primary text-white relative overflow-hidden"
    >
      {/* Background Radial Glow */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary-container rounded-full blur-[140px]" />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="w-16 h-16 mx-auto mb-8 rounded-full bg-white/10 flex items-center justify-center text-secondary border border-white/20">
          <Quote className="w-8 h-8" />
        </div>

        <h2 className="font-display-md text-2xl sm:text-4xl md:text-display-md leading-relaxed md:leading-snug mb-10 font-extrabold tracking-tight">
          "Investing isn't about predicting tomorrow. It's about staying disciplined for the next ten years."
        </h2>

        <div className="h-1 w-20 bg-secondary mx-auto mb-8 rounded-full" />
        <p className="font-label-md text-xs md:text-label-md tracking-[0.25em] text-outline-variant font-bold uppercase">
          THE ASTERA PHILOSOPHY
        </p>
      </div>
    </section>
  );
};
