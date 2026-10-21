import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '@/services/auth-service';
import { ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';
import { PasswordInput } from '@/components/common/PasswordInput';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage('Mã xác thực không hợp lệ hoặc đã hết hạn.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setErrorMessage('Vui lòng nhập đầy đủ mật khẩu mới.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Mật khẩu tối thiểu 8 ký tự.');
      return;
    }

    if (!/\d/.test(newPassword) || !/[a-zA-Z]/.test(newPassword)) {
      setErrorMessage('Mật khẩu phải chứa ít nhất 1 chữ cái và 1 chữ số.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    try {
      setIsSubmitting(true);
      await authService.resetPassword({
        token,
        newPassword,
      });
      setIsSuccess(true);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'message' in err) {
        setErrorMessage((err as { message: string }).message);
      } else {
        setErrorMessage('Đặt lại mật khẩu thất bại. Liên kết có thể đã hết hạn.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-bright flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại trang Đăng nhập</span>
        </Link>

        <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Sparkles className="w-6 h-6 fill-white" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Đặt lại mật khẩu</h2>
            <p className="text-xs text-slate-500 font-medium">
              Thiết lập mật khẩu mới cho tài khoản của bạn
            </p>
          </div>

          {isSuccess ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3 animate-in zoom-in-95 duration-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="font-extrabold text-slate-900 text-sm">Đặt lại mật khẩu thành công!</h4>
              <p className="text-xs text-slate-600">
                Mật khẩu tài khoản của bạn đã được cập nhật thành công. Vui lòng đăng nhập bằng mật khẩu mới.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => navigate('/login')}
                  className="btn-primary text-white text-xs font-bold px-7 py-3 rounded-full shadow-md"
                >
                  Đăng nhập ngay
                </button>
              </div>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-2xl">
                  {errorMessage}
                </div>
              )}

              {!token && (
                <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium rounded-2xl">
                  Không tìm thấy mã xác thực token. Vui lòng kiểm tra lại liên kết trong email của bạn.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Mật khẩu mới</label>
                  <PasswordInput
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự"
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Xác nhận mật khẩu mới</label>
                  <PasswordInput
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !token}
                  className="w-full btn-primary text-white text-xs font-bold py-3.5 rounded-full flex items-center justify-center gap-2 shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Đang cập nhật...</span>
                  ) : (
                    <span>Cập nhật mật khẩu</span>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
