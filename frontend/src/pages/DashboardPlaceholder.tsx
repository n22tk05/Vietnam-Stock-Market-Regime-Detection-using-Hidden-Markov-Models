import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';

export const DashboardPlaceholder: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6">
        <Construction className="w-8 h-8 animate-pulse" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-white mb-3">
        Bảng Điều Khiển Khuyến Nghị AI
      </h1>
      <p className="text-slate-400 max-w-md mb-8 text-sm leading-relaxed">
        Không gian điều hành khuyến nghị danh mục &amp; định giá phân bổ định lượng sẽ được chuyển đổi hoàn thiện trong Phase 2 theo kế hoạch kiến trúc.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700/80 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại Trang Chủ
      </Link>
    </div>
  );
};

export default DashboardPlaceholder;
