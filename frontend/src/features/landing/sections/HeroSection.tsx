import React from 'react';
import { ArrowRight, Star } from 'lucide-react';
import { HeroGlobeWidget } from '@/features/landing/widgets';

interface HeroSectionProps {
  onOpenAssessment: () => void;
  onOpenLiveDemo?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenAssessment,
  onOpenLiveDemo,
}) => {
  const avatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
  ];

  return (
    <section className="relative pt-32 pb-16 md:py-24 bg-gradient-to-b from-slate-50/80 via-blue-50/30 to-white overflow-hidden">
      {/* Bokeh/Particle Light Effects (background decoration) */}
      <div className="absolute top-0 right-0 w-[600px] h-[500px] bg-gradient-to-bl from-indigo-400/15 via-blue-300/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-20 right-40 w-[300px] h-[300px] bg-purple-400/12 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute top-40 right-10 w-[200px] h-[200px] bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute top-10 right-60 w-3 h-3 bg-blue-400/40 rounded-full blur-sm pointer-events-none" />
      <div className="absolute top-32 right-20 w-2 h-2 bg-purple-400/50 rounded-full blur-sm pointer-events-none" />
      <div className="absolute top-60 right-80 w-2 h-2 bg-indigo-300/40 rounded-full blur-sm pointer-events-none" />

      <div className="max-w-[1360px] mx-auto px-6 md:px-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Copy & CTAs (7 Cols) */}
        <div className="lg:col-span-7 z-10">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50/80 border border-blue-200/60 text-blue-700 text-xs font-bold mb-8 shadow-sm">
            <span>✦ AI ĐỒNG HÀNH</span>
            <span className="text-blue-300">•</span>
            <span>✦ ĐẦU TƯ THÔNG MINH</span>
            <span className="text-blue-300">•</span>
            <span>✦ TÀI SẢN BỀN VỮNG</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-[62px] font-extrabold text-slate-900 leading-[1.15] tracking-tight mb-6">
            Đầu tư thông minh.
            <br />
            Giữ vững <span className="text-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">kỷ luật.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-600 mb-10 max-w-xl leading-relaxed font-normal">
            Astera là trợ lý đầu tư AI giúp bạn xây dựng danh mục đầu tư phù hợp, quản trị rủi ro và đạt mục tiêu tài chính dài hạn.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center gap-4 mb-10">
            {onOpenLiveDemo && (
              <button
                onClick={onOpenLiveDemo}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base px-8 py-4 rounded-2xl flex items-center gap-3 transition-all shadow-xl shadow-emerald-600/25 hover:shadow-2xl hover:shadow-emerald-600/35 hover:-translate-y-0.5 active:translate-y-0"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping" />
                <span> Demo AI Live Core</span>
              </button>
            )}

            <button
              onClick={onOpenAssessment}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-base px-8 py-4 rounded-2xl flex items-center gap-3 transition-all shadow-xl shadow-blue-600/25 hover:shadow-2xl hover:shadow-blue-600/35 hover:-translate-y-0.5"
            >
              <span>Bắt đầu đánh giá với AI</span>
              <ArrowRight className="w-5 h-5" />
            </button>

          
          </div>

          {/* User Ratings & Social Proof */}
          <div className="flex items-center gap-4 pt-2">
            <div className="flex -space-x-2.5 overflow-hidden">
              {avatars.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt="User"
                  className="inline-block h-10 w-10 rounded-full ring-2 ring-white object-cover shadow-sm"
                />
              ))}
            </div>

            <div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
                <span className="text-sm font-extrabold text-slate-900 ml-1">4.9/5</span>
              </div>
              <p className="text-xs font-medium text-slate-500">
                Hơn 10.000+ nhà đầu tư F0 tin dùng
              </p>
            </div>
          </div>
        </div>

        {/* Right Globe & AI Widget Graphics (5 Cols) */}
        <div className="lg:col-span-5 relative">
          <HeroGlobeWidget />
        </div>
      </div>
    </section>
  );
};
