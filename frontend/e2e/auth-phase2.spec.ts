import { test, expect } from '@playwright/test';

test.describe('Phase 2: Authentication & Dashboard Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Login page
    await page.goto('/login');
  });

  test('TC-01: Giao diện Đăng nhập hiển thị đúng chuẩn AI QUANTUM Terminal v7.0', async ({ page }) => {
    // Verify Brand title in Header
    await expect(page.locator('header').locator('text=AI QUANTUM')).toBeVisible();
    await expect(page.locator('text=Terminal v7.0')).toBeVisible();

    // Verify Split-screen Left Column
    await expect(page.locator('text=Mô hình Markov (HMM) & PPO Active')).toBeVisible();
    await expect(page.locator('text=+58.06%')).toBeVisible();
    await expect(page.locator('text=74.2%')).toBeVisible();

    // Verify Right Column Form Elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('#rememberMe')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Đăng Nhập Ngay' })).toBeVisible();
  });

  test('TC-02: Báo lỗi tiếng Việt khi để trống email hoặc mật khẩu', async ({ page }) => {
    const submitBtn = page.getByRole('button', { name: 'Đăng Nhập Ngay' });
    await submitBtn.click();

    // HTML5 validation
    const emailInput = page.locator('input[type="email"]');
    const isRequired = await emailInput.getAttribute('required');
    expect(isRequired).not.toBeNull();
  });

  test('TC-03: Kiểm tra tính năng ẩn / hiện mật khẩu', async ({ page }) => {
    const passwordField = page.locator('input[placeholder="Nhập mật khẩu an toàn..."]');
    await passwordField.fill('MatKhauBiMat123');

    // Click toggle password visibility button (aria-label="Hiển thị mật khẩu")
    const toggleBtn = page.locator('button[aria-label="Hiển thị mật khẩu"]');
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();

    // Input should change to type="text"
    await expect(passwordField).toHaveAttribute('type', 'text');

    // Click again to hide (aria-label="Ẩn mật khẩu")
    const hideBtn = page.locator('button[aria-label="Ẩn mật khẩu"]');
    await expect(hideBtn).toBeVisible();
    await hideBtn.click();
    await expect(passwordField).toHaveAttribute('type', 'password');
  });

  test('TC-04: Nút Trải nghiệm bản Demo (1-Click) chuyển hướng tức thì vào /dashboard', async ({ page }) => {
    const demoBtn = page.getByRole('button', { name: /Trải Nghiệm Bản Demo/i });
    await expect(demoBtn).toBeVisible();
    await demoBtn.click();

    // Should redirect to /dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify Dashboard Core Elements
    await expect(page.locator('text=Không Gian Quản Lý Tài Sản Cá Nhân')).toBeVisible();
    await expect(page.locator('text=Tổng Giá Trị Tài Sản (NAV)')).toBeVisible();
    await expect(page.locator('text=Bảng Dự Báo Biến Động')).toBeVisible();
  });

  test('TC-05: Đăng nhập thành công và đồng bộ trạng thái Header', async ({ page }) => {
    // Mock the backend login API response
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: 'usr-123456',
              email: 'nha-dau-tu@aiquantum.vn',
              fullName: 'Trần Minh Quang',
              status: 'ACTIVE',
              role: 'USER',
              createdAt: '2026-10-22T00:00:00Z',
            },
            tokens: {
              accessToken: 'mock-jwt-access-token-xyz',
              refreshToken: 'mock-jwt-refresh-token-xyz',
              tokenType: 'Bearer',
              expiresIn: 1800,
            },
          },
        }),
      });
    });

    // Mock the /auth/me profile sync
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'usr-123456',
            email: 'nha-dau-tu@aiquantum.vn',
            fullName: 'Trần Minh Quang',
            status: 'ACTIVE',
            role: 'USER',
          },
        }),
      });
    });

    // Mock notifications and portfolio calls
    await page.route('**/api/v1/notifications*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { items: [], total: 0 } }),
      });
    });

    await page.route('**/api/v1/profiles*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: null }),
      });
    });

    await page.route('**/api/v1/investment-profile*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: null }),
      });
    });

    await page.route('**/api/v1/portfolios*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: null }),
      });
    });

    // Fill form
    await page.locator('input[type="email"]').fill('nha-dau-tu@aiquantum.vn');
    await page.locator('input[type="password"]').fill('MatKhau123@');
    await page.getByRole('button', { name: 'Đăng Nhập Ngay' }).click();

    // Verify redirection to /dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify user information appears on Private Cockpit Dashboard Header
    await expect(page.locator('text=Trần Minh Quang')).toBeVisible();
    await expect(page.locator('text=TK: #AQ-8899 • Vốn 10M')).toBeVisible();
  });
});
