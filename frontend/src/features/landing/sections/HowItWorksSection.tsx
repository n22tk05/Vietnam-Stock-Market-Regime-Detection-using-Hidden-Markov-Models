import React from 'react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Thu thập 50+ chỉ số',
      desc: 'Quét tự động dữ liệu vĩ mô (Lãi suất, DXY, Tỷ giá) và dữ liệu kỹ thuật từ HOSE & HNX.',
    },
    {
      num: '02',
      title: 'Nhận diện HMM Regime',
      desc: 'Mô hình Markov Ẩn xác định trạng thái thị trường: Bull, Bear hay Tích lũy Sideway.',
    },
    {
      num: '03',
      title: 'Tối ưu danh mục PPO',
      desc: 'Thuật toán học tăng cường PPO tính toán trọng số tỷ trọng tối ưu theo khẩu vị rủi ro.',
    },
    {
      num: '04',
      title: 'Phân bổ Lô 100 VSD',
      desc: 'Thuật toán khớp lệnh theo bội số 100 cp chuẩn quy định, cam kết không vượt vốn.',
    },
    {
      num: '05',
      title: 'Khuyến nghị & Cắt lỗ',
      desc: 'Xuất dự báo phiên mai, ngưỡng cắt lỗ an toàn và hướng dẫn hành động cụ thể.',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-white border-b border-slate-200">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Quy trình công nghệ</span>
          <h2 className="text-3xl font-extrabold text-slate-900 mt-2">
            Hệ thống Wealth4ward vận hành như thế nào?
          </h2>
          <p className="text-sm text-slate-600 mt-3">
            Quy trình khép kín 5 bước kết hợp phân tích vĩ mô và định lượng học máy hiện đại nhất.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {steps.map((s, idx) => (
            <div key={idx} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-blue-600 text-white font-extrabold flex items-center justify-center text-sm mb-4">
                  {s.num}
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
