import { ChevronRight, Database, Cpu, Cloud, LineChart, Globe } from 'lucide-react';

export function PartnerMarquee() {
  const partners = [
    { name: 'FPT.AI', icon: Cpu, color: 'text-orange-500' },
    { name: 'Google Cloud', icon: Cloud, color: 'text-blue-500' },
    { name: 'VNDIRECT Data', icon: Database, color: 'text-amber-500' },
    { name: 'HMM Model', icon: LineChart, color: 'text-indigo-600' },
    { name: 'Bloomberg Data', icon: Globe, color: 'text-black font-extrabold' },
  ];

  return (
    <section className="py-8 bg-white border-y border-slate-100">
      <div className="max-w-[1360px] mx-auto px-6 md:px-10">
        <div className="bg-slate-50/80 rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="partner-marquee-shell">
            <div className="partner-marquee-track flex w-max items-center">
              {[0, 1].map((groupIndex) => (
                <div
                  key={groupIndex}
                  aria-hidden={groupIndex === 1}
                  className="flex shrink-0 items-center gap-4 md:gap-6 py-4 md:py-5 pr-4 md:pr-6"
                >
                  <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200/80">
                    <span>Được hỗ trợ bởi dữ liệu và AI hàng đầu</span>
                    <ChevronRight className="w-4 h-4 text-blue-500" />
                  </div>

                  {partners.map((partner) => {
                    const IconComp = partner.icon;
                    return (
                      <div
                        key={`${groupIndex}-${partner.name}`}
                        className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-2xs ring-1 ring-slate-200/80 transition-all hover:shadow-md hover:-translate-y-0.5"
                      >
                        <IconComp className={`w-4 h-4 ${partner.color}`} />
                        <span className="whitespace-nowrap text-xs font-bold tracking-tight text-slate-800 md:text-sm">
                          {partner.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
