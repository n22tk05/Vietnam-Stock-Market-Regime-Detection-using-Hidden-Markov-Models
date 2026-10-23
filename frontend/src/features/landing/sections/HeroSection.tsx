import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, TrendingUp, BarChart3, Star } from 'lucide-react';

interface HeroSectionProps {
  onOpenAssessment: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenAssessment }) => {
  return (
    <section className="relative pt-20 pb-16 overflow-hidden bg-gradient-to-b from-blue-50/60 via-slate-50/30 to-white">
      {/* Ambient Gradient Glows */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-blue-500/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute top-[80px] left-[15%] w-[350px] h-[250px] bg-cyan-400/10 blur-[100px] pointer-events-none rounded-full" />

      <div className="max-w-[1280px] mx-auto px-6 text-center relative z-10">
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold uppercase tracking-wide mb-6 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          Hệ thống AI Cố Vấn Định Lượng Chứng Khoán Việt Nam
        </div>

        {/* Main Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15] max-w-4xl mx-auto mb-6">
          Đầu tư thông minh. Giữ vững{' '}
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 bg-clip-text text-transparent">
            kỷ luật cùng AI.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          Wealth4ward ứng dụng mô hình Markov Ẩn (HMM) và Học tăng cường (PPO) để nhận diện chu kỳ thị trường, dự báo biến động giá ngày mai và tính toán ngưỡng cắt lỗ an toàn theo thời gian thực.
        </p>

        {/* Streamlined Action CTAs: 2 Clear Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
          <Link
            to="/dashboard"
            className="w-full sm:w-auto px-8 py-3.5 rounded-full font-bold text-base bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <span>Vào Dashboard Miễn Phí</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={onOpenAssessment}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full font-bold text-base bg-white text-slate-800 border-2 border-slate-200 hover:border-blue-500 hover:text-blue-600 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs hover:shadow-md"
          >
            <span>Khảo Sát Khẩu Vị Rủi Ro (4 Bước)</span>
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-extrabold">Mới</span>
          </button>
        </div>

        {/* Secondary Navigation Hint */}
        <div className="mb-14">
          <a
            href="#forecast-demo"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <span>Khám phá mẫu dự báo định lượng phiên kế tiếp</span>
            <span>&darr;</span>
          </a>
        </div>

        {/* Fintech Quantitative Social Proof Badges */}
        <div className="inline-grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/90 backdrop-blur-sm border border-slate-200/90 p-4 sm:p-5 rounded-2xl shadow-sm text-left max-w-4xl mx-auto">
          <div className="flex items-center gap-3 pr-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 shrink-0">
              <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-900">4.9 / 5.0</div>
              <div className="text-[11px] text-slate-500 font-medium">10,000+ Nhà đầu tư tin cậy</div>
            </div>
          </div>

          <div className="flex items-center gap-3 pr-2 border-l border-slate-100 pl-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-900">92.4% Chuẩn xác</div>
              <div className="text-[11px] text-slate-500 font-medium">Nhận diện HMM Market Regime</div>
            </div>
          </div>

          <div className="flex items-center gap-3 pr-2 border-l border-slate-100 pl-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-900">397+ Cổ phiếu</div>
              <div className="text-[11px] text-slate-500 font-medium">Theo dõi dữ liệu HOSE & HNX</div>
            </div>
          </div>

          <div className="flex items-center gap-3 border-l border-slate-100 pl-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-900">Chuẩn Lô 100 VSD</div>
              <div className="text-[11px] text-slate-500 font-medium">Khớp lệnh kỷ luật, kiểm soát vốn</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
