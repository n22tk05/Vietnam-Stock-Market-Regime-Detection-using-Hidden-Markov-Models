import React from 'react';
import { TrendingDown, Frown, BookOpen, Clock } from 'lucide-react';

export const InvestorProblemsSection: React.FC = () => {
  const problems = [
    {
      pct: '73%',
      title: 'Nhà đầu tư F0 thiếu chiến lược rõ ràng',
      icon: TrendingDown,
      bgColor: 'bg-rose-50 border-rose-100 text-rose-600',
      iconBg: 'bg-rose-100 text-rose-600',
    },
    {
      pct: '68%',
      title: 'Ra quyết định theo cảm xúc (FOMO, sợ hãi)',
      icon: Frown,
      bgColor: 'bg-amber-50 border-amber-100 text-amber-600',
      iconBg: 'bg-amber-100 text-amber-600',
    },
    {
      pct: '81%',
      title: 'Không hiểu cách quản trị rủi ro',
      icon: BookOpen,
      bgColor: 'bg-indigo-50 border-indigo-100 text-indigo-600',
      iconBg: 'bg-indigo-100 text-indigo-600',
    },
    {
      pct: '90%',
      title: 'Không có thời gian theo dõi thị trường',
      icon: Clock,
      bgColor: 'bg-blue-50 border-blue-100 text-blue-600',
      iconBg: 'bg-blue-100 text-blue-600',
    },
  ];

  return (
    <section className="py-20 bg-slate-50/60">
      <div className="max-w-[1360px] mx-auto px-6 md:px-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Title & Description (4 Cols) */}
        <div className="lg:col-span-4">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
            Vấn đề của<br />nhà đầu tư F0
          </h2>
          <p className="text-base text-slate-600 font-normal leading-relaxed">
            Không phải bạn thiếu thông tin.<br />Bạn thiếu phương pháp đúng.
          </p>
        </div>

        {/* Right 4 Metric Cards Grid (8 Cols) */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {problems.map((prob, idx) => {
            const IconComp = prob.icon;
            return (
              <div
                key={idx}
                className={`p-6 rounded-3xl bg-white border ${prob.bgColor} shadow-sm hover:shadow-md transition-all hover:-translate-y-1 flex flex-col justify-between`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${prob.iconBg}`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <span className={`text-3xl font-black ${prob.bgColor.split(' ')[2]}`}>
                    {prob.pct}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-800 leading-snug">
                  {prob.title}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
