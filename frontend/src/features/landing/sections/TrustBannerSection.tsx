import React from 'react';

export const TrustBannerSection: React.FC = () => {
  const stats = [
    { num: '10,000+', label: 'Nhà đầu tư cá nhân' },
    { num: '50M+', label: 'Mẫu dữ liệu đã xử lý' },
    { num: '78.2%', label: 'Độ tín nhiệm AI (Win Rate)' },
    { num: '+58.1%', label: 'Tăng trưởng tài sản kiểm chứng' },
  ];

  return (
    <section className="py-16 bg-slate-50 border-b border-slate-200">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5">
              <span className="text-xs font-bold text-blue-300 uppercase tracking-widest block mb-2">
                CỘNG ĐỒNG NHÀ ĐẦU TƯ VIỆT NAM
              </span>
              <h3 className="text-2xl sm:text-3xl font-black leading-tight">
                Được tin tưởng và đồng hành cùng nhà đầu tư
              </h3>
            </div>

            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
              {stats.map((s, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="mono-num text-2xl sm:text-3xl font-black text-blue-400 mb-1">{s.num}</div>
                  <div className="text-xs text-slate-300 font-medium">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
