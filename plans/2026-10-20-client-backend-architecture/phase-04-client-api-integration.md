---
phase: 4
title: "Tích hợp Tầng Service API Client & Kết Nối Toàn Diện Client-Server"
status: pending
priority: P1
effort: "3h"
dependencies: [2, 3]
---

# Phase 4: Tích hợp Tầng Service API Client & Kết Nối Toàn Diện Client-Server

## Overview
Xây dựng tầng dịch vụ kết nối HTTP trên Client (Axios / Fetch Client), thay thế toàn bộ dữ liệu mock cứng bằng dữ liệu thực được lấy từ FastAPI backend (`http://localhost:8000`), đồng thời kiểm thử toàn trình End-to-End từ Landing Page sang Dashboard.

## Requirements
- **Functional**:
  - Tạo `src/services/api-client.ts` xử lý baseURL, timeout, và interceptor bắt lỗi mạng.
  - Tạo các service cụ thể: `recommendationService`, `marketService`, `stockService`.
  - Thay thế mock data trong `DashboardPage.tsx` bằng custom hook `useDashboardData(capital)` gọi API `/api/recommendation` và `/api/history`.
  - Kết nối `StockDetailModal` với endpoint `/api/stocks/{symbol}` khi người dùng click vào một mã cổ phiếu.
  - Xử lý giao diện khi mất mạng hoặc backend chưa khởi động qua component `ErrorState` có nút "Thử lại".
- **Non-functional**:
  - Trải nghiệm mượt mà, thời gian phản hồi nhanh dưới 300ms.
  - Fallback an toàn nếu backend gặp sự cố.

## Related Code Files
- Create:
  - `frontend/src/services/api-client.ts`
  - `frontend/src/services/recommendation-service.ts`
  - `frontend/src/services/market-service.ts`
  - `frontend/src/services/stock-service.ts`
  - `frontend/src/hooks/useDashboardData.ts`
  - `frontend/src/components/common/ErrorState.tsx`
- Modify:
  - `frontend/src/pages/DashboardPage.tsx`
  - `frontend/src/components/common/StockDetailModal.tsx`

## Implementation Steps
1. Cài đặt thư viện `axios` vào dự án `frontend/`.
2. Tạo `api-client.ts` cấu hình kết nối tới `http://localhost:8000`.
3. Viết các hàm gọi API trong `recommendation-service.ts` và `stock-service.ts`.
4. Viết custom hook `useDashboardData.ts` quản lý state: `data`, `isLoading`, `isError`, tự động kích hoạt lại khi `capital` thay đổi.
5. Gắn hook vào `DashboardPage.tsx`, kết nối với Skeleton Loading và biểu đồ TradingView.
6. Kiểm thử tích hợp toàn trình Client - Server: chạy song song FastAPI và Vite dev server.

## Success Criteria
- [ ] Chạy song song Client (`npm run dev`) và Server (`python ai_core/ai_server.py`).
- [ ] Dashboard tải dữ liệu thật từ mô hình PPO của FastAPI thay vì dữ liệu fix cứng.
- [ ] Khi chọn đổi hạn mức vốn (ví dụ từ 100M sang 250M), Client gửi request `/api/recommendation?capital=250000000` và hiển thị kết quả phân bổ số lô cổ phiếu chuẩn xác.
- [ ] Nhấp vào từng mã cổ phiếu trên bảng hiển thị thông tin thực tế từ backend.
- [ ] Build production của frontend (`npm run build`) thành công 100%.
