import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/auth-service';
import { 
  ArrowLeft, 
  ArrowRight, 
  Mail, 
  Cpu, 
  TrendingUp, 
  Sparkles, 
  CheckCircle2 
} from 'lucide-react';
import { PasswordInput } from '@/components/common/PasswordInput';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('user100m@aiquantum.vn');
  const [password, setPassword] = useState('123456');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ địa chỉ email và mật khẩu.');
      return;
    }

    try {
      setIsSubmitting(true);
      const session = await authService.login({ email, password }, rememberMe);
      await login({ user: session.user });
      navigate('/dashboard');
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'message' in err) {
        setErrorMessage((err as { message: string }).message);
      } else {
        setErrorMessage('Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin tài khoản.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1-Click Fast Demo Experience
  const handleQuickDemo = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between font-sans selection:bg-blue-600/10 selection:text-blue-700">
      {/* Top Simple Navigation */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <Link to="/" className="inline-flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Cpu className="w-4 h-4" />
          </div>
          <span className="font-black text-slate-900 tracking-tight text-base">Wealth4ward</span>
          <span className="text-[10px] font-mono font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
            Terminal v7.0
          </span>
        </Link>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về Trang Chủ</span>
        </Link>
      </header>

      {/* Main Container - Split Screen 2 Columns */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Brand & Technology Showcase */}
          <div className="lg:col-span-6 space-y-6 hidden lg:block">
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              Mô hình Markov (HMM) &amp; PPO Active
            </div>

            {/* Title & Value Proposition */}
            <div className="space-y-3">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-[1.2]">
                Đầu tư kỷ luật. <br />
                Định vị tương lai cùng{' '}
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Wealth4ward.
                </span>
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed max-w-lg">
                Hệ thống cố vấn định lượng chuyên sâu cho thị trường chứng khoán Việt Nam. Nhận diện trạng thái thị trường và phân bổ vốn tự động theo thuật toán toán học.
              </p>
            </div>

            {/* Performance Metric Showcase Card */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Hiệu Suất Backtest 10 Tháng (VN30)
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Vượt VN-Index +38.22%
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[11px] text-slate-600 mb-0.5">Lợi nhuận YTD</div>
                  <div className="text-xl font-black text-emerald-600 font-mono">+58.06%</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[11px] text-slate-600 mb-0.5">Tỷ lệ Sharpe</div>
                  <div className="text-xl font-black text-slate-900 font-mono">2.18</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[11px] text-slate-600 mb-0.5">Tỷ lệ Thắng</div>
                  <div className="text-xl font-black text-blue-600 font-mono">74.2%</div>
                </div>
              </div>

              {/* Three Safety Badges */}
              <div className="pt-2 border-t border-slate-100 space-y-2 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Mô hình khuyến nghị độc lập — không nhận ủy thác, không đặt lệnh.</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Luôn giữ tỷ trọng tiền mặt dự phòng an toàn theo trạng thái Markov.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Clean Login Interface Card */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6">
              {/* Card Header */}
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Cpu className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Đăng Nhập Hệ Thống
                </h2>
                <p className="text-xs text-slate-600 font-medium">
                  Truy cập không gian điều hành khuyến nghị Wealth4ward
                </p>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl animate-in fade-in duration-150">
                  {errorMessage}
                </div>
              )}

              {/* Form Controls */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Địa chỉ Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nha-dau-tu@aiquantum.vn"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900"
                    />
                  </div>
                </div>

                {/* Password Field with Toggle */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">Mật khẩu</label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Quên mật khẩu?
                    </Link>
                  </div>
                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu an toàn..."
                    required
                  />
                </div>

                {/* Remember Me Option */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label
                    htmlFor="rememberMe"
                    className="text-xs font-semibold text-slate-600 cursor-pointer select-none"
                  >
                    Ghi nhớ đăng nhập trên thiết bị này
                  </label>
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Đăng Nhập Ngay</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Register Link Footer */}
              <p className="text-center text-xs text-slate-600 font-medium pt-2">
                Chưa có tài khoản?{' '}
                <Link
                  to="/register"
                  className="font-bold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-0.5"
                >
                  Đăng ký miễn phí
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="px-6 py-4 border-t border-slate-200/80 bg-white/60 text-center text-xs text-slate-600">
        Bản quyền &copy; 2026 Wealth4ward. Nền tảng nghiên cứu &amp; khuyến nghị định lượng chứng khoán Việt Nam.
      </footer>
    </div>
  );
};

export default LoginPage;
