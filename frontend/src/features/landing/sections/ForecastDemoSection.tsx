import React from 'react';
import { Link } from 'react-router-dom';

export const ForecastDemoSection: React.FC = () => {
  const demoStocks = [
    {
      ticker: 'FPT',
      name: 'Công ty Cổ phần FPT',
      price: '135,200 đ',
      target: '142,000 đ',
      pct: '+5.0%',
      stopLoss: '131,000 đ',
      action: 'MUA MỚI / GIA TĂNG',
      actionClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      reason: 'Mô hình HMM xác nhận sóng tăng công nghệ; Dòng tiền tổ chức gom ròng 4 phiên liên tiếp',
    },
    {
      ticker: 'MWG',
      name: 'Thế Giới Di Động',
      price: '64,200 đ',
      target: '67,500 đ',
      pct: '+5.1%',
      stopLoss: '62,000 đ',
      action: 'MUA MỚI / GIA TĂNG',
      actionClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      reason: 'Dòng tiền tiêu dùng bán lẻ phục hồi mạnh; Tỷ lệ PPO tối ưu hóa lợi nhuận',
    },
    {
      ticker: 'MBB',
      name: 'Ngân hàng Quân Đội',
      price: '24,500 đ',
      target: '25,600 đ',
      pct: '+4.5%',
      stopLoss: '23,800 đ',
      action: 'MUA MỚI / GIA TĂNG',
      actionClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      reason: 'Định giá hấp dẫn; Tăng trưởng tín dụng cao; Điểm Attention bứt phá',
    },
    {
      ticker: 'SSI',
      name: 'Chứng khoán SSI',
      price: '32,500 đ',
      target: '34,000 đ',
      pct: '+4.6%',
      stopLoss: '31,200 đ',
      action: 'TIẾP TỤC NẮM GIỮ',
      actionClass: 'bg-blue-50 text-blue-700 border-blue-200',
      reason: 'Thanh khoản thị trường duy trì ổn định; Hưởng lợi hệ thống KRX vận hành',
    },
    {
      ticker: 'HPG',
      name: 'Tập đoàn Hòa Phát',
      price: '26,400 đ',
      target: '24,800 đ',
      pct: '-6.1%',
      stopLoss: '25,500 đ',
      action: 'BÁN BỚT / HẠ TỶ TRỌNG',
      actionClass: 'bg-rose-50 text-rose-700 border-rose-200',
      reason: 'Cảnh báo áp lực xả hàng ngành Thép; Giá nguyên liệu đầu vào tăng cao',
    },
  ];

  return (
    <section id="forecast-demo" className="py-20 bg-white">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Trực quan hóa dữ liệu</span>
          <h2 className="text-3xl font-extrabold text-slate-900 mt-2">
            Mẫu Bảng Dự Báo Biến Động Cổ Phiếu Vào Ngày Mai
          </h2>
          <p className="text-sm text-slate-600 mt-3">
            Bảng dự báo tập trung 4 cột hành động rõ ràng kèm ngưỡng cắt lỗ an toàn giúp F0 không bao giờ bối rối.
          </p>
        </div>

        {/* Forecast Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm mb-10">
          <table className="w-full text-left text-sm border-collapse bg-white">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6">Mã CK</th>
                <th className="py-4 px-6">Giá hiện tại</th>
                <th className="py-4 px-6">Giá dự đoán ngày mai & Cắt lỗ</th>
                <th className="py-4 px-6">Khuyến nghị AI & Lý do định lượng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {demoStocks.map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-6">
                    <span className="font-extrabold text-blue-600 font-mono text-base block">{s.ticker}</span>
                    <span className="text-xs text-slate-400">{s.name}</span>
                  </td>
                  <td className="py-4 px-6 mono-num font-bold text-slate-900">{s.price}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <span className="mono-num font-extrabold text-slate-900">{s.target}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${s.pct.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {s.pct}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Cắt lỗ an toàn: <span className="mono-num text-rose-600 font-semibold">{s.stopLoss}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${s.actionClass} inline-block shrink-0`}>
                        {s.action}
                      </span>
                      <span className="text-xs text-slate-600">{s.reason}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pure Advisory Callout */}
        <div id="guarantee" className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center max-w-3xl mx-auto">
          <div className="text-sm font-extrabold text-slate-900 mb-1">
            Nguyên Tắc Cố Vấn Khách Quan (Pure Recommendation)
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Wealth4ward là nền tảng phân tích định lượng độc lập. Chúng tôi không giữ tiền của bạn, không tự động đặt lệnh và không can thiệp vào tài khoản chứng khoán của bạn. Quyết định giao dịch cuối cùng hoàn toàn thuộc về bạn với sự hỗ trợ của những dữ liệu định lượng đáng tin cậy nhất.
          </p>
        </div>
      </div>
    </section>
  );
};
