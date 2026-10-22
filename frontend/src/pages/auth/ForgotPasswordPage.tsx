import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '@/services/auth-service';
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, Sparkles } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email) {
      setErrorMessage('Vui lòng nhập địa chỉ email.');
      return;
    }

    try {
      setIsSubmitting(true);
      await authService.forgotPassword(email);
      setIsSubmitted(true);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'message' in err) {
        setErrorMessage((err as { message: string }).message);
      } else {
        setErrorMessage('Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau.');
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
            <h2 className="text-2xl font-black text-slate-900">Quên mật khẩu?</h2>
            <p className="text-xs text-slate-500 font-medium">
              Nhập email đăng ký của bạn để nhận liên kết khôi phục mật khẩu.
            </p>
          </div>

          {isSubmitted ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3 animate-in zoom-in-95 duration-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="font-extrabold text-slate-900 text-sm">Yêu cầu đã được gửi!</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Nếu tài khoản với email <strong>{email}</strong> tồn tại trong hệ thống, bạn sẽ nhận được một thư hướng dẫn đặt lại mật khẩu.
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="btn-primary text-white text-xs font-bold px-6 py-2.5 rounded-full inline-block shadow-md"
                >
                  Trở về Đăng nhập
                </Link>
              </div>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-2xl">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
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

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full btn-primary text-white text-xs font-bold py-3.5 rounded-full flex items-center justify-center gap-2 shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Đang gửi liên kết...</span>
                  ) : (
                    <>
                      <span>Gửi liên kết khôi phục</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
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
