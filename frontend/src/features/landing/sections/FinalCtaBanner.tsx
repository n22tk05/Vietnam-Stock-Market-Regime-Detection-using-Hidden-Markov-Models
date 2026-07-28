import React from 'react';
import { ArrowRight } from 'lucide-react';

interface FinalCtaBannerProps {
  onOpenAssessment: () => void;
}

export const FinalCtaBanner: React.FC<FinalCtaBannerProps> = ({ onOpenAssessment }) => {
  return (
    <section className="py-12 bg-white">
      <div className="max-w-[1360px] mx-auto px-6 md:px-10">
        <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-8 sm:p-12 md:p-14 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          {/* Background Light Effects */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-xl text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              Sẵn sàng đầu tư thông minh cùng Astera?
            </h2>
            <p className="text-sm sm:text-base text-blue-100 font-normal">
              Bắt đầu hành trình đầu tư kỷ luật và bền vững ngay hôm nay.
            </p>
          </div>

          <div className="relative z-10 shrink-0">
            <button
              onClick={onOpenAssessment}
              className="bg-white hover:bg-slate-100 text-blue-700 font-extrabold text-base px-8 py-4 rounded-full flex items-center gap-3 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
            >
              <span>Bắt đầu miễn phí</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
