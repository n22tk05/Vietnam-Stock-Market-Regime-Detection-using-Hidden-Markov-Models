import type { ApiErrorDetail, ApiSuccessResponse, TokenPair } from '@/types/api';

const DEFAULT_BASE_URL = 'http://localhost:8000/api/v1';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE_URL;

const TOKEN_STORAGE_KEY = 'wealth4ward_access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'wealth4ward_refresh_token';
const REMEMBER_ME_STORAGE_KEY = 'wealth4ward_remember_me';
const EXPIRES_AT_STORAGE_KEY = 'wealth4ward_access_token_expires_at';

export function isRememberMe(): boolean {
  const val = localStorage.getItem(REMEMBER_ME_STORAGE_KEY);
  return val === null ? true : val === 'true';
}

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) || sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function storeTokens(tokens: TokenPair, rememberMe: boolean = true): void {
  const targetStorage = rememberMe ? localStorage : sessionStorage;
  const altStorage = rememberMe ? sessionStorage : localStorage;

  // Clean alt storage to avoid stale tokens
  altStorage.removeItem(TOKEN_STORAGE_KEY);
  altStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  altStorage.removeItem(EXPIRES_AT_STORAGE_KEY);

  targetStorage.setItem(TOKEN_STORAGE_KEY, tokens.accessToken);
  targetStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokens.refreshToken);
  if (tokens.accessTokenExpiresAt) {
    targetStorage.setItem(EXPIRES_AT_STORAGE_KEY, tokens.accessTokenExpiresAt);
  }
  localStorage.setItem(REMEMBER_ME_STORAGE_KEY, String(rememberMe));
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(EXPIRES_AT_STORAGE_KEY);
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(EXPIRES_AT_STORAGE_KEY);
}

export class ApiError extends Error implements ApiErrorDetail {
  code: string;
  details?: unknown;
  status: number;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    Object.setPrototypeOf(this, ApiError.prototype);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Queue for pending requests during token refresh
let isRefreshing = false;
let refreshSubscribers: ((newToken: string | null) => void)[] = [];

function subscribeTokenRefresh(cb: (newToken: string | null) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(newToken: string | null) {
  refreshSubscribers.map((cb) => cb(newToken));
  refreshSubscribers = [];
}

export async function performTokenRefresh(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    clearTokens();
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      return null;
    }

    const resJson = await response.json();
    if (resJson.success && resJson.data) {
      const tokens: TokenPair = resJson.data;
      const remember = isRememberMe();
      storeTokens(tokens, remember);
      return tokens.accessToken;
    } else {
      clearTokens();
      return null;
    }
  } catch {
    clearTokens();
    return null;
  }
}

/**
 * Ensures a valid unexpired access token exists.
 * If expired or expiring soon, refreshes it automatically before request.
 */
export async function ensureValidAccessToken(): Promise<string | null> {
  const token = getStoredAccessToken();
  const refreshToken = getStoredRefreshToken();

  if (!refreshToken && !token) {
    return null;
  }

  const expiresAtStr =
    localStorage.getItem(EXPIRES_AT_STORAGE_KEY) || sessionStorage.getItem(EXPIRES_AT_STORAGE_KEY);

  let isExpiredOrClose = !token;
  if (expiresAtStr) {
    const expiresAt = new Date(expiresAtStr).getTime();
    const now = Date.now();
    // Proactively refresh if token expires in less than 3 minutes
    if (expiresAt - now < 3 * 60 * 1000) {
      isExpiredOrClose = true;
    }
  }

  if (isExpiredOrClose && refreshToken) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await performTokenRefresh();
      isRefreshing = false;
      onRefreshed(newToken);
      return newToken || token;
    } else {
      return new Promise<string | null>((resolve) => {
        subscribeTokenRefresh((newToken) => {
          resolve(newToken || token);
        });
      });
    }
  }

  return token;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry: boolean = false
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const isAuthEndpoint =
    endpoint.includes('/auth/login') ||
    endpoint.includes('/auth/register') ||
    endpoint.includes('/auth/refresh') ||
    endpoint.includes('/auth/forgot-password') ||
    endpoint.includes('/auth/reset-password');

  // For protected endpoints, proactively ensure the token is valid & unexpired
  let token = getStoredAccessToken();
  if (!isAuthEndpoint && getStoredRefreshToken()) {
    token = await ensureValidAccessToken();
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && !isRetry && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await performTokenRefresh();
      isRefreshing = false;
      onRefreshed(newToken);

      if (newToken) {
        return apiRequest<T>(endpoint, options, true);
      } else {
        try {
          window.dispatchEvent(new CustomEvent('wealth4ward:unauthorized'));
        } catch {
          // ignore in environments without CustomEvent
        }
        throw new ApiError(401, 'AUTH_TOKEN_EXPIRED', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
    } else {
      return new Promise<T>((resolve, reject) => {
        subscribeTokenRefresh((newToken) => {
          if (newToken) {
            resolve(apiRequest<T>(endpoint, options, true));
          } else {
            reject(new ApiError(401, 'AUTH_TOKEN_EXPIRED', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'));
          }
        });
      });
    }
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(response.status, 'INVALID_RESPONSE', 'Phản hồi từ server không hợp lệ');
  }

  if (!response.ok || data.success === false) {
    const errorDetail = data.error || {};
    const code = errorDetail.code || `HTTP_${response.status}`;
    let message = errorDetail.message;
    if (code === 'AUTHENTICATION_REQUIRED' || code === 'INVALID_CREDENTIALS' || message === 'Invalid email or password') {
      message = 'Email hoặc mật khẩu không chính xác. Nếu chưa có tài khoản, vui lòng Đăng ký.';
    } else if (!message) {
      message = getFriendlyErrorMessage(code, response.status);
    }
    throw new ApiError(response.status, code, message, errorDetail.details);
  }

  return (data as ApiSuccessResponse<T>).data;
}

export function getFriendlyErrorMessage(code: string, status: number): string {
  switch (code) {
    case 'AI_CORE_UNAVAILABLE':
      return 'Hệ thống phân tích thị trường AI đang tạm thời không khả dụng. Vui lòng thử lại sau.';
    case 'RECOMMENDATION_EXPIRED':
      return 'Đề xuất này đã hết hạn. Vui lòng tính lại danh mục mới.';
    case 'PORTFOLIO_NOT_FOUND':
      return 'Bạn chưa có danh mục đầu tư nào.';
    case 'INVESTMENT_PROFILE_NOT_FOUND':
      return 'Chưa tìm thấy hồ sơ đầu tư. Vui lòng thiết lập hồ sơ đầu tư.';
    case 'AUTH_TOKEN_EXPIRED':
    case 'AUTHENTICATION_REQUIRED':
      return 'Email hoặc mật khẩu không chính xác hoặc phiên đăng nhập đã hết hạn.';
    case 'INVALID_CREDENTIALS':
      return 'Email hoặc mật khẩu không chính xác.';
    case 'EMAIL_ALREADY_REGISTERED':
      return 'Địa chỉ email này đã được đăng ký tài khoản.';
    case 'VALIDATION_ERROR':
      return 'Thông tin nhập vào chưa đúng định dạng. Vui lòng kiểm tra lại.';
    default:
      if (status === 404) return 'Không tìm thấy dữ liệu yêu cầu.';
      if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
      if (status >= 500) return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
      return 'Đã xảy ra lỗi không xác định.';
  }
}
