import React, { useEffect, useRef, useMemo, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, SeriesMarker, Time } from 'lightweight-charts';
import { PersonalNavDataPoint, SimulatedUserPortfolio, USER_PERSONAL_NAV_HISTORY } from '@/types/dashboard';
import { TrendingDown, TrendingUp, ShieldAlert, Award, Calendar, DollarSign, Eye, EyeOff, Layers, Maximize2 } from 'lucide-react';

interface PersonalEquityChartProps {
  portfolio?: SimulatedUserPortfolio;
  data?: PersonalNavDataPoint[];
  initialCapital?: number;
  currentNav?: number;
}

type TimeframeOption = '1W' | '1M' | '3M' | '6M' | 'YTD' | 'ALL';

interface HoverInfo {
  date: string;
  nav: number;
  pnlCash: number;
  pnlPct: number;
}

export const PersonalEquityChart: React.FC<PersonalEquityChartProps> = ({
  portfolio,
  data = USER_PERSONAL_NAV_HISTORY,
  initialCapital = 10000000,
  currentNav = 9379000,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);

  // 1. Quản lý bộ lọc mốc thời gian và hover HUD
  const [timeframe, setTimeframe] = useState<TimeframeOption>('ALL');
  const [hoveredData, setHoveredData] = useState<HoverInfo | null>(null);

  // 2. Trích xuất thông số vốn và NAV thực tế từ Portfolio
  const initCap = portfolio?.initial_capital ?? initialCapital;
  const latestNav = portfolio?.current_nav ?? currentNav;
  const pnlCash = latestNav - initCap;
  const pnlPct = initCap > 0 ? (pnlCash / initCap) * 100 : 0;
  const userTier = portfolio?.user_tier || `${Math.round(initCap / 1_000_000)}M`;

  const cashLeft = portfolio?.cash_left ?? 0;
  const cashRatio = latestNav > 0 ? (cashLeft / latestNav) * 100 : 0;
  const stockVal = Math.max(0, latestNav - cashLeft);
  const stockRatio = latestNav > 0 ? (stockVal / latestNav) * 100 : 0;
  const holdingsCount = portfolio?.holdings?.length ?? 0;

  // 3. Chuẩn hóa và làm sạch toàn bộ dữ liệu lịch sử (100% Inception-to-Date)
  const fullPoints = useMemo(() => {
    const rawHistory = portfolio?.history;
    
    if (rawHistory && Array.isArray(rawHistory) && rawHistory.length > 0) {
      let cumMax = initCap;

      const points = rawHistory.map((item, idx) => {
        const parts = item.date.split('/');
        const timeStr = parts.length === 3 ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}` : item.date;
        const nav = item.nav;
        
        if (nav > cumMax) {
          cumMax = nav;
        }

        const dd = cumMax > 0 ? ((nav - cumMax) / cumMax) * 100 : 0;

        // Ước tính VN-Index quy đổi (Tỷ lệ tăng trưởng tham chiếu VN30 ~ 0.035%/ngày)
        const bmReturn = idx * 0.00035; 
        const benchmark = Math.round(initCap * (1 - 0.015 + bmReturn));

        return {
          time: timeStr as Time,
          displayDate: item.date,
          nav,
          baseline: initCap,
          benchmark,
          dd,
          pnlCash: nav - initCap,
          pnlPct: item.delta_pct_from_start ?? ((nav - initCap) / initCap) * 100,
        };
      });

      // Sắp xếp thời gian tăng dần và loại bỏ bản ghi trùng
      points.sort((a, b) => (String(a.time) > String(b.time) ? 1 : String(a.time) < String(b.time) ? -1 : 0));
      const unique = [];
      const seen = new Set<string>();
      for (const pt of points) {
        if (!seen.has(String(pt.time))) {
          seen.add(String(pt.time));
          unique.push(pt);
        }
      }
      return unique;
    }

    // Fallback nếu chưa có history (dùng mảng mẫu 7 ngày)
    const fallback = data.map((d) => {
      const parts = d.date.split('/');
      const timeStr = parts.length === 3 ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}` : d.date;
      return {
        time: timeStr as Time,
        displayDate: d.date,
        nav: d.nav,
        baseline: initCap,
        benchmark: d.benchmarkNav,
        dd: 0,
        pnlCash: d.nav - initCap,
        pnlPct: d.pnlPct,
      };
    });
    fallback.sort((a, b) => (String(a.time) > String(b.time) ? 1 : -1));
    return fallback;
  }, [portfolio, data, initCap]);

  // 4. Lọc dữ liệu theo mốc thời gian đang chọn (Timeframe Filtering)
  const filteredData = useMemo(() => {
    if (fullPoints.length === 0) return { points: [], stats: null };

    let sliced = [...fullPoints];
    const totalLen = fullPoints.length;

    switch (timeframe) {
      case '1W':
        sliced = fullPoints.slice(Math.max(0, totalLen - 5));
        break;
      case '1M':
        sliced = fullPoints.slice(Math.max(0, totalLen - 22));
        break;
      case '3M':
        sliced = fullPoints.slice(Math.max(0, totalLen - 66));
        break;
      case '6M':
        sliced = fullPoints.slice(Math.max(0, totalLen - 132));
        break;
      case 'YTD': {
        // Tìm các phiên từ đầu năm 2026
        const ytdIdx = fullPoints.findIndex((p) => String(p.time) >= '2026-01-01');
        if (ytdIdx !== -1) {
          sliced = fullPoints.slice(ytdIdx);
        } else {
          sliced = fullPoints.slice(Math.max(0, totalLen - 120));
        }
        break;
      }
      case 'ALL':
      default:
        sliced = fullPoints;
        break;
    }

    if (sliced.length === 0) sliced = fullPoints;

    // Tính toán thống kê chi tiết cho khoảng thời gian này
    const startPoint = sliced[0];
    const endPoint = sliced[sliced.length - 1];
    const periodPnlCash = endPoint.nav - startPoint.nav;
    const periodPnlPct = startPoint.nav > 0 ? (periodPnlCash / startPoint.nav) * 100 : 0;

    // Tìm Đỉnh NAV (Peak) và Đáy Drawdown trong kỳ
    let peakNav = sliced[0].nav;
    let peakDate = sliced[0].displayDate;
    let minNav = sliced[0].nav;
    let minNavDate = sliced[0].displayDate;
    let minDd = 0;
    let minDdDate = sliced[0].displayDate;
    let winDays = 0;

    sliced.forEach((p, idx) => {
      if (p.nav > peakNav) {
        peakNav = p.nav;
        peakDate = p.displayDate;
      }
      if (p.nav < minNav) {
        minNav = p.nav;
        minNavDate = p.displayDate;
      }
      if (p.dd < minDd) {
        minDd = p.dd;
        minDdDate = p.displayDate;
      }
      if (idx > 0 && p.nav >= sliced[idx - 1].nav) {
        winDays++;
      }
    });

    const winRate = sliced.length > 1 ? (winDays / (sliced.length - 1)) * 100 : 50;

    return {
      points: sliced,
      stats: {
        startDate: startPoint.displayDate,
        endDate: endPoint.displayDate,
        totalSessions: sliced.length,
        periodPnlCash,
        periodPnlPct,
        peakNav,
        peakDate,
        minNav,
        minNavDate,
        minDd,
        minDdDate,
        winRate,
        startNav: startPoint.nav,
        endNav: endPoint.nav,
      },
    };
  }, [fullPoints, timeframe]);

  const activeStats = filteredData.stats;
  const isPeriodProfit = (activeStats?.periodPnlCash ?? 0) >= 0;

  // 5. Khởi tạo và quản lý Biểu đồ TradingView Lightweight Charts
  useEffect(() => {
    if (!chartContainerRef.current) return;

    let isDisposed = false;

    // Dọn dẹp an toàn instance cũ nếu có
    if (chartInstanceRef.current) {
      try {
        chartInstanceRef.current.remove();
      } catch {
        // ignore
      }
      chartInstanceRef.current = null;
    }

    // Khởi tạo Chart với độ chia chuẩn tài chính (Financial Scale)
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
        fontSize: 11,
        fontFamily: 'Plus Jakarta Sans, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(241, 245, 249, 0.9)', style: 1 },
        horzLines: { color: 'rgba(241, 245, 249, 0.9)', style: 1 },
      },
      crosshair: {
        vertLine: {
          color: '#3b82f6',
          width: 1,
          style: 3,
          labelBackgroundColor: '#1e293b',
        },
        horzLine: {
          color: '#3b82f6',
          width: 1,
          style: 3,
          labelBackgroundColor: '#1e293b',
        },
      },
      rightPriceScale: {
        borderColor: '#e2e8f0',
        autoScale: true,
        scaleMargins: {
          top: 0.16,
          bottom: 0.16,
        },
      },
      timeScale: {
        borderColor: '#e2e8f0',
        fixLeftEdge: true,
        fixRightEdge: true,
        timeVisible: false,
        secondsVisible: false,
      },
      localization: {
        // Định dạng độ chia giá trục phải: gọn gàng theo đơn vị 'tr' (triệu đồng)
        priceFormatter: (price: number) => {
          if (price >= 1_000_000) {
            return (price / 1_000_000).toFixed(2) + ' tr';
          }
          return new Intl.NumberFormat('vi-VN').format(price);
        },
        dateFormat: 'dd/MM/yyyy',
      },
      handleScroll: true,
      handleScale: true,
    });

    chartInstanceRef.current = chart;

    const points = filteredData.points;
    if (points.length === 0) return;

    // 5.1 Đường NAV Thực Tế Của Người Dùng (Vibrant Area Series)
    const isOverallProfit = (points[points.length - 1]?.pnlCash ?? 0) >= 0;
    const navSeries = chart.addAreaSeries({
      topColor: isOverallProfit ? 'rgba(16, 185, 129, 0.32)' : 'rgba(37, 99, 235, 0.28)',
      bottomColor: isOverallProfit ? 'rgba(16, 185, 129, 0.01)' : 'rgba(37, 99, 235, 0.01)',
      lineColor: isOverallProfit ? '#059669' : '#2563eb',
      lineWidth: 3,
      title: 'Tài Sản Ròng (NAV)',
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => (price / 1_000_000).toFixed(2) + ' tr',
      },
    });
    navSeries.setData(points.map((p) => ({ time: p.time, value: p.nav })));

    // 5.4 Đặt Mốc Milestone Markers trực quan
    const markers: SeriesMarker<Time>[] = [];
    if (points.length > 0) {
      // Mốc bắt đầu
      markers.push({
        time: points[0].time,
        position: 'aboveBar',
        color: '#2563eb',
        shape: 'arrowDown',
        text: `Khởi đầu: ${(points[0].nav / 1_000_000).toFixed(2)}M`,
      });
    }

    // Mốc Đỉnh cao nhất trong kỳ
    if (activeStats && activeStats.peakNav > points[0].nav) {
      const peakPoint = points.find((p) => p.nav === activeStats.peakNav);
      if (peakPoint && peakPoint.time !== points[0].time && peakPoint.time !== points[points.length - 1].time) {
        markers.push({
          time: peakPoint.time,
          position: 'aboveBar',
          color: '#eab308',
          shape: 'arrowDown',
          text: `Đỉnh: ${(peakPoint.nav / 1_000_000).toFixed(2)}M`,
        });
      }
    }


    navSeries.setMarkers(markers);
    chart.timeScale().fitContent();

    // 5.5 Đăng ký sự kiện Crosshair Hover để cập nhật HUD Tooltip chi tiết
    chart.subscribeCrosshairMove((param) => {
      if (isDisposed) return;
      if (!param || !param.time || !param.seriesData) {
        setHoveredData(null);
        return;
      }

      const navVal = param.seriesData.get(navSeries) as { value: number } | undefined;
      if (navVal && navVal.value) {
        const currentPt = points.find((p) => String(p.time) === String(param.time));
        if (currentPt) {
          setHoveredData({
            date: currentPt.displayDate,
            nav: currentPt.nav,
            pnlCash: currentPt.pnlCash,
            pnlPct: currentPt.pnlPct,
          });
        }
      }
    });

    // 5.6 Tự động co giãn theo kích thước khung chứa
    const handleResize = () => {
      if (isDisposed) return;
      if (chartContainerRef.current) {
        try {
          chart.applyOptions({
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
          });
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(() => handleResize());
    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }
    handleResize();

    return () => {
      isDisposed = true;
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      chartInstanceRef.current = null;
      try {
        chart.remove();
      } catch {
        // ignore
      }
    };
  }, [filteredData, initCap, activeStats]);

  // Dữ liệu hiển thị trên HUD Header: Ưu tiên điểm đang hover, nếu không có hiển thị điểm hiện tại
  const displayNav = hoveredData?.nav ?? latestNav;
  const displayPnlCash = hoveredData?.pnlCash ?? pnlCash;
  const displayPnlPct = hoveredData?.pnlPct ?? pnlPct;
  const displayDate = hoveredData?.date ?? activeStats?.endDate ?? 'Hôm nay';

  const timeframes: { label: string; value: TimeframeOption; desc: string }[] = [
    { label: '1W', value: '1W', desc: '1 Tuần' },
    { label: '1M', value: '1M', desc: '1 Tháng' },
    { label: '3M', value: '3M', desc: '3 Tháng' },
    { label: '6M', value: '6M', desc: '6 Tháng' },
    { label: 'YTD', value: 'YTD', desc: 'Đầu năm 2026' },
    { label: 'ALL', value: 'ALL', desc: 'Toàn bộ từ lúc tham gia' },
  ];

  return (
    <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-5">
      {/* 1. Header: Tiêu đề, HUD Giá trị tài sản & Bộ chọn Mốc thời gian */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Đường Cong Giá Trị Tài Sản Cá Nhân (Inception-to-Date NAV)</span>
              <span className="text-xs px-2 py-0.5 rounded-md font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                #{userTier}
              </span>
            </h3>

            {/* Badge Lãi/Lỗ tương tác */}
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5 transition-colors ${
                displayPnlCash >= 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {displayPnlCash >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>
                {displayPnlPct >= 0 ? '+' : ''}{displayPnlPct.toFixed(2)}% ({displayPnlCash >= 0 ? '+' : ''}{new Intl.NumberFormat('vi-VN').format(displayPnlCash)} đ)
              </span>
            </span>
          </div>

          <p className="text-xs text-slate-500">
            {hoveredData ? (
              <span className="text-blue-700 font-semibold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Phiên {displayDate} | NAV: {new Intl.NumberFormat('vi-VN').format(displayNav)} đ ({displayPnlPct >= 0 ? '+' : ''}{displayPnlPct.toFixed(2)}%)
              </span>
            ) : (
              <span>
                Toàn bộ dữ liệu thực tế từ phiên <strong>{activeStats?.startDate}</strong> đến <strong>{activeStats?.endDate}</strong> ({activeStats?.totalSessions} phiên giao dịch).
              </span>
            )}
          </p>
        </div>

        {/* 2. Controls: Timeframe Selector */}
        <div className="flex items-center">
          {/* Timeframe Buttons Group */}
          <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            {timeframes.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  timeframe === tf.value
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title={tf.desc}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Vùng vẽ Biểu đồ Lightweight Charts */}
      <div className="relative">
        <div className="h-[380px] w-full">
          <div ref={chartContainerRef} className="w-full h-full" />
        </div>

        {/* Legend Overlay góc trên bên trái */}
        <div className="absolute top-3 left-3 flex items-center gap-2 text-[11px] font-semibold pointer-events-none">
          <div className="px-2.5 py-1 rounded-md bg-white/90 backdrop-blur-xs border border-blue-200 text-blue-900 shadow-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>NAV: {new Intl.NumberFormat('vi-VN').format(displayNav)} đ</span>
          </div>
        </div>
      </div>

      {/* 4. Thống kê chuyên sâu theo mốc thời gian đang chọn (Window Performance Grid) */}
      <div className="pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        {/* Vốn Đầu Kỳ */}
        <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-0.5">
          <span className="text-slate-500 block text-[11px] font-medium">Vốn Nạp Ban Đầu</span>
          <span className="text-slate-900 font-mono font-bold text-sm">
            {new Intl.NumberFormat('vi-VN').format(initCap)} đ
          </span>
          <span className="text-[10px] text-slate-400 block">Khởi tạo {fullPoints[0]?.displayDate}</span>
        </div>

        {/* NAV Hiện Tại / Cuối kỳ */}
        <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-200/80 space-y-0.5">
          <span className="text-blue-700 block text-[11px] font-medium">NAV Hiện Tại</span>
          <span className="text-blue-900 font-mono font-bold text-sm">
            {new Intl.NumberFormat('vi-VN').format(latestNav)} đ
          </span>
          <span className="text-[10px] text-blue-600 block">Phiên {activeStats?.endDate}</span>
        </div>

        {/* Lợi nhuận trong kỳ chọn */}
        <div className={`p-3 rounded-2xl border space-y-0.5 ${isPeriodProfit ? 'bg-emerald-50/60 border-emerald-200/80' : 'bg-rose-50/60 border-rose-200/80'}`}>
          <span className={`${isPeriodProfit ? 'text-emerald-700' : 'text-rose-700'} block text-[11px] font-medium`}>
            Hiệu Suất ({timeframe})
          </span>
          <span className={`${isPeriodProfit ? 'text-emerald-900' : 'text-rose-900'} font-mono font-bold text-sm`}>
            {activeStats && activeStats.periodPnlPct >= 0 ? '+' : ''}{activeStats?.periodPnlPct.toFixed(2)}%
          </span>
          <span className={`text-[10px] ${isPeriodProfit ? 'text-emerald-600' : 'text-rose-600'} block`}>
            {activeStats && activeStats.periodPnlCash >= 0 ? '+' : ''}{new Intl.NumberFormat('vi-VN').format(activeStats?.periodPnlCash ?? 0)} đ
          </span>
        </div>

        {/* Đỉnh Cao Nhất (Peak NAV) */}
        <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-0.5">
          <span className="text-amber-800 block text-[11px] font-medium flex items-center gap-1">
            <Award className="w-3 h-3 text-amber-600" />
            Đỉnh NAV Cao Nhất
          </span>
          <span className="text-amber-900 font-mono font-bold text-sm">
            {new Intl.NumberFormat('vi-VN').format(activeStats?.peakNav ?? latestNav)} đ
          </span>
          <span className="text-[10px] text-amber-700 block">Ngày {activeStats?.peakDate}</span>
        </div>

        {/* Sụt Giảm Tối Đa (Max Drawdown) */}
        <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-0.5">
          <span className="text-slate-600 block text-[11px] font-medium flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-slate-500" />
            Max Drawdown ({timeframe})
          </span>
          <span className="text-rose-700 font-mono font-bold text-sm">
            {activeStats?.minDd.toFixed(2)}%
          </span>
          <span className="text-[10px] text-slate-400 block">Kiểm soát rủi ro an toàn</span>
        </div>

        {/* Tỷ Trọng Phân Bổ Tiền/CP */}
        <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-0.5">
          <span className="text-slate-600 block text-[11px] font-medium flex items-center gap-1">
            <Layers className="w-3 h-3 text-blue-600" />
            Cơ Cấu Danh Mục
          </span>
          <span className="text-slate-900 font-mono font-bold text-sm">
            {stockRatio.toFixed(0)}% CP / {cashRatio.toFixed(0)}% Tiền
          </span>
          <span className="text-[10px] text-slate-400 block">{holdingsCount} mã đang nắm giữ</span>
        </div>
      </div>
    </div>
  );
};

export default PersonalEquityChart;
