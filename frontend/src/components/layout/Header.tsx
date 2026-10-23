import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { User, LogOut, Menu, X } from 'lucide-react';

interface HeaderProps {
  onOpenAssessment?: () => void;
}

export const Header: React.FC<HeaderProps> = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-[1280px] mx-auto px-6 h-[72px] flex items-center justify-between">
        {/* Brand Logo & Name */}
        <Link to="/" className="flex items-center gap-3 text-decoration-none group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
            W4
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
              Wealth4ward
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-8">
          <a
            href="#how-it-works"
            className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors"
          >
            Cơ chế AI
          </a>
          <a
            href="#forecast-demo"
            className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors"
          >
            Dự báo mẫu
          </a>
          <a
            href="#guarantee"
            className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors"
          >
            Minh bạch
          </a>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden sm:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>{user?.fullName || user?.email?.split('@')[0] || 'Nhà đầu tư'}</span>
              </div>
              <button
                onClick={logout}
                title="Đăng xuất"
                className="p-2 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="text-xs font-bold text-slate-600 hover:text-blue-600 px-3.5 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Đăng Nhập
            </Link>
          )}

          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02]"
          >
            Vào Dashboard
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex sm:hidden items-center gap-2">
          <Link
            to="/dashboard"
            className="px-3.5 py-1.5 rounded-full font-bold text-xs bg-blue-600 text-white hover:bg-blue-700"
          >
            Dashboard
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md px-6 py-4 space-y-3">
          <div className="flex flex-col space-y-2">
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold text-slate-700 hover:text-blue-600 py-1.5"
            >
              Cơ chế AI
            </a>
            <a
              href="#forecast-demo"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold text-slate-700 hover:text-blue-600 py-1.5"
            >
              Dự báo mẫu
            </a>
            <a
              href="#guarantee"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold text-slate-700 hover:text-blue-600 py-1.5"
            >
              Minh bạch
            </a>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">
                  {user?.fullName || user?.email?.split('@')[0]}
                </span>
                <button
                  onClick={logout}
                  className="text-xs text-rose-600 font-bold hover:underline"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Đăng Nhập Tài Khoản &rarr;
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
