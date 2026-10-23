import { test, expect } from '@playwright/test';

test.describe('Single-User Private Wealth Cockpit E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to private dashboard with simulated 10M capital
    await page.goto('/dashboard?capital=10000000');
  });

  test('TC-01: Định danh nhà đầu tư cá nhân riêng biệt và loại bỏ tàn dư SaaS multi-tenant', async ({ page }) => {
    // Brand header
    await expect(page.locator('header').locator('text=AI QUANTUM')).toBeVisible();
    await expect(page.locator('text=Terminal v7.0')).toBeVisible();

    // Private identity badge
    await expect(page.locator('text=Trần Minh Quang')).toBeVisible();
    await expect(page.locator('text=TK: #AQ-8899 • Vốn 10M')).toBeVisible();
    await expect(page.locator('text=HOSE: Khớp Lệnh Liên Tục')).toBeVisible();

    // Verify absence of multi-tenant / auth clutter
    await expect(page.getByRole('button', { name: /Đăng Nhập/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Đăng Xuất/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Khảo Sát Khẩu Vị Rủi Ro/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Miễn trừ trách nhiệm/i })).not.toBeVisible();
    await expect(page.getByRole('link', { name: /Về Trang Chủ/i })).not.toBeVisible();
  });

  test('TC-02: 3 Thẻ tài sản cốt lõi phản ánh chính xác NAV 9.379.000 đ (-6.21%) và tiền mặt 164.000 đ', async ({ page }) => {
    // Header banner title & initial capital
    await expect(page.locator('h1:has-text("Không Gian Quản Lý Tài Sản Cá Nhân")')).toBeVisible();
    await expect(page.locator('text=Tài Khoản 10 Triệu VND')).toBeVisible();
    await expect(page.locator('span:has-text("Vốn Ban Đầu") ~ span:has-text("10.000.000 đ")')).toBeVisible();

    // Asset Card 1: NAV
    await expect(page.locator('text=Tổng Giá Trị Tài Sản (NAV)')).toBeVisible();
    await expect(page.locator('text=9.379.000 đ').first()).toBeVisible();
    await expect(page.locator('text=-6.21% PnL')).toBeVisible();
    await expect(page.locator('text=(-621.000 đ)').first()).toBeVisible();

    // Asset Card 2: Stock holdings value & weight
    await expect(page.locator('text=Giá Trị Danh Mục Cổ Phiếu')).toBeVisible();
    await expect(page.locator('text=9.215.000 đ').first()).toBeVisible();
    await expect(page.locator('text=Nắm giữ 6 mã cổ phiếu thực tế')).toBeVisible();

    // Asset Card 3: Available cash buffer
    await expect(page.locator('text=Tiền Mặt Khả Dụng').first()).toBeVisible();
    await expect(page.locator('text=164.000 đ').first()).toBeVisible();
    await expect(page.locator('text=1.7% Vốn')).toBeVisible();
  });

  test('TC-03: Bảng danh mục 6 cổ phiếu thực tế chiếm vị trí trung tâm với đầy đủ nhãn T+ và tỷ trọng', async ({ page }) => {
    await expect(page.locator('h2:has-text("Danh Mục Cổ Phiếu Cá Nhân (6 Mã Đang Nắm Giữ)")')).toBeVisible();

    const table = page.locator('table').first();
    await expect(table).toBeVisible();

    // Verify all 6 stock tickers are listed in table
    const tickers = ['VND', 'DIG', 'VSC', 'DPM', 'GEX', 'HT1'];
    for (const ticker of tickers) {
      await expect(table.locator(`text=${ticker}`).first()).toBeVisible();
    }

    // Verify T+ status badges
    await expect(table.locator('text=Khả dụng (100 CP)').first()).toBeVisible();
    await expect(table.locator('text=Chờ về T+1 (100 CP)').first()).toBeVisible();
    await expect(table.locator('text=Dự kiến về: 11:30 Ngày mai').first()).toBeVisible();

    // Verify Tỷ Trọng / NAV column and summary
    await expect(table.locator('th:has-text("Tỷ Trọng / NAV")')).toBeVisible();
    await expect(table.locator('text=TỔNG CỘNG (6 MÃ)')).toBeVisible();
    await expect(table.locator('tfoot').locator('text=98.3% NAV')).toBeVisible();
  });

  test('TC-04: Cố Vấn Hành Động AI Cá Nhân Hóa cảnh báo sức mua và mở modal phân tích cổ phiếu', async ({ page }) => {
    await expect(page.locator('h3:has-text("Cố Vấn Hành Động AI Cá Nhân Hóa (Personal AI Advisor)")')).toBeVisible();

    // Cash power warning
    await expect(page.locator('text=CẢNH BÁO SỨC MUA: Tiền mặt chỉ còn 164.000 đ (1.7% NAV)')).toBeVisible();
    await expect(page.locator('text=tạm dừng mở vị thế mua mới')).toBeVisible();

    // Unlocked and Locked directive sections
    await expect(page.locator('text=Nhóm Cổ Phiếu Đã Khả Dụng (T+0 • Sẵn Sàng Giao Dịch Bán / Chốt Lời)')).toBeVisible();
    await expect(page.locator('text=Nhóm Cổ Phiếu Đang Chờ Về T+1 (Dự kiến mở khóa 11:30 Ngày mai)')).toBeVisible();

    // Click "Phân Tích" button explicitly inside the AI Advisor section (VSC card)
    const advisorSection = page.locator('div:has-text("Nhóm Cổ Phiếu Đã Khả Dụng (T+0 • Sẵn Sàng Giao Dịch Bán / Chốt Lời)")').first();
    const advisorAnalyzeBtn = advisorSection.locator('button:has-text("Phân Tích")').first();
    await advisorAnalyzeBtn.click();

    // Verify modal appears with financial metrics
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('text=Giá Khớp Gần Nhất')).toBeVisible();
    await expect(dialog.locator('text=Dự Báo Phiên Tới')).toBeVisible();

    // Close modal via close button
    const closeBtn = dialog.locator('button[aria-label="Đóng cửa sổ chi tiết cổ phiếu"]');
    await closeBtn.click();
    await expect(dialog).not.toBeVisible();
  });

  test('TC-05: Biểu đồ biến động giá trị tài sản cá nhân (Personal Equity Curve) hiển thị đầy đủ thông số', async ({ page }) => {
    await expect(page.locator('h3:has-text("Biến Động Giá Trị Tài Sản Cá Nhân (NAV Equity Curve)")')).toBeVisible();
    await expect(page.locator('text=NAV Thực Tế (9.379.000 đ)')).toBeVisible();
    await expect(page.locator('text=Vốn Gốc (10.000.000 đ)')).toBeVisible();
    await expect(page.locator('text=VN-Index Quy Đổi (-1,80%)')).toBeVisible();

    // Assert that the lightweight-charts Canvas is active
    await expect(page.locator('div:has-text("Biến Động Giá Trị Tài Sản Cá Nhân") canvas').first()).toBeVisible();

    // Footer analytics bar
    await expect(page.locator('text=Vốn Nạp Ban Đầu')).toBeVisible();
    await expect(page.locator('text=Max Drawdown')).toBeVisible();
    await expect(page.locator('text=-6.60% (22/10)')).toBeVisible();
    await expect(page.locator('text=98.3% CP (6 mã)')).toBeVisible();
  });
});
