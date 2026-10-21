---
phase: 3
title: "Nâng cấp Backend FastAPI Service (PPO Inference, Ticker Catalog, Market Regime API)"
status: pending
priority: P1
effort: "4h"
dependencies: []
---

# Phase 3: Nâng cấp Backend FastAPI Service (PPO Inference, Ticker Catalog, Market Regime API)

## Overview
Mở rộng dịch vụ FastAPI hiện tại (`ai_core/ai_server.py`) thành một backend microservice hoàn chỉnh: cung cấp các endpoint RESTful để phục vụ đầy đủ dữ liệu cho Client (Dự báo ngày mai, Danh mục cổ phiếu, Trạng thái vĩ mô HMM Regime, Lịch sử tăng trưởng NAV).

## Requirements
- **Functional**:
  - Tối ưu hóa endpoint `/api/recommendation` hiện có: trả về đầy đủ 10 mã cổ phiếu kèm giá hiện tại, giá mục tiêu, ngưỡng cắt lỗ an toàn và lý do định lượng HMM-PPO.
  - Thêm endpoint `/api/market/regime`: trả về trạng thái vĩ mô (Bull/Bear/Sideway), độ tin cậy mô hình (%), điểm số VN-Index và lời khuyên chiến lược.
  - Thêm endpoint `/api/stocks`: danh sách đầy đủ các mã cổ phiếu kèm thông số cơ bản (P/E, ROE, RSI, Điểm Attention).
  - Thêm endpoint `/api/stocks/{symbol}`: chi tiết chuyên sâu và lịch sử giá ngắn hạn của một mã cổ phiếu.
  - Thêm endpoint `/api/history`: chuỗi dữ liệu tăng trưởng NAV phục vụ biểu đồ TradingView.
- **Non-functional**:
  - Tốc độ phản hồi API dưới 100ms nhờ cache dữ liệu trong bộ nhớ (`CACHE`).
  - Hỗ trợ CORS đầy đủ cho Vite frontend (`http://localhost:5173`).
  - Tuân thủ quy chuẩn mã lỗi HTTP chuẩn (400, 404, 500) và schema Pydantic rõ ràng.

## Related Code Files
- Modify:
  - `ai_core/ai_server.py`
- Create:
  - `ai_core/schemas.py`
  - `ai_core/services/stock_service.py`
  - `ai_core/services/market_service.py`

## Implementation Steps
1. Tạo file `ai_core/schemas.py` định nghĩa các Pydantic models: `StockForecastItem`, `RecommendationResponse`, `MarketRegimeResponse`, `StockDetailResponse`, `HistoryPoint`.
2. Tạo module `market_service.py` đọc kết quả từ `output/hmm_model/master_meta_predictions.csv` và `output/hmm_model/market_hmm_results.csv` để phục vụ API Regime.
3. Tạo module `stock_service.py` tổng hợp 50 đặc trưng kỹ thuật và trọng số Attention của 10 mã cổ phiếu VN30.
4. Cập nhật `ai_core/ai_server.py`: bổ sung các router endpoints mới và chuẩn hoá response JSON.
5. Kiểm thử các endpoints bằng công cụ Swagger UI tự động tại `http://localhost:8000/docs`.

## Success Criteria
- [ ] Chạy `python ai_core/ai_server.py` khởi động thành công FastAPI server trên cổng 8000.
- [ ] Truy cập `http://localhost:8000/docs` hiển thị đầy đủ và test thành công các endpoint:
  - `GET /api/recommendation?capital=100000000`
  - `GET /api/market/regime`
  - `GET /api/stocks`
  - `GET /api/stocks/FPT`
  - `GET /api/history`
- [ ] Dữ liệu trả về đúng định dạng JSON, không có lỗi chuyển đổi kiểu số `numpy`.
