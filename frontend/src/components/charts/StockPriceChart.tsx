import React, { useState } from 'react';
import { StockPricePoint } from '@/types/dashboard';

interface StockPriceChartProps {
  ticker: string;
  history: StockPricePoint[];
  predictedPrice: number;
  stopLoss: number;
}

export const StockPriceChart: React.FC<StockPriceChartProps> = ({
  ticker,
  history,
  predictedPrice,
  stopLoss,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<StockPricePoint | null>(null);

  if (!history || history.length === 0) return null;

  const prices = history.map((d) => d.price);
  const minPrice = Math.min(...prices, stopLoss) * 0.98;
  const maxPrice = Math.max(...prices, predictedPrice) * 1.02;
  const priceRange = maxPrice - minPrice || 1;

  const svgWidth = 560;
  const svgHeight = 160;
  const paddingX = 40;
  const paddingTop = 20;
  const paddingBottom = 30;
  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Convert (index, price) to SVG coordinates
  const getCoordinates = (index: number, price: number) => {
    const x = paddingX + (index / (history.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
    return { x, y };
  };

  const points = history.map((d, i) => getCoordinates(i, d.price));

  // Build SVG Path string
  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x},${paddingTop + chartHeight} L ${points[0].x},${paddingTop + chartHeight} Z`;

  const formatVND = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' đ';
  };

  const activePoint = hoveredPoint || history[history.length - 1];

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
      {/* Chart Top Indicator Banner */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div>
          <span className="text-xs text-slate-600 block">Ngày quan sát:</span>
          <span className="text-sm font-bold font-mono text-slate-800">
            {activePoint.date}
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-600 block">Giá trị giao dịch:</span>
          <span className="text-base font-bold font-mono text-blue-600">
            {formatVND(activePoint.price)}
          </span>
        </div>
      </div>

      {/* SVG Coordinate Chart with Day & Value Labels */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-44 overflow-visible cursor-crosshair select-none"
        >
          <defs>
            <linearGradient id={`gradient-${ticker}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines with Price Axis */}
          {[0, 0.5, 1].map((ratio) => {
            const pVal = minPrice + ratio * priceRange;
            const y = paddingTop + chartHeight - ratio * chartHeight;
            return (
              <g key={ratio}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="600"
                >
                  {formatVND(pVal)}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaD} fill={`url(#gradient-${ticker})`} />

          {/* Line Stroke */}
          <path
            d={pathD}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points on the line */}
          {points.map((pt, i) => {
            const isHovered = hoveredPoint?.date === history[i].date;
            return (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(history[i])}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Invisible hover hotspot */}
                <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />

                {/* Point circle */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5.5 : 3.5}
                  fill="#ffffff"
                  stroke="#2563eb"
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all duration-150"
                />

                {/* Date label on X-axis */}
                <text
                  x={pt.x}
                  y={paddingTop + chartHeight + 16}
                  textAnchor="middle"
                  fill={isHovered ? '#1e293b' : '#64748b'}
                  fontSize="9.5"
                  fontFamily="Plus Jakarta Sans, sans-serif"
                  fontWeight={isHovered ? '700' : '500'}
                >
                  {history[i].date}
                </text>
              </g>
            );
          })}

          {/* Forecast Reference Point (Phiên tới) */}
          {(() => {
            const lastPt = points[points.length - 1];
            const predY =
              paddingTop +
              chartHeight -
              ((predictedPrice - minPrice) / priceRange) * chartHeight;
            return (
              <g>
                <line
                  x1={lastPt.x}
                  y1={lastPt.y}
                  x2={lastPt.x + 28}
                  y2={predY}
                  stroke="#059669"
                  strokeWidth="2"
                  strokeDasharray="3 3"
                />
                <circle cx={lastPt.x + 28} cy={predY} r="4" fill="#059669" />
                <text
                  x={lastPt.x + 32}
                  y={predY + 3}
                  fill="#059669"
                  fontSize="9.5"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="bold"
                >
                  {formatVND(predictedPrice)}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Caption footer */}
      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
        <span>Trục hoành: <strong>Ngày giao dịch</strong></span>
        <span>Trục tung: <strong>Giá trị cổ phiếu (VNĐ)</strong></span>
      </div>
    </div>
  );
};

export default StockPriceChart;
