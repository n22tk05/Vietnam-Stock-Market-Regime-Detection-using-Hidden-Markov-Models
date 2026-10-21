import React from 'react';
import { Link } from 'react-router-dom';

interface FooterProps {
  onOpenAssessment?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAssessment }) => {
  return (
    <footer className="border-t border-slate-200 bg-white py-6">
      <div className="max-w-[1280px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div>
          <strong className="text-slate-800">AI QUANTUM Trading Intelligence</strong> • Nền tảng phân tích định lượng chứng khoán Việt Nam
        </div>
        <div className="flex items-center gap-3">
          {onOpenAssessment && (
            <button
              onClick={onOpenAssessment}
              className="px-4 py-2 rounded-full border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
            >
              Khảo Sát Rủi Ro
            </button>
          )}
          <Link
            to="/dashboard"
            className="px-5 py-2 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
          >
            Vào Dashboard
          </Link>
        </div>
      </div>
    </footer>
  );
};
