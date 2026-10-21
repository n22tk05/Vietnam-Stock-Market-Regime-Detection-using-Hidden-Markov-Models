---
phase: 2
title: "Chuyển đổi Dashboard & Tích hợp Assessment Modal, Skeleton Loading, Stock Detail Modal"
status: completed
priority: P1
effort: "5h"
dependencies: [1]
---

# Phase 2: Chuyển đổi Dashboard & Tích hợp Assessment Modal, Skeleton Loading, Stock Detail Modal

## Overview
Chuyển đổi `key-trading-dashboard.html` thành `DashboardPage.tsx` dạng React component hoàn chỉnh, tích hợp bộ khảo sát khẩu vị rủi ro 4 bước (AssessmentModal) với hiệu ứng pháo hoa, Loading Skeleton cho các thẻ chỉ số và bảng dự báo, cùng cửa sổ chi tiết cổ phiếu chuyên sâu (StockDetailModal).

## Requirements
- **Functional**:
  - Xây dựng 3 Thẻ chỉ số cá nhân cốt lõi (NAV, P&L, Tiền mặt khả dụng).
  - Tích hợp biểu đồ tăng trưởng số tiền tài sản (TradingView Lightweight Charts) dạng React wrapper component.
  - Xây dựng Bảng dự báo biến động ngày mai 100% full-width với 4 cột hành động, bộ lọc (Tất cả, Mua, Giữ, Bán), và liên kết mở modal khi bấm vào mã CK.
  - Chuyển đổi `AssessmentModal` thành React component với state quản lý 4 bước, lưu trữ khẩu vị rủi ro vào Context/LocalStorage, và kích hoạt pháo hoa confetti khi hoàn tất.
  - Bổ sung hiệu ứng Loading Skeleton khi chuyển đổi mức vốn hoặc áp dụng kết quả khảo sát.
  - Xây dựng `StockDetailModal` hiển thị biểu đồ SVG 7 phiên, 4 chỉ số tài chính (P/E, ROE, RSI, Điểm Attention) và lý do HMM-PPO.
- **Non-functional**:
  - Đảm bảo tính toán an toàn vốn (không bao giờ để tiền mặt khả dụng âm).
  - Giao diện mượt mà, chuyển đổi trạng thái không giật lag.

## Related Code Files
- Create:
  - `frontend/src/pages/DashboardPage.tsx`
  - `frontend/src/features/assessment/AssessmentModal.tsx`
  - `frontend/src/features/assessment/useAssessment.ts`
  - `frontend/src/components/common/LoadingSkeleton.tsx`
  - `frontend/src/components/common/StockDetailModal.tsx`
  - `frontend/src/components/common/DisclaimerModal.tsx`
  - `frontend/src/components/charts/TradingViewAreaChart.tsx`
  - `frontend/src/components/dashboard/MetricsGrid.tsx`
  - `frontend/src/components/dashboard/ForecastTable.tsx`
  - `frontend/src/types/dashboard.ts`

## Implementation Steps
1. Xây dựng kiểu dữ liệu TypeScript trong `src/types/dashboard.ts` cho `StockItem`, `MetricCardData`, `AssessmentProfile`.
2. Tạo component `TradingViewAreaChart.tsx` nhúng thư viện `lightweight-charts`.
3. Xây dựng `MetricsGrid.tsx` hiển thị 3 thẻ tài sản kèm cờ kiểm soát `isLoading` để kích hoạt `LoadingSkeleton`.
4. Xây dựng `ForecastTable.tsx` hiển thị danh sách 10 mã cổ phiếu VN30, hỗ trợ lọc theo hành động và click mở chi tiết mã.
5. Triển khai `AssessmentModal.tsx` 4 bước với thư viện `canvas-confetti`.
6. Hoàn thiện `StockDetailModal.tsx` với vector SVG trend chart và 4 chỉ số tài chính.
7. Lắp ráp toàn bộ vào `DashboardPage.tsx` và đồng bộ state hạn mức vốn.

## Success Criteria
- [ ] Mở `/dashboard` hiển thị đầy đủ biểu đồ tài sản và bảng dự báo 10 mã VN30 100% full-width.
- [ ] Đổi hạn mức vốn kích hoạt hiệu ứng Skeleton Loading trong 300ms rồi cập nhật lại số tiền khớp lệnh chính xác.
- [ ] Bấm nút "Khảo sát rủi ro" mở modal 4 bước, hoàn tất nổ pháo hoa và cập nhật lại mức vốn vào Dashboard.
- [ ] Nhấp vào mã FPT, MWG, MBB... mở ra modal chi tiết đầy đủ đồ thị SVG và các chỉ số định lượng.
