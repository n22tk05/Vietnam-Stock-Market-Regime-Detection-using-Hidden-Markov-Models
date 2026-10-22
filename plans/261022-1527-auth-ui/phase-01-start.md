---
phase: 1
title: "Thiết Kế & Tái Cấu Trúc Giao Diện Đăng Nhập AI QUANTUM (Split Screen Visual)"
status: completed
priority: P1
effort: "3h"
dependencies: []
---

# Phase 1: Thiết Kế & Tái Cấu Trúc Giao Diện Đăng Nhập AI QUANTUM

## Overview
Xây dựng giao diện đăng nhập hiện đại dạng Split-Screen (nửa trái là showcase tính năng định lượng AI QUANTUM & chỉ số thị trường, nửa phải là form đăng nhập bảo mật), thay thế hoàn toàn thương hiệu cũ (Wealth4ward) bằng nhận diện thương hiệu AI QUANTUM chuẩn xác.

## Requirements
- **Functional**:
  - Giao diện đăng nhập hiện đại dạng 2 cột:
    - **Cột Trái (Brand & AI Visual Showcase)**: Logo AI QUANTUM, slogan "Đầu tư kỷ luật cùng Trí tuệ Nhân tạo", thẻ chỉ số minh họa hiệu suất PPO (+58.06% YTD, Sharpe 2.18, 10 mã VN30) và chứng nhận thuật toán an toàn vốn.
    - **Cột Phải (Card Đăng Nhập)**: Form nhập Email, Mật khẩu (có icon ẩn/hiện mắt mật khẩu `PasswordInput`), checkbox "Ghi nhớ đăng nhập", liên kết "Quên mật khẩu?", và nút "Đăng Nhập Ngay".
  - Liên kết chuyển đổi nhanh sang trang Đăng Ký tài khoản (`/register`).
  - Nút quay lại Trang chủ (`/`) và Dashboard (`/dashboard`).
- **Non-functional**:
  - 100% tiếng Việt có dấu chuẩn xác, không sử dụng emoji trong chuỗi ký tự.
  - Sử dụng TailwindCSS v4 tương thích toàn diện với theme sáng/tối đồng bộ (`#070b14` dark gradient hoặc clean modern slate).
  - Responsive tối ưu: Trên mobile tự động chuyển thành dạng thẻ trung tâm 1 cột.

## Architecture
- Module: `frontend/src/pages/auth/LoginPage.tsx`
- Hỗ trợ: `frontend/src/components/common/PasswordInput.tsx`

## Related Code Files
- Modify: `frontend/src/pages/auth/LoginPage.tsx`
- Reference: `frontend/src/pages/auth/RegisterPage.tsx`
- Reference: `frontend/src/types/dashboard.ts`

## Implementation Steps
1. Tái cấu trúc layout trong `LoginPage.tsx` sang dạng Split-Screen 2 cột (hoặc responsive 1 cột trên điện thoại).
2. Xây dựng Brand Showcase bên trái với badge trạng thái mô hình Markov (HMM) & Reinforcement Learning (PPO).
3. Chuẩn hóa form nhập liệu bên phải, kết nối với state và validation client-side (báo lỗi tiếng Việt nếu để trống hoặc sai định dạng).
4. Kiểm tra khả năng tương tác phím (Enter submit, Tab focus accessibility).

## Success Criteria
- [ ] Giao diện đăng nhập mang chuẩn nhận diện thương hiệu AI QUANTUM (không còn chữ Wealth4ward).
- [ ] Hiển thị đẹp mắt trên cả Desktop (2 cột) và Mobile (1 cột gọn gàng).
- [ ] Form hỗ trợ đầy đủ các tính năng: ẩn/hiện mật khẩu, ghi nhớ đăng nhập, hiển thị thông báo lỗi rõ ràng.
