import React from 'react';
import { Link } from 'react-router-dom';

interface HeroSectionProps {
  onOpenAssessment: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenAssessment }) => {
  return (
    <section className="relative pt-20 pb-16 overflow-hidden bg-gradient-to-b from-blue-50/50 via-white to-white">
      {/* Ambient Orbs */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-400/15 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute top-[100px] left-[10%] w-[350px] h-[250px] bg-emerald-400/10 blur-[100px] pointer-events-none rounded-full" />

      <div className="max-w-[1280px] mx-auto px-6 text-center relative z-10">
        {/* Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wide mb-6">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          Mô hình Trí Tuệ Nhân Tạo Dự Báo Chứng Khoán Việt Nam
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15] max-w-4xl mx-auto mb-6">
          Đầu tư thông minh. Giữ vững{' '}
          <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 bg-clip-text text-transparent">
            kỷ luật cùng AI.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          AI QUANTUM là hệ thống cố vấn định lượng giúp bạn dự báo biến động giá ngày mai, tính toán vùng cắt lỗ an toàn và theo dõi tăng trưởng tài sản thực tế theo thời gian thực.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Link
            to="/dashboard"
            className="w-full sm:w-auto px-8 py-3.5 rounded-full font-bold text-base bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02]"
          >
            Bắt đầu với AI Dashboard
          </Link>
          <button
            onClick={onOpenAssessment}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full font-bold text-base bg-white text-slate-800 border-2 border-slate-200 hover:border-blue-500 hover:text-blue-600 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Khảo Sát Khẩu Vị Rủi Ro (4 Bước)</span>
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-extrabold">Mới</span>
          </button>
          <a
            href="#forecast-demo"
            className="w-full sm:w-auto px-7 py-3.5 rounded-full font-semibold text-base text-slate-600 hover:text-slate-900 transition-colors"
          >
            Xem Mẫu Dự Báo Ngày Mai &darr;
          </a>
        </div>

        {/* Social Proof Strip from 4WARD */}
        <div className="inline-flex items-center gap-4 bg-white/80 backdrop-blur-sm border border-slate-200 px-5 py-3 rounded-2xl shadow-sm">
          <div className="flex -space-x-2">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" alt="User" className="w-8 h-8 rounded-full border-2 border-white object-cover" />
            <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80" alt="User" className="w-8 h-8 rounded-full border-2 border-white object-cover" />
            <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80" alt="User" className="w-8 h-8 rounded-full border-2 border-white object-cover" />
            <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80" alt="User" className="w-8 h-8 rounded-full border-2 border-white object-cover" />
          </div>
          <div className="text-left text-xs">
            <div className="flex items-center gap-1 text-amber-500 font-bold">
              <span>★★★★★</span>
              <span className="text-slate-900 ml-1 font-extrabold">4.9 / 5</span>
            </div>
            <div className="text-slate-500 font-medium">Được tin dùng bởi hơn 10,000+ nhà đầu tư Việt Nam</div>
          </div>
        </div>
      </div>
    </section>
  );
};
