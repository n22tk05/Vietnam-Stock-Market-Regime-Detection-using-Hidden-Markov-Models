import React from 'react';
import { LayoutDashboard, Wallet, TrendingUp, Sparkles, Smile } from 'lucide-react';

export const DashboardPreviewSection: React.FC = () => {
  const avatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
  ];

  return (
    <section id="dashboard" className="py-24 bg-white overflow-hidden">
      <div className="max-w-[1360px] mx-auto px-6 md:px-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Side Copy (4 Cols) */}
        <div className="lg:col-span-4">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
            Xem trước trải nghiệm<br />Astera Dashboard
          </h2>
          <p className="text-base text-slate-600 font-normal leading-relaxed mb-8">
            Mọi thông tin quan trọng được trình bày rõ ràng, trực quan và dễ hiểu.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <div className="flex -space-x-2.5 overflow-hidden">
              {avatars.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt="User"
                  className="inline-block h-9 w-9 rounded-full ring-2 ring-white object-cover shadow-sm"
                />
              ))}
            </div>
            <span className="text-xs font-bold text-slate-700">
              10K+ người dùng đang trải nghiệm
            </span>
          </div>
        </div>

        {/* Right Side High-Fidelity Dashboard Mockup (8 Cols) */}
        <div className="lg:col-span-8">
          <div className="rounded-3xl bg-white border-4 border-slate-200/80 shadow-2xl overflow-hidden flex flex-col md:flex-row">
            {/* Sidebar Navigation */}
            <div className="w-full md:w-16 bg-slate-100 p-4 flex md:flex-col items-center justify-between md:justify-start gap-6 border-b md:border-b-0 md:border-r border-slate-200 text-slate-500">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex md:flex-col gap-5 text-slate-500">
                <LayoutDashboard className="w-5 h-5 text-blue-500 cursor-pointer" />
                <Wallet className="w-5 h-5 hover:text-slate-900 cursor-pointer transition-colors" />
                <TrendingUp className="w-5 h-5 hover:text-slate-900 cursor-pointer transition-colors" />
              </div>
            </div>

            {/* Main Dashboard Canvas Area */}
            <div className="grow bg-slate-50 p-6 md:p-8 space-y-6 text-slate-900">
              {/* Header Greeting */}
              <div>
                <h3 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
                  <span>Xin chào, <span className="text-blue-600">Minh Anh</span> 👋</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Danh mục của bạn hôm nay ổn định và tăng trưởng tốt.
                </p>
              </div>

              {/* 4 Stat Cards Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Stat 1: Tổng tài sản */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500 mb-1">Tổng tài sản</div>
                  <div className="text-lg md:text-xl font-black text-slate-900">245.6M</div>
                  <div className="text-[10px] font-bold text-emerald-600 mt-1 flex items-center gap-0.5">
                    <span>+4.28%</span>
                    <span className="text-slate-400 font-normal">(Hôm nay)</span>
                  </div>
                </div>

                {/* Stat 2: Lợi nhuận */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500 mb-1">Lợi nhuận</div>
                  <div className="text-lg md:text-xl font-black text-emerald-600">+12.4M</div>
                  <div className="text-[10px] font-bold text-emerald-600 mt-1 flex items-center gap-0.5">
                    <span>+5.32%</span>
                    <span className="text-slate-400 font-normal">(7 ngày)</span>
                  </div>
                </div>

                {/* Stat 3: Điểm sức khỏe */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500 mb-1">Điểm sức khỏe</div>
                  <div className="text-lg md:text-xl font-black text-blue-600">
                    92<span className="text-xs font-normal text-slate-400">/100</span>
                  </div>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                    Tuyệt vời
                  </span>
                </div>

                {/* Stat 4: Chế độ thị trường */}
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-100 shadow-2xs relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-600 mb-0.5">Chế độ thị trường</div>
                    <div className="text-base md:text-lg font-black text-emerald-700">Bullish</div>
                    <div className="text-[10px] text-emerald-600 font-medium">(Đang tích cực)</div>
                  </div>
                  <div className="absolute top-3 right-3 text-emerald-600 opacity-60">
                    <Smile className="w-8 h-8" />
                  </div>
                </div>
              </div>

              {/* Bottom Split: Line Chart & Donut Split */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* Left Line Chart: Hiệu suất danh mục (7 Cols) */}
                <div className="lg:col-span-7 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs font-bold text-slate-900">Hiệu suất danh mục</div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200/60">
                      +18.6%
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-[10px] font-semibold text-slate-500 mb-3">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-blue-600 rounded-full" />Danh mục của bạn</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-slate-300 rounded-full" />VN-Index</span>
                  </div>

                  {/* SVG Chart Graphic */}
                  <div className="h-32 w-full pt-2">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                      {/* Grid Lines */}
                      <line x1="0" y1="20" x2="300" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="0" y1="50" x2="300" y2="50" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="0" y1="80" x2="300" y2="80" stroke="#f1f5f9" strokeWidth="1" />

                      {/* Benchmark Line (VN-Index) */}
                      <path
                        d="M 0 75 Q 50 65, 100 70 T 200 60 T 300 55"
                        fill="none"
                        stroke="#cbd5e1"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />

                      {/* Main Portfolio Line (Astera Portfolio) */}
                      <path
                        d="M 0 85 Q 40 70, 80 50 T 160 45 T 240 25 T 300 15"
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="3"
                      />
                    </svg>
                  </div>
                </div>

                {/* Right Donut Chart: Phân bổ danh mục (5 Cols) */}
                <div className="lg:col-span-5 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                  <div className="text-xs font-bold text-slate-900 mb-3">Phân bổ danh mục</div>
                  
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-20 h-20 rounded-full border-8 border-blue-600 border-t-emerald-500 border-r-amber-400 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-slate-600">100%</span>
                    </div>

                    <div className="text-[10px] space-y-1.5 font-medium text-slate-600 grow pl-2">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-600"/>Ngân hàng</span>
                        <span className="font-extrabold text-slate-900">28%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"/>Công nghệ</span>
                        <span className="font-extrabold text-slate-900">22%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400"/>Tiêu dùng</span>
                        <span className="font-extrabold text-slate-900">18%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400"/>Khác</span>
                        <span className="font-extrabold text-slate-900">32%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
