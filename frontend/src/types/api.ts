export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export type RiskAppetite = 'LOW' | 'MEDIUM' | 'HIGH';
export type InvestmentHorizon = 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';

export type MarketRegimeCode = 'BULL' | 'BEAR' | 'SIDEWAY' | 'UNKNOWN';

export type RecommendationType = 'INITIAL' | 'RECALCULATION' | 'REBALANCE';
export type RecommendationStatus =
  | 'GENERATED'
  | 'CONFIRMED'
  | 'APPLIED'
  | 'DISMISSED'
  | 'EXPIRED'
  | 'FAILED';

export type PortfolioStatus = 'ACTIVE' | 'ARCHIVED';
export type PortfolioChangeType = 'INITIAL' | 'REBALANCE' | 'MANUAL_RECALCULATION';

export type NotificationStatus = 'UNREAD' | 'READ' | 'APPLIED' | 'DISMISSED';

export interface ApiMeta {
  requestId?: string;
  timestamp?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
  meta?: ApiMeta;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface UserRead {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserUpdatePayload {
  email?: string;
  fullName?: string;
}

export interface UserPreferenceRead {
  id: string;
  userId: string;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferenceUpdatePayload {
  emailNotifications?: boolean;
  inAppNotifications?: boolean;
  language?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'bearer';
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

export interface AuthSessionRead {
  user: UserRead;
  tokens: TokenPair;
}

export interface MessageRead {
  message: string;
}

export interface InvestmentProfileRead {
  id: string;
  userId: string;
  capital: number | string;
  riskAppetite: RiskAppetite;
  investmentHorizon: InvestmentHorizon;
  expectedReturn: number | string;
  maximumDrawdown: number | string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentProfileCreatePayload {
  capital: number;
  riskAppetite: RiskAppetite;
  investmentHorizon: InvestmentHorizon;
  expectedReturn: number;
  maximumDrawdown: number;
}

export interface InvestmentProfileUpdatePayload {
  capital?: number;
  riskAppetite?: RiskAppetite;
  investmentHorizon?: InvestmentHorizon;
  expectedReturn?: number;
  maximumDrawdown?: number;
}

export interface MarketRegimeView {
  id: string;
  code: MarketRegimeCode;
  name: string;
  description?: string | null;
  probability?: number | null;
  detectedAt: string;
  dataDate?: string | null;
  modelVersion?: string | null;
  isCurrent: boolean;
  metadata?: Record<string, unknown>;
}

export interface RecommendationAllocationResponse {
  id: string;
  stockId: string;
  symbol: string;
  companyName: string;
  exchange: string;
  sector?: string | null;
  weight: number | string;
  amount: number | string;
  referencePrice: number | string;
  quantityEstimated: number | string;
  reason: string;
  rank: number;
}

export interface RecommendationResponse {
  id: string;
  investmentProfileId: string;
  regimeId: string;
  regime: string;
  type: RecommendationType;
  status: RecommendationStatus;
  capital: number | string;
  riskAppetite: RiskAppetite;
  investmentHorizon: InvestmentHorizon;
  hmmModelVersion?: string | null;
  portfolioModelVersion: string;
  totalWeight: number | string;
  cashWeight: number | string;
  cashAmount: number | string;
  explanation: string;
  expiresAt: string;
  generatedAt: string;
  confirmedAt?: string | null;
  allocations: RecommendationAllocationResponse[];
  disclaimer: string;
}

export interface RecommendationSummaryResponse {
  id: string;
  regime: string;
  type: RecommendationType;
  status: RecommendationStatus;
  capital: number | string;
  cashWeight: number | string;
  generatedAt: string;
  expiresAt: string;
  confirmedAt?: string | null;
}

export interface RecommendationListResponse {
  items: RecommendationSummaryResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PortfolioAllocationResponse {
  id: string;
  stockId: string;
  symbol: string;
  companyName: string;
  weight: number | string;
  investedAmount: number | string;
  entryPrice: number | string;
  estimatedQuantity: number | string;
}

export interface PortfolioVersionResponse {
  id: string;
  recommendationId?: string | null;
  versionNumber: number;
  changeType: PortfolioChangeType;
  regimeId: string;
  regime: string;
  totalValue: number | string;
  cashWeight: number | string;
  cashAmount: number | string;
  effectiveAt: string;
  allocations: PortfolioAllocationResponse[];
}

export interface PortfolioResponse {
  id: string;
  name: string;
  status: PortfolioStatus;
  currentVersion: number;
  initialCapital: number | string;
  currentValue: number | string;
  confirmedAt: string;
  createdAt: string;
  updatedAt: string;
  version: PortfolioVersionResponse;
  disclaimer: string;
}

export interface PortfolioVersionSummaryResponse {
  id: string;
  recommendationId?: string | null;
  versionNumber: number;
  changeType: PortfolioChangeType;
  regime: string;
  totalValue: number | string;
  cashWeight: number | string;
  effectiveAt: string;
}

export interface PortfolioVersionsResponse {
  items: PortfolioVersionSummaryResponse[];
}

export interface PortfolioPositionPerformance {
  symbol: string;
  estimatedQuantity: number | string;
  entryPrice: number | string;
  currentReferencePrice?: number | string | null;
  investedAmount: number | string;
  estimatedValue?: number | string | null;
  profitLoss?: number | string | null;
  pnlPercent?: number | string | null;
}

export interface PortfolioPerformanceResponse {
  portfolioId: string;
  asOfDate: string;
  initialCapital: number | string;
  estimatedTotalValue: number | string;
  cashAmount: number | string;
  profitLoss: number | string;
  pnlPercent: number | string;
  positions: PortfolioPositionPerformance[];
  missingSymbols: string[];
  dataSource: string;
  disclaimer: string;
}

export interface StockFeatureView {
  featureDate: string;
  logReturn?: number | string | null;
  return5d?: number | string | null;
  return20d?: number | string | null;
  volumeRatio?: number | string | null;
  volatility20d?: number | string | null;
  sharpeRatio?: number | string | null;
  referencePrice?: number | string | null;
  metadata?: Record<string, unknown>;
}

export interface StockView {
  id: string;
  symbol: string;
  companyName: string;
  exchange: string;
  sector?: string | null;
  industry?: string | null;
  isActive: boolean;
  latestFeatures?: StockFeatureView | null;
  metadata?: Record<string, unknown>;
}

export type HistoryRange = '1m' | '3m' | '6m' | '1y' | '3y' | '5y' | 'max';
export type HistoryInterval = '1d' | '1wk' | '1mo';

export interface StockPricePoint {
  tradeDate: string;
  openPrice: number | string;
  highPrice: number | string;
  lowPrice: number | string;
  closePrice: number | string;
  volume: number;
}

export interface StockHistoryView {
  symbol: string;
  interval: HistoryInterval;
  startDate?: string | null;
  endDate?: string | null;
  source: string;
  prices: StockPricePoint[];
}

export interface NotificationResponse {
  id: string;
  type: string;
  title: string;
  summary: string;
  recommendationId?: string | null;
  portfolioId?: string | null;
  status: NotificationStatus;
  readAt?: string | null;
  actionedAt?: string | null;
  emailSentAt?: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  items: NotificationResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export interface NotificationActionResponse {
  notification: NotificationResponse;
  portfolio?: PortfolioResponse | null;
}

export interface HistoryItemResponse {
  id: string;
  recordType: 'RECOMMENDATION';
  recommendationType: RecommendationType;
  status: RecommendationStatus;
  regime: string;
  capital: number | string;
  generatedAt: string;
  confirmedAt?: string | null;
}

export interface HistoryListResponse {
  historyScope: 'RECOMMENDATION_HISTORY';
  items: HistoryItemResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export interface HistoryDetailResponse {
  historyScope: 'RECOMMENDATION_HISTORY';
  recommendation: RecommendationResponse;
}
