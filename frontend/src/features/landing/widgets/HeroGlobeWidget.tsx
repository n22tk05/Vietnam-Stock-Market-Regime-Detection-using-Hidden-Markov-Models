import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ShieldCheck, TrendingUp, PieChart, Sparkles } from 'lucide-react';
import { Globe3D } from './Globe3D';

/* ─── Shared floating animation config ─── */
const floatVariants = (delay: number, y: number = 8) => ({
  initial: { opacity: 0, y: 30, scale: 0.92 },
  animate: {
    opacity: 1,
    y: [0, -y, 0],
    scale: 1,
    transition: {
      opacity: { duration: 0.6, delay },
      scale: { duration: 0.5, delay },
      y: { duration: 4 + delay, repeat: Infinity, ease: 'easeInOut' as const, delay: delay + 0.6 },
    },
  },
});

/* ─── Mini SVG sparkline used in Widget 1 ─── */
const SparklineSVG: React.FC = () => {
  const points = [2, 3.5, 2.8, 4.5, 3.8, 5.5, 4.2, 6, 5.2, 4.8, 5.8, 6.5];
  const max = Math.max(...points);
  const w = 140;
  const h = 32;
  const step = w / (points.length - 1);

  const pathData = points
    .map((p, i) => {
      const x = i * step;
      const y = h - (p / max) * h;
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(' ');

  const areaPath = pathData + ` L ${w} ${h} L 0 ${h} Z`;

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-1.5">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <motion.path
        d={areaPath}
        fill="url(#sparkGrad)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.8 }}
      />
      <motion.path
        d={pathData}
        fill="none"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, delay: 0.5, ease: 'easeInOut' }}
      />
      {/* Animated dot at the end */}
      <motion.circle
        cx={w}
        cy={h - (points[points.length - 1] / max) * h}
        r="3"
        fill="#10b981"
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.3, 1] }}
        transition={{ duration: 0.4, delay: 2.5 }}
      />
    </svg>
  );
};

/* ─── Animated Donut Ring ─── */
const AnimatedDonut: React.FC = () => {
  const segments = [
    { pct: 28, color: '#2563eb', offset: 0 },
    { pct: 22, color: '#10b981', offset: 28 },
    { pct: 18, color: '#f59e0b', offset: 50 },
    { pct: 32, color: '#94a3b8', offset: 68 },
  ];
  const r = 18;
  const circ = 2 * Math.PI * r;

  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
      {segments.map((seg, i) => (
        <motion.circle
          key={i}
          cx="26"
          cy="26"
          r={r}
          fill="none"
          stroke={seg.color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${(seg.pct / 100) * circ} ${circ}`}
          strokeDashoffset={-(seg.offset / 100) * circ}
          transform="rotate(-90 26 26)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.3 + i * 0.2, ease: 'easeOut' }}
        />
      ))}
    </svg>
  );
};

/* ─── Animated circular confidence gauge ─── */
const ConfidenceGauge: React.FC<{ value: number }> = ({ value }) => {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dashLen = (value / 100) * circ;

  return (
    <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
      <svg width="56" height="56" viewBox="0 0 56 56" className="absolute inset-0">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
        <motion.circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeDasharray={`${dashLen} ${circ}`}
          transform="rotate(-90 28 28)"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${dashLen} ${circ}` }}
          transition={{ duration: 1.8, delay: 0.6, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
      <motion.span
        className="text-sm font-black text-blue-600 relative z-10"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 1.5 }}
      >
        {value}%
      </motion.span>
    </div>
  );
};

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export const HeroGlobeWidget: React.FC = () => {
  return (
    <div className="relative w-full h-[520px] sm:h-[580px] lg:h-[620px] flex items-center justify-center">
      {/* Background Ambient Glow */}
      <div className="absolute w-[420px] h-[420px] sm:w-[500px] sm:h-[500px] rounded-full bg-gradient-to-tr from-blue-600/20 via-indigo-500/15 to-purple-600/10 blur-3xl" />

      {/* ── Central 3D Interactive Globe ── */}
      <div className="relative z-10 w-[300px] h-[300px] sm:w-[360px] sm:h-[360px] flex items-center justify-center pointer-events-auto">
        <Globe3D />

        {/* AI Astera Badge Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
          <motion.div
            className="flex items-center gap-1.5 mb-0.5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <span className="text-[28px] sm:text-[32px] font-black text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] tracking-tight">
              AI
            </span>
          </motion.div>
          <motion.span
            className="text-sm sm:text-base font-extrabold text-cyan-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-widest uppercase"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            Astera
          </motion.span>
        </div>

        {/* Checkmark badge */}
        <motion.div
          className="absolute top-[28%] right-[10%] z-30 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/50 border-2 border-white/40 pointer-events-none"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 1 }}
        >
          <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </motion.div>
      </div>

      {/* ══════════════════════════════════════
         FLOATING FEATURE WIDGETS (4)
         ══════════════════════════════════════ */}

      {/* ── Widget 1: Top-Left — Phân tích thị trường ── */}
      <motion.div
        variants={floatVariants(0.2, 6)}
        initial="initial"
        animate="animate"
        whileHover={{ scale: 1.05, boxShadow: '0 20px 40px -12px rgba(16,185,129,0.25)' }}
        className="absolute top-4 left-0 sm:left-2 z-20 bg-white/92 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/70 shadow-xl max-w-[210px] cursor-default group"
      >
        <div className="text-[10px] font-bold text-slate-400 mb-0.5 flex items-center justify-between uppercase tracking-wider">
          <span>Phân tích thị trường</span>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inset-0 rounded-full bg-emerald-400 opacity-75" />
            <span className="relative rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
        </div>
        <div className="text-[11px] font-bold text-slate-600 mt-1">VN-Index</div>
        <div className="flex items-baseline gap-2 mt-0.5">
          <motion.span
            className="text-lg font-black text-slate-900 tabular-nums"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            1,286.45
          </motion.span>
          <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" />
            +1.32%
          </span>
        </div>
        <SparklineSVG />
      </motion.div>

      {/* ── Widget 2: Top-Right — Quản trị rủi ro ── */}
      <motion.div
        variants={floatVariants(0.4, 7)}
        initial="initial"
        animate="animate"
        whileHover={{ scale: 1.05, boxShadow: '0 20px 40px -12px rgba(37,99,235,0.2)' }}
        className="absolute top-6 right-0 sm:right-2 z-20 bg-white/92 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/70 shadow-xl max-w-[185px] cursor-default group"
      >
        <div className="flex items-center gap-2.5 mb-2.5">
          <motion.div
            className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30"
            whileHover={{ rotate: 10 }}
          >
            <ShieldCheck className="w-4.5 h-4.5" />
          </motion.div>
          <span className="text-xs font-bold text-slate-800">Quản trị rủi ro</span>
        </div>
        <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Rủi ro danh mục</div>
        <div className="flex items-center justify-between mt-1.5 gap-3">
          <motion.span
            className="text-sm font-black text-emerald-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            Thấp
          </motion.span>
          <div className="w-20 h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: '33%' }}
              transition={{ duration: 1.2, delay: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
        {/* Mini risk indicators */}
        <div className="flex items-center gap-1.5 mt-2.5">
          {['Biến động', 'Tập trung', 'Thanh khoản'].map((label, i) => (
            <motion.div
              key={label}
              className="flex-1 text-center py-1 px-1 rounded-lg bg-slate-50 border border-slate-100"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 + i * 0.15 }}
            >
              <div className="text-[8px] font-semibold text-slate-400">{label}</div>
              <div className="text-[9px] font-black text-emerald-600">✓</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Widget 3: Bottom-Left — Tối ưu danh mục ── */}
      <motion.div
        variants={floatVariants(0.6, 8)}
        initial="initial"
        animate="animate"
        whileHover={{ scale: 1.05, boxShadow: '0 20px 40px -12px rgba(37,99,235,0.2)' }}
        className="absolute bottom-6 left-0 sm:left-2 z-20 bg-white/92 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/70 shadow-xl min-w-[215px] cursor-default group"
      >
        <div className="flex items-center gap-2 mb-2.5">
          <motion.div
            className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center"
            whileHover={{ rotate: -10 }}
          >
            <PieChart className="w-3.5 h-3.5 text-white" />
          </motion.div>
          <span className="text-xs font-bold text-slate-800">Tối ưu danh mục</span>
        </div>
        <div className="flex items-center gap-3.5">
          <AnimatedDonut />
          <div className="text-[10px] space-y-1 text-slate-600 font-medium">
            {[
              { label: 'Ngân hàng', pct: '28%', color: 'bg-blue-600' },
              { label: 'Công nghệ', pct: '22%', color: 'bg-emerald-500' },
              { label: 'Tiêu dùng', pct: '18%', color: 'bg-amber-400' },
              { label: 'Khác', pct: '32%', color: 'bg-slate-400' },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                className="flex items-center justify-between gap-3"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0 + i * 0.12 }}
              >
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${item.color}`} />
                  {item.label}
                </span>
                <span className="font-bold text-slate-900 tabular-nums">{item.pct}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Widget 4: Bottom-Right — AI đề xuất ── */}
      <motion.div
        variants={floatVariants(0.8, 6)}
        initial="initial"
        animate="animate"
        whileHover={{ scale: 1.05, boxShadow: '0 20px 40px -12px rgba(124,58,237,0.2)' }}
        className="absolute bottom-10 right-0 sm:right-4 z-20 bg-white/92 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/70 shadow-xl min-w-[165px] cursor-default group"
      >
        <div className="flex items-center gap-2 mb-2">
          <motion.div
            className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-md shadow-violet-500/25"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </motion.div>
          <span className="text-xs font-bold text-slate-800">AI đề xuất</span>
        </div>
        <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Độ tin cậy</div>
        <div className="flex items-center gap-3 mt-1">
          <ConfidenceGauge value={92} />
          <div>
            <motion.div
              className="text-[10px] text-slate-500 font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
            >
              Mua <span className="font-bold text-blue-600">VCB</span>
            </motion.div>
            <motion.div
              className="text-[10px] text-slate-500 font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.2 }}
            >
              Giữ <span className="font-bold text-emerald-600">FPT</span>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
