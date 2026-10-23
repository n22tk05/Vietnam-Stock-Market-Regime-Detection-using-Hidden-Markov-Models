import React from 'react';
import { X, ShieldAlert, BookOpen, AlertTriangle } from 'lucide-react';

interface DisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Tuyên Bố Miễn Trừ Trách Nhiệm Pháp Lý
              </h3>
              <p className="text-xs text-slate-600">Pure Recommendation & Algorithmic Disclosure</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng cửa sổ miễn trừ trách nhiệm"
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs text-slate-600 leading-relaxed max-h-[70vh] overflow-y-auto">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Wealth4ward là hệ thống công nghệ thông tin nghiên cứu định lượng độc lập, không phải công ty chứng khoán, không quản lý quỹ ủy thác và không cung cấp dịch vụ đặt lệnh môi giới.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" /> Bản chất khuyến nghị
            </h4>
            <p>
              Mọi dữ liệu dự báo biến động giá, tỷ trọng giải ngân, điểm cắt lỗ và nhận diện xu hướng thị trường đều được sinh ra tự động bởi các thuật toán Học Tăng Cường (PPO) kết hợp Chuỗi Markov Ẩn (HMM) dựa trên lịch sử giao dịch niêm yết tại Sở Giao Dịch Chứng Khoán TP.HCM (HOSE) và Sở Giao Dịch Chứng Khoán Hà Nội (HNX).
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" /> Rủi ro thị trường
            </h4>
            <p>
              Hiệu suất mô phỏng trong quá khứ không phải là cam kết chắc chắn cho lợi nhuận tương lai. Thị trường chứng khoán luôn tiềm ẩn rủi ro thanh khoản, biến động vĩ mô và sự kiện bất khả kháng. Nhà đầu tư tự chịu hoàn toàn trách nhiệm đối với quyết định giao dịch của chính mình.
            </p>
          </div>
        </div>

        <div className="p-4 px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors"
          >
            Tôi Đã Hiểu &amp; Đồng Ý
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisclaimerModal;
