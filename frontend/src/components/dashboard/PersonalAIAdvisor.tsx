import React from 'react';
import {
  AlertTriangle,
  BrainCircuit,
  Clock,
  Unlock,
  ArrowUpRight,
  ShieldAlert,
  CheckCircle2,
  Eye,
  LineChart,
  Sparkles
} from 'lucide-react';
import { StockItem, USER_PORTFOLIO_STOCK_ITEMS, SimulatedUserPortfolio } from '@/types/dashboard';

interface PersonalAIAdvisorProps {
  portfolio: SimulatedUserPortfolio;
  onSelectStock: (stock: StockItem) => void;
}

export const PersonalAIAdvisor: React.FC<PersonalAIAdvisorProps> = ({
  portfolio,
  onSelectStock
}) => {
  const cashLeft = portfolio.cash_left;
  const cashRatio = (cashLeft / portfolio.current_nav) * 100;

  return (
    <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Cố Vấn Hành Động AI Cá Nhân Hóa (Personal AI Advisor)
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                HMM-PPO Engine
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Khuyến nghị hành động thời gian thực cho tài khoản <strong>#AQ-8899</strong> dựa trên 6 mã sở hữu & sức mua hiện tại.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Tự động cập nhật theo nhịp thị trường HOSE</span>
        </div>
      </div>

      {/* 1. Liquidity & Purchasing Power Alert */}
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-amber-950">
                CẢNH BÁO SỨC MUA: Tiền mặt chỉ còn {new Intl.NumberFormat('vi-VN').format(cashLeft)} đ ({cashRatio.toFixed(1)}% NAV)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-200 text-amber-900">
                Khuyến nghị: Phòng Thủ
              </span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Tài khoản đã phân bổ <strong>98.3% vốn vào cổ phiếu</strong>. AI khuyến nghị{' '}
              <strong className="underline">tạm dừng mở vị thế mua mới</strong>. Ưu tiên theo dõi sát 6 mã đang nắm giữ,
              chuẩn bị chốt lời từng phần khi đạt mục tiêu để tái tạo đệm tiền mặt an toàn (khuyến nghị tối thiểu 10% - 15% NAV).
            </p>
          </div>
        </div>

        <div className="shrink-0 flex md:flex-col items-center md:items-end justify-between gap-1 text-xs border-t md:border-t-0 border-amber-200 pt-2 md:pt-0">
          <span className="text-amber-700 font-medium">Tỷ lệ tiền mặt an toàn</span>
          <span className="font-mono font-black text-amber-950 text-base">
            {cashRatio.toFixed(1)}% / 15.0%
          </span>
        </div>
      </div>

      {/* 2. Holdings Actionable Directives */}
      <div className="space-y-4">
        {/* Group A: Unlocked T+0 Available Holdings */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Unlock className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 tracking-tight">
              Nhóm Cổ Phiếu Đã Khả Dụng (T+0 • Sẵn Sàng Giao Dịch Bán / Chốt Lời)
            </h4>
            <span className="text-xs text-slate-600">(3 mã • Khả dụng 300 CP)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* VSC Card */}
            <div className="p-4 rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50/50 to-white flex flex-col justify-between space-y-3 shadow-xs">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-base">VSC</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      100 CP Khả dụng
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-700">
                    +1.54% (+20.000 đ)
                  </span>
                </div>
                <div className="pt-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>HÀNH ĐỘNG: NẮM GIỮ / CANH CHỐT LỜI</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Dòng tiền vận tải biển ổn định. Đặt vùng chốt lời <strong>13.500 - 13.800 đ</strong> để thu hồi ~1.350.000 đ tiền mặt gia tăng sức mua tài khoản.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-600 font-mono">Chốt lời: 13.800 đ</span>
                <button
                  onClick={() => onSelectStock(USER_PORTFOLIO_STOCK_ITEMS.VSC)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 transition-colors shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Phân Tích</span>
                </button>
              </div>
            </div>

            {/* DIG Card */}
            <div className="p-4 rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/50 to-white flex flex-col justify-between space-y-3 shadow-xs">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-base">DIG</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      100 CP Khả dụng
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-700">
                    +1.62% (+15.000 đ)
                  </span>
                </div>
                <div className="pt-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>HÀNH ĐỘNG: TIẾP TỤC NẮM GIỮ</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Cầu đỡ kỹ thuật tốt quanh ngưỡng 9.200 đ. Kháng cự ngắn hạn tại <strong>9.800 đ</strong>. Giữ vị thế theo dõi phản ứng giá tại cản.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-600 font-mono">Kháng cự: 9.800 đ</span>
                <button
                  onClick={() => onSelectStock(USER_PORTFOLIO_STOCK_ITEMS.DIG)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-blue-300 text-blue-800 hover:bg-blue-50 transition-colors shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Phân Tích</span>
                </button>
              </div>
            </div>

            {/* VND Card */}
            <div className="p-4 rounded-2xl border border-rose-200 bg-gradient-to-b from-rose-50/50 to-white flex flex-col justify-between space-y-3 shadow-xs">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-rose-100">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-base">VND</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      100 CP Khả dụng
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-rose-700">
                    -5.04% (-70.000 đ)
                  </span>
                </div>
                <div className="pt-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                    <ShieldAlert className="w-4 h-4" />
                    <span>HÀNH ĐỘNG: QUAN SÁT CHẶT QUẢN TRỊ RỦI RO</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Hàng đã về khả dụng. Ngưỡng cắt lỗ bảo vệ tài khoản đặt tại <strong>12.800 đ</strong>. Nếu thủng mốc này, kích hoạt bán cắt lỗ ngay để bảo toàn vốn.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-rose-600 font-mono">Chặn lỗ: 12.800 đ</span>
                <button
                  onClick={() => onSelectStock(USER_PORTFOLIO_STOCK_ITEMS.VND)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-rose-300 text-rose-800 hover:bg-rose-50 transition-colors shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Phân Tích</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Group B: Locked T+1 Pending Holdings */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 tracking-tight">
              Nhóm Cổ Phiếu Đang Chờ Về T+1 (Dự kiến mở khóa 11:30 Ngày mai)
            </h4>
            <span className="text-xs text-slate-600">(3 mã • Chờ về 300 CP)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* GEX Card */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between space-y-3 shadow-xs">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-base">GEX</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> T+1
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-700">
                    +2.06% (+45.000 đ)
                  </span>
                </div>
                <div className="pt-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>ĐÁNH GIÁ: TÍCH CỰC (ĐỢI KHỚP T+1)</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Mã tăng tốt nhất danh mục. Lực mua chủ động tiếp tục duy trì. Tiếp tục kiên nhẫn đợi hàng về tài khoản phiên mai để tối ưu điểm bán.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-600 font-mono">Dự kiến về: 11:30</span>
                <button
                  onClick={() => onSelectStock(USER_PORTFOLIO_STOCK_ITEMS.GEX)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Phân Tích</span>
                </button>
              </div>
            </div>

            {/* DPM Card */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between space-y-3 shadow-xs">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-base">DPM</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> T+1
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-rose-700">
                    -1.13% (-25.000 đ)
                  </span>
                </div>
                <div className="pt-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>ĐÁNH GIÁ: CHỜ HÀNG VỀ T+1</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Lỗ nhẹ không đáng ngại. Vùng giá 21.500 đ đang giữ nhịp cân bằng. Không hành động vội, chờ khớp T+1 để đánh giá cung cầu.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-600 font-mono">Hỗ trợ: 21.500 đ</span>
                <button
                  onClick={() => onSelectStock(USER_PORTFOLIO_STOCK_ITEMS.DPM)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Phân Tích</span>
                </button>
              </div>
            </div>

            {/* HT1 Card */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between space-y-3 shadow-xs">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-base">HT1</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> T+1
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-700">
                    -0.41% (-5.000 đ)
                  </span>
                </div>
                <div className="pt-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <LineChart className="w-4 h-4 text-blue-600" />
                    <span>ĐÁNH GIÁ: ỔN ĐỊNH / CHỜ T+1</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Biên độ tích lũy chặt quanh 12.200 - 12.300 đ. Tỷ trọng 13.1% NAV ở mức cân bằng, chờ hàng về an toàn phiên mai.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-600 font-mono">Mục tiêu: 13.200 đ</span>
                <button
                  onClick={() => onSelectStock(USER_PORTFOLIO_STOCK_ITEMS.HT1)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Phân Tích</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalAIAdvisor;
