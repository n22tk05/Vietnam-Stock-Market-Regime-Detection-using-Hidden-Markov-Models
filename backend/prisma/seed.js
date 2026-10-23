// ==============================================================================
// AI QUANTUM - PRISMA SEED SCRIPT
// Nạp dữ liệu 3 User Tiers (10M, 20M, 100M) từ 3 file JSON của AI Simulator
// ==============================================================================

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const STOCK_INFO = {
  ACB: { name: 'Ngân hàng TMCP Á Châu', exchange: 'HOSE' },
  ANV: { name: 'Công ty CP Nam Việt', exchange: 'HOSE' },
  BID: { name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', exchange: 'HOSE' },
  BMP: { name: 'Công ty CP Nhựa Bình Minh', exchange: 'HOSE' },
  BSI: { name: 'Công ty CP Chứng khoán BIDV', exchange: 'HOSE' },
  BVH: { name: 'Tập đoàn Bảo Việt', exchange: 'HOSE' },
  CII: { name: 'Công ty CP Đầu tư Hạ tầng Kỹ thuật TP.HCM', exchange: 'HOSE' },
  CTD: { name: 'Công ty CP Xây dựng Coteccons', exchange: 'HOSE' },
  CTG: { name: 'Ngân hàng TMCP Công Thương Việt Nam', exchange: 'HOSE' },
  CTS: { name: 'Công ty CP Chứng khoán Ngân hàng Công thương Việt Nam', exchange: 'HOSE' },
  DBC: { name: 'Công ty CP Tập đoàn DABACO Việt Nam', exchange: 'HOSE' },
  DCM: { name: 'Công ty CP Phân bón Dầu khí Cà Mau', exchange: 'HOSE' },
  DGW: { name: 'Công ty CP Thế Giới Số (Digiworld)', exchange: 'HOSE' },
  DIG: { name: 'Tổng Công ty CP Đầu tư Phát triển Xây dựng', exchange: 'HOSE' },
  DPM: { name: 'Tổng Công ty Phân bón & Hóa chất Dầu khí', exchange: 'HOSE' },
  DXG: { name: 'Công ty CP Tập đoàn Đất Xanh', exchange: 'HOSE' },
  EIB: { name: 'Ngân hàng TMCP Xuất Nhập khẩu Việt Nam', exchange: 'HOSE' },
  FPT: { name: 'Công ty CP FPT', exchange: 'HOSE' },
  GAS: { name: 'Tổng Công ty Khí Việt Nam', exchange: 'HOSE' },
  GEX: { name: 'Công ty CP Tập đoàn GELEX', exchange: 'HOSE' },
  GMD: { name: 'Công ty CP Gemadept', exchange: 'HOSE' },
  HAG: { name: 'Công ty CP Hoàng Anh Gia Lai', exchange: 'HOSE' },
  HCM: { name: 'Công ty CP Chứng khoán TP.HCM (HSC)', exchange: 'HOSE' },
  HDC: { name: 'Công ty CP Phát triển Nhà Bà Rịa - Vũng Tàu', exchange: 'HOSE' },
  HDG: { name: 'Công ty CP Tập đoàn Hà Đô', exchange: 'HOSE' },
  HPG: { name: 'Công ty CP Tập đoàn Hòa Phát', exchange: 'HOSE' },
  HSG: { name: 'Công ty CP Tập đoàn Hoa Sen', exchange: 'HOSE' },
  HT1: { name: 'Công ty CP Xi măng Vicem Hà Tiên', exchange: 'HOSE' },
  IMP: { name: 'Công ty CP Dược phẩm Imexpharm', exchange: 'HOSE' },
  KBC: { name: 'Tổng Công ty Phát triển Đô thị Kinh Bắc', exchange: 'HOSE' },
  KDC: { name: 'Công ty CP Tập đoàn KIDO', exchange: 'HOSE' },
  KDH: { name: 'Công ty CP Đầu tư và Kinh doanh Nhà Khang Điền', exchange: 'HOSE' },
  MBB: { name: 'Ngân hàng TMCP Quân đội', exchange: 'HOSE' },
  MSN: { name: 'Công ty CP Tập đoàn Masan', exchange: 'HOSE' },
  MWG: { name: 'Công ty CP Đầu tư Thế Giới Di Động', exchange: 'HOSE' },
  NKG: { name: 'Công ty CP Thép Nam Kim', exchange: 'HOSE' },
  NLG: { name: 'Công ty CP Đầu tư Nam Long', exchange: 'HOSE' },
  NT2: { name: 'Công ty CP Điện lực Dầu khí Nhơn Trạch 2', exchange: 'HOSE' },
  PAN: { name: 'Công ty CP Tập đoàn PAN', exchange: 'HOSE' },
  PDR: { name: 'Công ty CP Phát triển Bất động sản Phát Đạt', exchange: 'HOSE' },
  PHR: { name: 'Công ty CP Cao su Phước Hòa', exchange: 'HOSE' },
  PNJ: { name: 'Công ty CP Vàng bạc Đá quý Phú Nhuận', exchange: 'HOSE' },
  PVD: { name: 'Tổng Công ty CP Khoan và Dịch vụ Khoan Dầu khí', exchange: 'HOSE' },
  PVT: { name: 'Tổng Công ty CP Vận tải Dầu khí', exchange: 'HOSE' },
  REE: { name: 'Công ty CP Cơ Điện Lạnh', exchange: 'HOSE' },
  SBT: { name: 'Công ty CP Thành Thành Công - Biên Hòa', exchange: 'HOSE' },
  SHB: { name: 'Ngân hàng TMCP Sài Gòn - Hà Nội', exchange: 'HOSE' },
  SJS: { name: 'Công ty CP Đầu tư Phát triển Đô thị và Khu công nghiệp Sông Đà', exchange: 'HOSE' },
  SSI: { name: 'Công ty CP Chứng khoán SSI', exchange: 'HOSE' },
  STB: { name: 'Ngân hàng TMCP Sài Gòn Thương Tín', exchange: 'HOSE' },
  TCH: { name: 'Công ty CP Đầu tư Dịch vụ Tài chính Hoàng Huy', exchange: 'HOSE' },
  VCB: { name: 'Ngân hàng TMCP Ngoại thương Việt Nam', exchange: 'HOSE' },
  VCG: { name: 'Tổng Công ty CP Xuất nhập khẩu và Xây dựng Việt Nam', exchange: 'HOSE' },
  VGC: { name: 'Tổng Công ty Viglacera', exchange: 'HOSE' },
  VHC: { name: 'Công ty CP Vĩnh Hoàn', exchange: 'HOSE' },
  VIC: { name: 'Tập đoàn Vingroup', exchange: 'HOSE' },
  VIX: { name: 'Công ty CP Chứng khoán VIX', exchange: 'HOSE' },
  VND: { name: 'Công ty CP Chứng khoán VNDIRECT', exchange: 'HOSE' },
  VNM: { name: 'Công ty CP Sữa Việt Nam', exchange: 'HOSE' },
  VSC: { name: 'Công ty CP Container Việt Nam', exchange: 'HOSE' },
};

const USER_TIERS_CONFIG = [
  {
    tier: '10m',
    userId: 'd0000000-0000-0000-0000-000000000001',
    portfolioId: 'e0000000-0000-0000-0000-000000000001',
    email: 'user10m@aiquantum.vn',
    altEmail: 'nha-dau-tu@aiquantum.vn',
    fullName: 'Trần Minh Quang (User 10M)',
    riskAppetite: 'LOW',
    investmentHorizon: 'SHORT_TERM',
  },
  {
    tier: '20m',
    userId: 'd0000000-0000-0000-0000-000000000002',
    portfolioId: 'e0000000-0000-0000-0000-000000000002',
    email: 'user20m@aiquantum.vn',
    fullName: 'Nguyễn Hoàng Long (User 20M)',
    riskAppetite: 'MEDIUM',
    investmentHorizon: 'MEDIUM_TERM',
  },
  {
    tier: '100m',
    userId: 'd0000000-0000-0000-0000-000000000003',
    portfolioId: 'e0000000-0000-0000-0000-000000000003',
    email: 'user100m@aiquantum.vn',
    fullName: 'Lê Thu Trang (User 100M)',
    riskAppetite: 'HIGH',
    investmentHorizon: 'LONG_TERM',
  },
];

async function main() {
  console.log('='.repeat(80));
  console.log('🚀 AI QUANTUM - PRISMA SEEDER DỰA TRÊN 3 FILE JSON MÔ PHỎNG (10M, 20M, 100M)');
  console.log('='.repeat(80));

  // 1. Nạp AI Engine
  const aiEngine = await prisma.aIEngine.upsert({
    where: { id: 'a0000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'a0000000-0000-0000-0000-000000000001',
      hmmModelVersion: 'hmm_gaussian_v3.2',
      ppoModelVersion: 'ppo_multitask_vietnam_v7.0',
      isActive: true,
      lastRunAt: new Date(),
    },
  });
  console.log(' [+] AI Engine:', aiEngine.hmmModelVersion, '| PPO:', aiEngine.ppoModelVersion);

  // 2. Nạp Market Regime
  const marketRegime = await prisma.marketRegime.upsert({
    where: { id: 'b0000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'b0000000-0000-0000-0000-000000000001',
      code: 'BULLISH_CONTINUATION',
      description: 'Thị trường tăng trưởng ổn định (Bullish Continuation)',
      probability: 0.854,
      isCurrent: true,
    },
  });
  console.log(' [+] Market Regime:', marketRegime.code, `(P: ${(marketRegime.probability * 100).toFixed(1)}%)`);

  // 3. Đọc dữ liệu từ 3 file JSON
  const tierDataMap = {};
  const stockPriceMap = {};

  for (const cfg of USER_TIERS_CONFIG) {
    const jsonPath = path.resolve(__dirname, '../../ai_core', `simulated_user_${cfg.tier}.json`);
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`Không tìm thấy file mô phỏng: ${jsonPath}`);
    }
    const raw = fs.readFileSync(jsonPath, 'utf8');
    const parsed = JSON.parse(raw);
    tierDataMap[cfg.tier] = parsed;

    // Thu thập giá cổ phiếu mới nhất từ holdings
    for (const h of parsed.holdings || []) {
      stockPriceMap[h.ma_co_phieu] = h.gia_hien_tai;
    }
  }

  // 4. Upsert tất cả các cổ phiếu niêm yết
  console.log(' [+] Đang nạp danh bạ cổ phiếu niêm yết...');
  const stockMap = {}; // symbol -> Stock Record

  for (const [symbol, info] of Object.entries(STOCK_INFO)) {
    const curPrice = stockPriceMap[symbol] || 15000;
    const stock = await prisma.stock.upsert({
      where: { symbol },
      update: {
        currentPrice: curPrice,
        companyName: info.name,
      },
      create: {
        symbol,
        companyName: info.name,
        exchange: info.exchange,
        currentPrice: curPrice,
      },
    });
    stockMap[symbol] = stock;
  }
  console.log(` [+] Đã cập nhật thành công ${Object.keys(stockMap).length} mã cổ phiếu vào Database.`);

  // 5. Nạp dữ liệu cho từng User Tier (10M, 20M, 100M)
  for (const cfg of USER_TIERS_CONFIG) {
    const simData = tierDataMap[cfg.tier];
    console.log(`\n--------------------------------------------------------------------------------`);
    console.log(`[*] Đang nạp dữ liệu cho User ${cfg.fullName} (Vốn: ${simData.initial_capital.toLocaleString('vi-VN')} đ)...`);

    // 5.1 Upsert User by ID with standard password '123456'
    const defaultPasswordHash = bcrypt.hashSync('123456', 10);
    const user = await prisma.user.upsert({
      where: { id: cfg.userId },
      update: {
        email: cfg.email,
        fullName: cfg.fullName,
        passwordHash: defaultPasswordHash,
      },
      create: {
        id: cfg.userId,
        email: cfg.email,
        fullName: cfg.fullName,
        passwordHash: defaultPasswordHash,
        role: 'USER',
        status: 'ACTIVE',
      },
    });

    // 5.1b Nạp InvestmentProfile riêng cho từng User
    const existingProfile = await prisma.investmentProfile.findFirst({
      where: { userId: user.id },
    });
    if (existingProfile) {
      await prisma.investmentProfile.update({
        where: { id: existingProfile.id },
        data: {
          capital: simData.initial_capital,
          riskAppetite: cfg.riskAppetite,
          investmentHorizon: cfg.investmentHorizon,
        },
      });
    } else {
      await prisma.investmentProfile.create({
        data: {
          userId: user.id,
          capital: simData.initial_capital,
          riskAppetite: cfg.riskAppetite,
          investmentHorizon: cfg.investmentHorizon,
          expectedReturn: cfg.tier === '100m' ? 25.0 : cfg.tier === '20m' ? 18.0 : 12.0,
          maximumDrawdown: cfg.tier === '100m' ? 15.0 : cfg.tier === '20m' ? 10.0 : 7.0,
        },
      });
    }
    console.log(`    - User Email: ${user.email} | Khẩu vị rủi ro: ${cfg.riskAppetite}`);

    // 5.2 Upsert Portfolio
    const portfolio = await prisma.portfolio.upsert({
      where: { id: cfg.portfolioId },
      update: {
        initialCapital: simData.initial_capital,
        currentValue: simData.current_nav,
        cashBalance: simData.cash_left,
        status: 'ACTIVE',
      },
      create: {
        id: cfg.portfolioId,
        userId: user.id,
        initialCapital: simData.initial_capital,
        currentValue: simData.current_nav,
        cashBalance: simData.cash_left,
        status: 'ACTIVE',
      },
    });
    console.log(`    - Portfolio NAV: ${portfolio.currentValue.toLocaleString('vi-VN')} đ | Tiền mặt: ${portfolio.cashBalance.toLocaleString('vi-VN')} đ`);

    // 5.3 Nạp Holdings (Làm sạch holdings cũ và tạo mới)
    await prisma.portfolioHolding.deleteMany({
      where: { portfolioId: portfolio.id },
    });

    for (const h of simData.holdings || []) {
      const stock = stockMap[h.ma_co_phieu];
      if (!stock) continue;

      await prisma.portfolioHolding.create({
        data: {
          portfolioId: portfolio.id,
          stockId: stock.id,
          quantity: h.so_co_phieu,
          costPrice: h.gia_von,
          sharesUnlocked: h.shares_unlocked,
          sharesT1: h.shares_t1,
          sharesT2: h.shares_t2,
        },
      });
    }
    console.log(`    - Đã nạp ${simData.holdings.length} mã cổ phiếu vào PortfolioHoldings (kèm T+).`);

    // 5.4 Nạp NavHistory (Lịch sử biến động NAV)
    await prisma.navHistory.deleteMany({
      where: { portfolioId: portfolio.id },
    });

    for (const hist of simData.history || []) {
      await prisma.navHistory.create({
        data: {
          portfolioId: portfolio.id,
          date: hist.date,
          nav: hist.nav,
          cash: hist.cash,
          stockValue: hist.stock_value,
          dailyChange: hist.daily_change || 0,
          dailyChangePct: hist.daily_change_pct || 0,
        },
      });
    }
    console.log(`    - Đã nạp ${simData.history.length} ngày lịch sử biến động NAV.`);

    // 5.5 Nạp OrderTransaction (Sổ lệnh giao dịch đã khớp)
    await prisma.orderTransaction.deleteMany({
      where: { portfolioId: portfolio.id },
    });

    for (const trade of simData.trade_history || []) {
      const stock = stockMap[trade.ticker];
      if (!stock) continue;

      // Parse date DD/MM/YYYY or YYYY-MM-DD
      let orderDate = new Date();
      if (trade.date) {
        const parts = trade.date.split('/');
        if (parts.length === 3) {
          orderDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T09:30:00Z`);
        } else {
          const d = new Date(trade.date);
          if (!isNaN(d.getTime())) orderDate = d;
        }
      }

      await prisma.orderTransaction.create({
        data: {
          portfolioId: portfolio.id,
          stockId: stock.id,
          action: trade.action,
          quantity: trade.shares,
          price: trade.price,
          totalValue: Math.abs(trade.total_cost || trade.shares * trade.price),
          realizedPnl: trade.action === 'SELL' ? (trade.price - (stockMap[trade.ticker]?.currentPrice || trade.price)) * trade.shares : null,
          status: 'COMPLETED',
          notes: `Khớp lệnh mô phỏng AI Portfolio cho Tier ${cfg.tier.toUpperCase()}`,
          orderDate,
        },
      });
    }
    console.log(`    - Đã nạp ${simData.trade_history.length} giao dịch vào Sổ Lệnh OrderTransaction.`);

    // 5.6 Nạp Snapshot PortfolioVersion
    await prisma.portfolioVersion.deleteMany({
      where: { portfolioId: portfolio.id },
    });

    await prisma.portfolioVersion.create({
      data: {
        portfolioId: portfolio.id,
        versionNumber: 1,
        currentValue: simData.initial_capital,
        cashBalance: simData.initial_capital,
        changeType: 'INITIAL',
        holdingsSnapshot: JSON.stringify([]),
      },
    });

    await prisma.portfolioVersion.create({
      data: {
        portfolioId: portfolio.id,
        versionNumber: 2,
        currentValue: simData.current_nav,
        cashBalance: simData.cash_left,
        changeType: 'REBALANCE',
        holdingsSnapshot: JSON.stringify(simData.holdings),
      },
    });
    console.log(`    - Đã lưu snapshot PortfolioVersion 1 & 2.`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Hoàn tất Seed Database thành công cho 3 User Tiers: 10M, 20M, 100M!');
  console.log('='.repeat(80));
}

main()
  .catch((e) => {
    console.error('❌ Lỗi Seeder:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
