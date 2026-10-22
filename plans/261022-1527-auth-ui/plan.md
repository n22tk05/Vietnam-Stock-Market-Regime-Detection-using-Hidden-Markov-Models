---
title: "Kế Hoạch Thiết Kế & Triển Khai Giao Diện Đăng Nhập Người Dùng AI QUANTUM"
description: "Thiết kế giao diện đăng nhập hiện đại dạng Split-Screen, chuẩn hóa thương hiệu AI QUANTUM và kết nối hệ thống xác thực JWT an toàn"
status: pending
priority: P1
effort: "5h"
tags: ["auth", "frontend", "ui-ux", "react"]
created: 2026-10-22
phases:
  - id: 1
    file: phase-01-start.md
    title: "Thiết Kế & Tái Cấu Trúc Giao Diện Đăng Nhập AI QUANTUM (Split Screen Visual)"
    status: completed
  - id: 2
    file: phase-02-auth-integration-state.md
    title: "Tích Hợp Xác Thực AuthContext, Lưu Trữ Token & Chuyển Hướng Dashboard"
    status: completed
---

# Kế Hoạch Thiết Kế & Triển Khai Giao Diện Đăng Nhập AI QUANTUM

## 1. Tổng Quan (Executive Summary)
Hiện tại trang đăng nhập (`frontend/src/pages/auth/LoginPage.tsx`) vừa được chuyển từ `4WARD` sang đang mang thương hiệu cũ (Wealth4ward), bố cục đơn giản chưa làm nổi bật được giá trị công nghệ định lượng của **AI QUANTUM Terminal v7.0**. 

Kế hoạch này sẽ:
1. **Thiết kế lại giao diện Đăng Nhập đẳng cấp Split-Screen**:
   - Cột trái: Giới thiệu hệ sinh thái AI QUANTUM, các số liệu hiệu suất thực tế (+58.06% YTD, Sharpe 2.18, 10 mã VN30), huy hiệu mô hình Markov HMM-PPO.
   - Cột phải: Form đăng nhập thanh lịch, tối ưu trải nghiệm, ẩn/hiện mật khẩu, ghi nhớ phiên làm việc, hỗ trợ đăng nhập Demo 1 chạm.
2. **Chuẩn hóa nhận diện & tích hợp xác thực**:
   - 100% tiếng Việt có dấu, không emoji trong chuỗi hiển thị.
   - Kết nối với `AuthContext` và `authService`, lưu token JWT vào cookie/localStorage an toàn và tự động chuyển hướng vào `/dashboard`.

---

## 2. Các Giai Đoạn Triển Khai (Phases Roadmap)

| Giai Đoạn | Tên Giai Đoạn | Mục Tiêu & Trọng Tâm | Tệp Cần Chỉnh Sửa |
| :--- | :--- | :--- | :--- |
| **Pha 1** | [Thiết Kế Split-Screen & UI Showcase](./phase-01-start.md) | Xây dựng layout 2 cột hiện đại, thiết kế panel bên trái giới thiệu mô hình định lượng AI, thiết kế form bên phải với nút ẩn/hiện mật khẩu và hỗ trợ responsive di động. | `frontend/src/pages/auth/LoginPage.tsx` |
| **Pha 2** | [Tích Hợp Auth & Điều Hướng](./phase-02-auth-integration-state.md) | Kết nối API Backend `/api/v1/auth/login`, xử lý lưu token, cơ chế "Ghi nhớ tôi", thêm nút "Trải nghiệm bản Demo" 1-click và tự động chuyển hướng vào `/dashboard`. | `frontend/src/pages/auth/LoginPage.tsx`, `frontend/src/context/AuthContext.tsx` |

---

## 3. Tiêu Chí Nghiệm Thu (Success Criteria)
- [ ] Giao diện mang đúng thương hiệu **AI QUANTUM Terminal** với màu sắc chủ đạo xanh công nghệ (`#2563EB`) và nền sang trọng.
- [ ] Không còn bất kỳ dấu vết nào của thương hiệu cũ "Wealth4ward".
- [ ] Hiển thị hoàn hảo trên cả màn hình máy tính (2 cột) và điện thoại (1 cột).
- [ ] Đăng nhập thành công lưu token và chuyển hướng ngay vào Dashboard.
- [ ] Có nút "Đăng nhập bản Demo (1-Click Demo)" cho phép người dùng vào thử nghiệm ngay mà không cần nhập liệu.
- [ ] Kiểm tra lệnh `npx tsc --noEmit` đạt 0 lỗi.
