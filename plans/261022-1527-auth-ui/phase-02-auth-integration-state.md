---
phase: 2
title: "Tích Hợp Xác Thực AuthContext, Lưu Trữ Token & Chuyển Hướng Dashboard"
status: completed
priority: P1
effort: "2h"
dependencies: [1]
---

# Phase 2: Tích Hợp Xác Thực AuthContext, Lưu Trữ Token & Chuyển Hướng Dashboard

## Overview
Kết nối form đăng nhập với tầng `authService` và `AuthContext`, xử lý lưu JWT token an toàn vào localStorage / sessionStorage theo cờ `rememberMe`, đồng thời tự động chuyển hướng người dùng vào `/dashboard` sau khi đăng nhập thành công.

## Requirements
- **Functional**:
  - Khi submit form, gọi `authService.login({ email, password }, rememberMe)`.
  - Hiển thị spinner/trạng thái đang xử lý (`isSubmitting = true`) để chống spam click đúp.
  - Xử lý các lỗi từ Backend trả về (401 Sai mật khẩu, 404 Không tìm thấy tài khoản, 422 Sai định dạng) và hiển thị thông báo tiếng Việt thân thiện.
  - Đăng nhập thành công -> lưu session, cập nhật `user` vào `AuthContext` và điều hướng về `/dashboard` (hoặc trang trước đó nếu bị redirect).
  - Tích hợp thêm nút "Dùng thử tài khoản Demo" (1-click demo login) để khách hàng trải nghiệm ngay Dashboard mà không bắt buộc tạo tài khoản trước.
- **Non-functional**:
  - Bảo mật: Không lưu plaintext password vào bất kỳ state lâu dài nào.
  - Zero TypeScript error (`npx tsc --noEmit`).

## Architecture
- Luồng dữ liệu: `LoginPage.tsx` -> `authService.login` -> `api-client.ts` -> Backend API (`POST /api/v1/auth/login`) -> `storeTokens` -> `AuthContext` -> `navigate('/dashboard')`.

## Related Code Files
- Modify: `frontend/src/pages/auth/LoginPage.tsx`
- Reference: `frontend/src/context/AuthContext.tsx`
- Reference: `frontend/src/services/auth-service.ts`

## Implementation Steps
1. Tích hợp logic submit form và xử lý ngoại lệ vào `LoginPage.tsx`.
2. Bổ sung nút "Trải nghiệm ngay bản Demo" tự động gán session demo hoặc chuyển nhanh sang `/dashboard`.
3. Kiểm tra đồng bộ trạng thái đăng nhập với thanh Header (hiển thị Avatar / Nút Đăng Xuất).
4. Kiểm thử với `npx tsc --noEmit` và test thực tế trên trình duyệt.

## Success Criteria
- [ ] Đăng nhập thành công chuyển mượt mà về `/dashboard`.
- [ ] Đăng nhập sai báo lỗi tiếng Việt trực quan, rõ ràng.
- [ ] Có tùy chọn Đăng nhập Demo 1-click cho người dùng trải nghiệm nhanh.
- [ ] `npx tsc --noEmit` đạt 100% không lỗi.
