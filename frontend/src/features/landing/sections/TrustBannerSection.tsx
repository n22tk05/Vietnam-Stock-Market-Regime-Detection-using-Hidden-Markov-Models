import React from 'react';

export const TrustBannerSection: React.FC = () => {
  return (
    <section id="why-astera" className="py-12 bg-white">
      <div className="max-w-[1360px] mx-auto px-6 md:px-10">
        <div className="relative rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 p-8 md:p-14 text-white overflow-hidden shadow-2xl border border-slate-800">
          {/* Background Ambient Glows */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

          {/* Large Decorative Vietnam Flag */}
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-32 h-24 sm:w-40 sm:h-28 bg-red-600 rounded-xl rotate-[-8deg] shadow-2xl overflow-hidden flex items-center justify-center opacity-90 z-0">
            <svg className="w-16 h-16 fill-yellow-300" viewBox="0 0 24 24">
              <polygon points="12,2 15,9 22,9 16,14 18,21 12,17 6,21 8,14 2,9 9,9" />
            </svg>
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Title & Vietnam Flag (4 Cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-3">
                {/* Vietnamese Flag Badge SVG */}
                <div className="w-10 h-7 rounded bg-red-600 flex items-center justify-center shadow-md overflow-hidden shrink-0 border border-yellow-500/40">
                  <svg className="w-5 h-5 fill-yellow-300" viewBox="0 0 24 24">
                    <polygon points="12,2 15,9 22,9 16,14 18,21 12,17 6,21 8,14 2,9 9,9" />
                  </svg>
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-blue-300">
                  VIETNAM COMMUNITY TRUSTED
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                Được tin tưởng bởi cộng đồng nhà đầu tư Việt Nam
              </h3>
            </div>

            {/* Right 4 Stat Numbers (8 Cols) */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-1">
                  10K+
                </div>
                <div className="text-xs font-semibold text-slate-300">Người dùng</div>
              </div>

              <div>
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-1">
                  50M+
                </div>
                <div className="text-xs font-semibold text-slate-300">Dữ liệu đã xử lý</div>
              </div>

              <div>
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-1">
                  92%
                </div>
                <div className="text-xs font-semibold text-slate-300">Độ chính xác AI</div>
              </div>

              <div>
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-1">
                  25%
                </div>
                <div className="text-xs font-semibold text-slate-300">Tăng trưởng trung bình*</div>
                <div className="text-[9px] text-slate-400 mt-1">*Dựa trên dữ liệu mô phỏng và backtest</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
