import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { ChartDataPoint } from '@/types/dashboard';

interface TradingViewAreaChartProps {
  data: ChartDataPoint[];
  navValue: number;
}

export const TradingViewAreaChart: React.FC<TradingViewAreaChartProps> = ({
  data,
  navValue
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create Chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
        fontSize: 12,
        fontFamily: 'Plus Jakarta Sans, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(226, 232, 240, 0.4)' },
        horzLines: { color: 'rgba(226, 232, 240, 0.4)' },
      },
      crosshair: {
        vertLine: {
          color: '#3b82f6',
          width: 1,
          style: 3,
        },
        horzLine: {
          color: '#3b82f6',
          width: 1,
          style: 3,
        },
      },
      rightPriceScale: {
        borderColor: '#e2e8f0',
        scaleMargins: {
          top: 0.15,
          bottom: 0.15,
        },
      },
      timeScale: {
        borderColor: '#e2e8f0',
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScroll: false,
      handleScale: false,
    });

    chartInstanceRef.current = chart;

    // Format series data for lightweight-charts: time as "YYYY-MM-DD"
    // Input format: "17/10/2025" -> "2025-10-17"
    const parsedData = data.map((d) => {
      const parts = d.date.split('/');
      const timeStr = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : d.date;
      return {
        time: timeStr,
        aiVal: Math.round(navValue * (1 + d.aiPct / 100)),
        bmVal: Math.round(navValue * (1 + d.bmPct / 100)),
      };
    });

    // Baseline VN-Index Series (Dotted Gray Line)
    const benchmarkSeries: ISeriesApi<'Line'> = chart.addLineSeries({
      color: '#94a3b8',
      lineWidth: 2,
      lineStyle: 2, // Dashed
      title: 'VN-Index Cơ sở',
      priceFormat: {
        type: 'price',
        precision: 0,
        minMove: 1000,
      },
    });

    // Wealth4ward NAV Series (Smooth Blue Area)
    const aiSeries: ISeriesApi<'Area'> = chart.addAreaSeries({
      topColor: 'rgba(37, 99, 235, 0.35)',
      bottomColor: 'rgba(37, 99, 235, 0.01)',
      lineColor: '#2563eb',
      lineWidth: 3,
      title: 'Wealth4ward (PPO)',
      priceFormat: {
        type: 'price',
        precision: 0,
        minMove: 1000,
      },
    });

    benchmarkSeries.setData(
      parsedData.map((item) => ({ time: item.time, value: item.bmVal }))
    );

    aiSeries.setData(
      parsedData.map((item) => ({ time: item.time, value: item.aiVal }))
    );

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, navValue]);

  return (
    <div className="w-full h-full relative">
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
};

export default TradingViewAreaChart;
