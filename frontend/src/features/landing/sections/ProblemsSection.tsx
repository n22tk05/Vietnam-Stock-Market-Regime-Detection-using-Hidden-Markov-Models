import React from 'react';

export const ProblemsSection: React.FC = () => {
  const problems = [
    {
      pct: '73%',
      title: 'Nhà đầu tư cá nhân thua lỗ do giao dịch theo cảm xúc',
      color: 'text-rose-600',
      bg: 'bg-rose-50 border-rose-100',
    },
    {
      pct: '68%',
      title: 'Không có kế hoạch cắt lỗ kỷ luật khi thị trường đảo chiều',
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-100',
    },
    {
      pct: '81%',
      title: 'Mua đuổi đỉnh do thông tin nhiễu từ các nhóm hội phím hàng',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-100',
    },
    {
      pct: '90%',
      title: 'Không đo lường được hiệu quả thực tế và độ sụt giảm tài sản',
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-100',
    },
  ];

  return (
    <section id="problems" className="py-20 bg-slate-50 border-y border-slate-200">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Thực trạng thị trường</span>
          <h2 className="text-3xl font-extrabold text-slate-900 mt-2">
            Vì sao đa số nhà đầu tư F0 gặp khó khăn tại thị trường Việt Nam?
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {problems.map((p, idx) => (
            <div
              key={idx}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all"
            >
              <div className={`mono-num text-4xl font-extrabold mb-3 ${p.color}`}>{p.pct}</div>
              <h3 className="text-sm font-bold text-slate-800 leading-snug">{p.title}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
