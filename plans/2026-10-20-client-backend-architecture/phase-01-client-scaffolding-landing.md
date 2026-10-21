---
phase: 1
title: "Khởi tạo Client SPA (Vite + React + TailwindCSS) & Chuyển đổi Landing Page"
status: completed
priority: P1
effort: "4h"
dependencies: []
---

# Phase 1: Khởi tạo Client SPA (Vite + React + TailwindCSS) & Chuyển đổi Landing Page

## Overview
Khởi tạo cấu trúc dự án Frontend bằng React 19 + TypeScript + Vite 8 + TailwindCSS, kế thừa các thiết lập tối ưu từ 4WARD. Chuyển đổi file HTML tĩnh `landing-page.html` thành hệ thống các React Component độc lập và module hoá.

## Requirements
- **Functional**:
  - Khởi tạo thư mục `frontend/` với cấu trúc `src/components`, `src/features`, `src/pages`, `src/services`, `src/styles`.
  - Cấu hình path alias `@` trỏ về `src/`.
  - Chuyển đổi Landing Page thành các component nhỏ: `HeroSection.tsx`, `SocialProofStrip.tsx`, `ProblemsSection.tsx`, `HowItWorksSection.tsx`, `ForecastDemoSection.tsx`, `TrustBannerSection.tsx`, `FinalCtaBanner.tsx`, `Header.tsx`, `Footer.tsx`.
  - Điều hướng mượt mà giữa Landing Page và Dashboard qua React Router v7.
- **Non-functional**:
  - Không có lỗi type check TypeScript.
  - Tối ưu kích thước bundle và thời gian tải trang ban đầu.

## Related Code Files
- Create:
  - `frontend/package.json`
  - `frontend/vite.config.ts`
  - `frontend/tsconfig.json`
  - `frontend/src/main.tsx`
  - `frontend/src/app/App.tsx`
  - `frontend/src/styles/global.css`
  - `frontend/src/features/landing/LandingPage.tsx`
  - `frontend/src/features/landing/sections/HeroSection.tsx`
  - `frontend/src/features/landing/sections/ProblemsSection.tsx`
  - `frontend/src/features/landing/sections/HowItWorksSection.tsx`
  - `frontend/src/features/landing/sections/ForecastDemoSection.tsx`
  - `frontend/src/features/landing/sections/TrustBannerSection.tsx`
  - `frontend/src/features/landing/sections/FinalCtaBanner.tsx`
  - `frontend/src/components/layout/Header.tsx`
  - `frontend/src/components/layout/Footer.tsx`

## Implementation Steps
1. Khởi tạo thư mục `frontend/` và cấu hình `package.json` với React 19, Lucide React, TailwindCSS, và React Router.
2. Thiết lập `vite.config.ts` và import alias `@/`.
3. Chuyển đổi mã CSS dùng chung sang `src/styles/global.css`.
4. Xây dựng các Section component của Landing Page dựa trên file `landing-page.html`.
5. Tạo routing cơ bản (`/` cho Landing Page, `/dashboard` cho Dashboard).
6. Kiểm tra giao diện và tính tương thích responsive.

## Success Criteria
- [ ] Chạy lệnh `npm run dev` trong `frontend/` mở được trang Landing Page hiển thị đầy đủ hiệu ứng ambient orb, social proof 4.9/5, bảng dự báo mẫu 4 cột.
- [ ] Bấm nút "Bắt đầu với AI Dashboard" hoặc "Truy cập Dashboard" chuyển hướng đúng sang trang Dashboard.
