import type { InvestmentHorizon, MarketRegimeCode, RecommendationStatus, RecommendationType, RiskAppetite } from '@/types/api';

/**
 * Formats a number or numeric string as VND currency.
 */
export function formatVND(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '0 VNĐ';
  const numericValue = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericValue)) return '0 VNĐ';

  const formatted = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(numericValue);
  
  return formatted.replace(/[₫đ]/g, 'VNĐ');
}

/**
 * Formats weight/rate to percentage string.
 * Automatically handles decimal values (0.25 -> 25%) and values already in percent (25 -> 25%).
 */
export function formatPercent(value: number | string | null | undefined, digits: number = 2): string {
  if (value === null || value === undefined || value === '') return '0%';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0%';

  const percentage = num;
  return `${percentage.toFixed(digits)}%`;
}

/**
 * Formats PnL with explicit '+' sign for positive profit.
 */
export function formatPnL(amount: number | string | null | undefined): { text: string; isPositive: boolean; isNegative: boolean } {
  if (amount === null || amount === undefined || amount === '') {
    return { text: '0 VNĐ', isPositive: false, isNegative: false };
  }
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num) || num === 0) {
    return { text: '0 VNĐ', isPositive: false, isNegative: false };
  }

  const formatted = formatVND(Math.abs(num));
  const sign = num > 0 ? '+' : '-';
  return {
    text: `${sign}${formatted}`,
    isPositive: num > 0,
    isNegative: num < 0,
  };
}

/**
 * Formats date ISO string to Vietnamese localized date string (e.g., "29/07/2026").
 */
export function formatDate(isoDate: string | Date | null | undefined): string {
  if (!isoDate) return 'N/A';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return 'N/A';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Formats datetime ISO string to localized string with time (e.g., "14:30 29/07/2026").
 */
export function formatDateTime(isoDate: string | Date | null | undefined): string {
  if (!isoDate) return 'N/A';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return 'N/A';

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Friendly Risk Appetite display labels
 */
export function getRiskAppetiteLabel(risk: RiskAppetite | string | undefined): string {
  switch (risk) {
    case 'LOW':
      return 'Thận trọng (Low)';
    case 'MEDIUM':
      return 'Cân bằng (Medium)';
    case 'HIGH':
      return 'Tăng trưởng (High)';
    default:
      return risk || 'Chưa chọn';
  }
}

/**
 * Friendly Investment Horizon display labels
 */
export function getHorizonLabel(horizon: InvestmentHorizon | string | undefined): string {
  switch (horizon) {
    case 'SHORT_TERM':
      return 'Ngắn hạn (1-3 năm)';
    case 'MEDIUM_TERM':
      return 'Trung hạn (3-5 năm)';
    case 'LONG_TERM':
      return 'Dài hạn (5+ năm)';
    default:
      return horizon || 'Chưa chọn';
  }
}

/**
 * Friendly Market Regime display metadata
 */
export function getRegimeMeta(code: MarketRegimeCode | string | undefined) {
  switch (code) {
    case 'BULL':
      return {
        label: 'Thị trường Tăng (Bull)',
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotBg: 'bg-emerald-500',
        gradient: 'from-emerald-500 to-teal-600',
        desc: 'Xu hướng tăng trưởng tích cực, ưu tiên phân bổ tỷ trọng cổ phiếu cao để tối đa hóa lợi nhuận.',
      };
    case 'BEAR':
      return {
        label: 'Thị trường Giảm (Bear)',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
        dotBg: 'bg-rose-500',
        gradient: 'from-rose-500 to-red-600',
        desc: 'Áp lực giảm mạnh, khuyến nghị tăng tỷ trọng tiền mặt và phòng thủ tài sản.',
      };
    case 'SIDEWAY':
      return {
        label: 'Thị trường Đi ngang (Sideway)',
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
        dotBg: 'bg-amber-500',
        gradient: 'from-amber-500 to-orange-500',
        desc: 'Biến động tích lũy trong biên độ, cân bằng danh mục và theo dõi tín hiệu bứt phá.',
      };
    default:
      return {
        label: 'Chưa xác định (Unknown)',
        badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
        dotBg: 'bg-slate-400',
        gradient: 'from-slate-500 to-slate-700',
        desc: 'Dữ liệu thị trường đang được cập nhật.',
      };
  }
}

/**
 * Recommendation Type friendly label
 */
export function getRecommendationTypeLabel(type: RecommendationType | string): string {
  switch (type) {
    case 'INITIAL':
      return 'Danh mục Khởi tạo';
    case 'RECALCULATION':
      return 'Tính toán lại';
    case 'REBALANCE':
      return 'Tái cân bằng (Rebalance)';
    default:
      return type;
  }
}

/**
 * Recommendation Status friendly badge
 */
export function getRecommendationStatusMeta(status: RecommendationStatus | string) {
  switch (status) {
    case 'GENERATED':
      return { label: 'Chờ xác nhận', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'CONFIRMED':
      return { label: 'Đã xác nhận', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'APPLIED':
      return { label: 'Đã áp dụng', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'DISMISSED':
      return { label: 'Đã bỏ qua', bg: 'bg-slate-100 text-slate-600 border-slate-200' };
    case 'EXPIRED':
      return { label: 'Đã hết hạn', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'FAILED':
      return { label: 'Lỗi khởi tạo', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
    default:
      return { label: status, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
}
