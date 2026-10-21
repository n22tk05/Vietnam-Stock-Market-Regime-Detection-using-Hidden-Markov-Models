---
title: "Chuyển Đổi AI QUANTUM Thành Hệ Thống Fullstack: Client SPA (React+Vite) & Backend API (FastAPI)"
status: in-progress
created: 2026-10-20
updated: 2026-10-20
phases:
  - id: 1
    file: phase-01-client-scaffolding-landing.md
    title: "Khởi tạo Client SPA (Vite + React + TailwindCSS) & Chuyển đổi Landing Page"
    status: completed
  - id: 2
    file: phase-02-client-dashboard-assessment.md
    title: "Chuyển đổi Dashboard & Tích hợp Assessment Modal, Skeleton Loading, Stock Detail Modal"
    status: completed
  - id: 3
    file: phase-03-backend-fastapi-service.md
    title: "Nâng cấp Backend FastAPI Service (PPO Inference, Ticker Catalog, Market Regime API)"
    status: pending
  - id: 4
    file: phase-04-client-api-integration.md
    title: "Tích hợp Tầng Service API Client & Kết Nối Toàn Diện Client-Server"
    status: pending
---

# Kế Hoạch Chuyển Đổi AI QUANTUM Sang Kiến Trúc Client & Server

## 1. Tổng quan Dự Án (Executive Summary)
Chuyển đổi toàn bộ giao diện HTML tĩnh hiện tại (`landing-page.html` và `key-trading-dashboard.html`) tại `_bmad-output/planning-artifacts/ux-designs/ux-ai-quantum-2026-10-18/mockups/` thành một ứng dụng hoàn chỉnh:
- **Client (Frontend)**: Xây dựng ứng dụng Single Page Application (SPA) hiện đại bằng **React 19 + TypeScript + Vite 8 + TailwindCSS 4**, kế thừa cấu trúc module hoá chuẩn từ `c:\Users\ADMIN\Desktop\4WARD\frontend`.
- **Server (Backend)**: Nâng cấp dịch vụ FastAPI sẵn có (`ai_core/ai_server.py`) thành hệ thống RESTful API hoàn chỉnh kết nối trực tiếp với mô hình AI (`HMM-PPO`), cung cấp dữ liệu thị trường thực tế, danh mục khuyến nghị theo vốn và thông số định lượng từng mã cổ phiếu.

---

## 2. Lộ Trình Phân Kỳ (Phases Roadmap)

| Pha | Tên Giai Đoạn | Trọng Tâm | Tệp Cần Tạo / Chỉnh Sửa |
| :--- | :--- | :--- | :--- |
| **Pha 1** | Khởi tạo Client SPA & Landing Page | Thiết lập dự án React+Vite, cấu hình TailwindCSS, tạo Layout chung (Header, Footer), chuyển đổi toàn bộ `landing-page.html` thành các React components. | `frontend/package.json`, `frontend/src/features/landing/*` |
| **Pha 2** | Dashboard & Modal Tương Tác | Xây dựng trang Dashboard với 3 thẻ chỉ số tài sản, Bảng dự báo biến động ngày mai 100% full-width, Assessment Modal 4 bước kèm Confetti, Loading Skeleton, và Stock Detail View modal. | `frontend/src/pages/DashboardPage.tsx`, `frontend/src/features/assessment/*`, `frontend/src/components/*` |
| **Pha 3** | Nâng cấp Backend FastAPI | Mở rộng `ai_core/ai_server.py`: thêm các endpoint `/api/market/regime`, `/api/stocks`, `/api/stocks/{symbol}`, `/api/history`, đồng thời chuẩn hoá cấu trúc dữ liệu JSON và kiểm soát an toàn vốn. | `ai_core/ai_server.py`, `ai_core/helper/api_models.py` |
| **Pha 4** | Kết Nối Toàn Diện Client - Server | Tạo tầng dịch vụ API client (`api-client.ts`, `recommendation-service.ts`, `stock-service.ts`), kết nối state của Dashboard và Assessment Modal với FastAPI backend, kiểm thử toàn trình. | `frontend/src/services/*`, `frontend/src/hooks/*` |

---

## 3. Tiêu Chí Nghiệm Thu (Success Criteria)
- [ ] Ứng dụng Client chạy mượt mà trên Vite dev server (`http://localhost:5173`), build production không lỗi TypeScript/ESLint.
- [ ] Landing Page và Dashboard hiển thị 100% tiếng Việt có dấu chuẩn, không vỡ layout trên cả Desktop lẫn Mobile.
- [ ] Modal Khảo sát khẩu vị rủi ro 4 bước hoạt động trơn tru, nổ pháo hoa canvas-confetti và lưu profile người dùng.
- [ ] Dashboard có hiệu ứng Loading Skeleton khi đổi hạn mức vốn hoặc lọc cổ phiếu.
- [ ] Backend FastAPI (`http://localhost:8000`) phản hồi sub-second cho cả 10 mã VN30 và tính toán tỷ trọng an toàn vốn tuyệt đối.
