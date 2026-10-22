import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/auth-service';
import { ArrowLeft, ArrowRight, Mail, Sparkles, User } from 'lucide-react';
import { PasswordInput } from '@/components/common/PasswordInput';

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName || !email || !password || !confirmPassword) {
      setErrorMessage('Vui lòng nhập đầy đủ tất cả các trường.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Mật khẩu tối thiểu 8 ký tự.');
      return;
    }

    if (!/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
      setErrorMessage('Mật khẩu phải chứa ít nhất 1 chữ cái và 1 chữ số.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    if (!acceptedTerms) {
      setErrorMessage('Vui lòng đồng ý với điều khoản dịch vụ Wealth4ward.');
      return;
    }

    try {
      setIsSubmitting(true);
      const session = await authService.register({
        email,
        password,
        fullName,
      });
      await login({ user: session.user });
      navigate('/onboarding/profile');
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'message' in err) {
        setErrorMessage((err as { message: string }).message);
      } else {
        setErrorMessage('Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-bright flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Trang chủ Wealth4ward</span>
        </Link>

        {/* Register Card */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Sparkles className="w-6 h-6 fill-white" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Đăng ký tài khoản</h2>
            <p className="text-xs text-slate-500 font-medium">
              Bắt đầu lập danh mục đầu tư mô phỏng theo chế độ thị trường AI
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-2xl animate-in fade-in duration-150">
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Họ và tên</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Địa chỉ Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nguyenvana@gmail.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Mật khẩu</label>
              <PasswordInput
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 8 ký tự (chữ & số)"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Xác nhận mật khẩu</label>
              <PasswordInput
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                autoComplete="new-password"
              />
            </div>

            {/* Checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-600">
                Tôi đồng ý với{' '}
                <a href="#terms" className="font-bold text-blue-600 underline">
                  Điều khoản sử dụng
                </a>{' '}
                và hiểu rằng Wealth4ward cung cấp hỗ trợ mô phỏng đầu tư.
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary text-white text-xs font-bold py-3.5 rounded-full flex items-center justify-center gap-2 shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Đang tạo tài khoản...</span>
              ) : (
                <>
                  <span>Tạo tài khoản ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500 font-medium">
            Đã có tài khoản Wealth4ward?{' '}
            <Link to="/login" className="font-bold text-blue-600 hover:underline">
              Đăng nhập tại đây
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
