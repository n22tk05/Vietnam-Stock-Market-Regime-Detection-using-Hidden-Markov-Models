import React from 'react';
import {
  TrendingUp,
  ShieldCheck,
  MessageSquareText,
  Scale,
  GraduationCap,
  Zap,
  ArrowRight,
} from 'lucide-react';

interface FullExperienceSectionProps {
  onOpenAssessment: () => void;
}

export const FullExperienceSection: React.FC<FullExperienceSectionProps> = ({
  onOpenAssessment,
}) => {
  const features = [
    {
      title: 'AI Xây dựng danh mục thông minh',
      description: 'Danh mục được tối ưu theo mục tiêu và rủi ro của bạn',
      icon: TrendingUp,
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Quản trị rủi ro chủ động',
      description: 'AI giám sát và cảnh báo rủi ro liên tục',
      icon: ShieldCheck,
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Giải thích rõ ràng & minh bạch',
      description: 'Mỗi quyết định đều có lý do cụ thể',
      icon: MessageSquareText,
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Tự động tái cân bằng danh mục',
      description: 'Luôn giữ danh mục ở trạng thái tối ưu',
      icon: Scale,
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Học đầu tư cùng AI',
      description: 'Kiến thức dễ hiểu, đúng trọng tâm, đúng thời điểm',
      icon: GraduationCap,
      iconBg: 'bg-indigo-50 text-indigo-600',
    },
    {
      title: 'Cập nhật thị trường 24/7',
      description: 'Tin tức, xu hướng, sự kiện mới nhất',
      icon: Zap,
      iconBg: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <section id="features" className="py-24 bg-slate-50/60">
      <div className="max-w-[1360px] mx-auto px-6 md:px-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Side Copy & CTA (4 Cols) */}
        <div className="lg:col-span-4">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
            Trải nghiệm trọn vẹn<br />với Astera
          </h2>
          <p className="text-base text-slate-600 font-normal leading-relaxed mb-8">
            Tất cả công cụ bạn cần để đầu tư thông minh và bền vững.
          </p>
          <button
            onClick={onOpenAssessment}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-7 py-3.5 rounded-full flex items-center gap-2.5 transition-all shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/35 hover:-translate-y-0.5"
          >
            <span>Khám phá tính năng</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right Side 6 Feature Cards Grid (8 Cols) */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {features.map((item, idx) => {
            const IconComp = item.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex items-start gap-4"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${item.iconBg} group-hover:scale-110 transition-transform`}>
                  <IconComp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
