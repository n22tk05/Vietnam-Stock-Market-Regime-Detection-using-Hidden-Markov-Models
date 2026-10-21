import React from 'react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onOpenAssessment?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAssessment }) => {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-[1280px] mx-auto px-6 h-[72px] flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 text-decoration-none">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
            AQ
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-slate-900">AI QUANTUM</span>
              <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
                Advisory Platform
              </span>
            </div>
          </div>
        </Link>

        {/* Nav Links */}
        <nav className="hidden lg:flex items-center gap-8">
          <a href="#problems" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">
            Vấn đề nhà đầu tư
          </a>
          <a href="#how-it-works" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">
            Cơ chế AI
          </a>
          <a href="#forecast-demo" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">
            Bảng dự báo mẫu
          </a>
          <a href="#guarantee" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">
            Nguyên tắc cố vấn
          </a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {onOpenAssessment && (
            <button
              onClick={onOpenAssessment}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
            >
              <span>Khảo sát rủi ro</span>
              <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">4 bước</span>
            </button>
          )}
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02]"
          >
            Vào Dashboard
          </Link>
        </div>
      </div>
    </header>
  );
};
