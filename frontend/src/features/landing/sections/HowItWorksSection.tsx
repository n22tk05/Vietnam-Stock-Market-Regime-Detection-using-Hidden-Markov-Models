import React from 'react';
import { Database, TrendingUp, Target, PieChart, CheckCircle2 } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      id: 1,
      title: 'Thu thập dữ liệu',
      description: 'Thị trường, kinh tế, doanh nghiệp, ngành',
      icon: Database,
    },
    {
      id: 2,
      title: 'Phân tích & Nhận diện xu hướng thị trường',
      description: 'AI nhận diện chế độ thị trường (Bull, Bear, Sideways)',
      icon: TrendingUp,
    },
    {
      id: 3,
      title: 'Đánh giá rủi ro cá nhân hóa',
      description: 'Phù hợp với mục tiêu, vốn và khẩu vị rủi ro',
      icon: Target,
    },
    {
      id: 4,
      title: 'Tối ưu danh mục đầu tư',
      description: 'HMM + PPO + AI đề xuất danh mục tối ưu',
      icon: PieChart,
    },
    {
      id: 5,
      title: 'Giải thích & Đồng hành cùng bạn',
      description: 'AI giải thích rõ ràng, dễ hiểu, minh bạch.',
      icon: CheckCircle2,
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-white overflow-hidden">
      <div className="max-w-[1360px] mx-auto px-6 md:px-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Astera AI hoạt động như thế nào?
          </h2>
        </div>

        {/* 5-step Horizontal Connected Pipeline */}
        <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-4">
          {/* Connector Line (Desktop) */}
          <div className="hidden lg:block absolute top-12 left-12 right-12 h-[2px] border-t-2 border-dashed border-blue-200 z-0" />

          {/* Arrow indicators on connector line */}
          {[0, 1, 2, 3].map((i) => (
            <div
              key={`arrow-${i}`}
              className="hidden lg:flex absolute top-[46px] z-[5] w-5 h-5 items-center justify-center text-blue-300"
              style={{ left: `${20 + i * 17.5}%` }}
            >
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
              </svg>
            </div>
          ))}

          {steps.map((step) => {
            const IconComponent = step.icon;
            return (
              <div
                key={step.id}
                className="relative z-10 flex flex-col items-center text-center max-w-[220px] group"
              >
                {/* Node Icon */}
                <div className="w-20 h-20 rounded-full bg-blue-50 border-4 border-white shadow-xl shadow-blue-500/10 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <IconComponent className="w-8 h-8" />
                </div>

                {/* Step Content */}
                <h4 className="text-sm font-extrabold text-slate-900 mb-2 leading-snug group-hover:text-blue-600 transition-colors">
                  {step.title}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
