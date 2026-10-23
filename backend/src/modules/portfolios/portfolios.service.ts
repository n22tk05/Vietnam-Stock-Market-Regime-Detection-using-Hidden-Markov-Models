import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class PortfoliosService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly initialStockData = [
    { symbol: 'VND', name: 'Chứng khoán VNDirect', price: 13200, cost: 13900, qty: 100, unlocked: 100, t1: 0, t2: 0 },
    { symbol: 'DIG', name: 'Tổng Công ty Đầu tư Phát triển Xây dựng', price: 9400, cost: 9250, qty: 100, unlocked: 100, t1: 0, t2: 0 },
    { symbol: 'VSC', name: 'Container Việt Nam', price: 13150, cost: 12950, qty: 100, unlocked: 100, t1: 0, t2: 0 },
    { symbol: 'DPM', name: 'Phân bón & Hóa chất Dầu khí', price: 21900, cost: 22150, qty: 100, unlocked: 0, t1: 100, t2: 0 },
    { symbol: 'GEX', name: 'Tập đoàn GELEX', price: 22250, cost: 21800, qty: 100, unlocked: 0, t1: 100, t2: 0 },
    { symbol: 'HT1', name: 'Xi măng Vicem Hà Tiên', price: 12250, cost: 12300, qty: 100, unlocked: 0, t1: 100, t2: 0 },
  ];

  async ensureDefaultPortfolio(userId?: string) {
    let targetUserId = userId;
    if (!targetUserId) {
      let defaultUser = await this.prisma.user.findFirst();
      if (!defaultUser) {
        defaultUser = await this.prisma.user.create({
          data: {
            id: 'd0000000-0000-0000-0000-000000000001',
            email: 'nha-dau-tu@aiquantum.vn',
            fullName: 'Nhà Đầu Tư Cá Nhân',
            passwordHash: '$2b$10$simulated_hash_pass_123456',
            role: 'USER',
            status: 'ACTIVE',
          },
        });
      }
      targetUserId = defaultUser.id;
    }

    let portfolio = await this.prisma.portfolio.findFirst({
      where: { userId: targetUserId, status: 'ACTIVE' },
      include: { holdings: { include: { stock: true } }, versions: true },
    });

    if (!portfolio) {
      portfolio = await this.prisma.portfolio.create({
        data: {
          userId: targetUserId,
          initialCapital: 10000000,
          currentValue: 9379000,
          cashBalance: 164000,
          status: 'ACTIVE',
        },
        include: { holdings: { include: { stock: true } }, versions: true },
      });

      // Tạo các mã cổ phiếu và holdings nếu chưa có
      for (const item of this.initialStockData) {
        const stock = await this.prisma.stock.upsert({
          where: { symbol: item.symbol },
          update: { currentPrice: item.price },
          create: {
            symbol: item.symbol,
            companyName: item.name,
            exchange: 'HOSE',
            currentPrice: item.price,
          },
        });

        await this.prisma.portfolioHolding.upsert({
          where: {
            portfolioId_stockId: {
              portfolioId: portfolio.id,
              stockId: stock.id,
            },
          },
          update: {},
          create: {
            portfolioId: portfolio.id,
            stockId: stock.id,
            quantity: item.qty,
            costPrice: item.cost,
            sharesUnlocked: item.unlocked,
            sharesT1: item.t1,
            sharesT2: item.t2,
          },
        });
      }

      // Tạo snapshot version 1 (INITIAL)
      await this.prisma.portfolioVersion.create({
        data: {
          portfolioId: portfolio.id,
          versionNumber: 1,
          currentValue: 9379000,
          cashBalance: 164000,
          changeType: 'INITIAL',
          holdingsSnapshot: JSON.stringify(this.initialStockData),
        },
      });

      portfolio = await this.prisma.portfolio.findUnique({
        where: { id: portfolio.id },
        include: { holdings: { include: { stock: true } }, versions: true },
      });
    }

    return portfolio!;
  }

  async getActivePortfolio(userId?: string) {
    const portfolio = await this.ensureDefaultPortfolio(userId);
    const pnlCash = +(portfolio.currentValue - portfolio.initialCapital).toFixed(2);
    const pnlPct = +((pnlCash / portfolio.initialCapital) * 100).toFixed(2);

    return {
      id: portfolio.id,
      userId: portfolio.userId,
      initialCapital: portfolio.initialCapital,
      currentValue: portfolio.currentValue,
      cashBalance: portfolio.cashBalance,
      pnlCash,
      pnlPct,
      status: portfolio.status,
      totalHoldingsCount: portfolio.holdings.length,
      createdAt: portfolio.createdAt.toISOString(),
      updatedAt: portfolio.updatedAt.toISOString(),
    };
  }

  async getAllPortfolios() {
    const portfolios = await this.prisma.portfolio.findMany({
      include: {
        user: true,
        holdings: { include: { stock: true } },
      },
      orderBy: { initialCapital: 'asc' },
    });

    return portfolios.map((p) => {
      const pnlCash = +(p.currentValue - p.initialCapital).toFixed(2);
      const pnlPct = +((pnlCash / p.initialCapital) * 100).toFixed(2);
      return {
        id: p.id,
        userId: p.userId,
        userTier: `${Math.round(p.initialCapital / 1_000_000)}M`,
        userEmail: p.user?.email,
        userName: p.user?.fullName,
        initialCapital: p.initialCapital,
        currentValue: p.currentValue,
        cashBalance: p.cashBalance,
        pnlCash,
        pnlPct,
        status: p.status,
        totalHoldingsCount: p.holdings.length,
        holdings: p.holdings.map((h) => ({
          ma_co_phieu: h.stock.symbol,
          name: h.stock.companyName,
          so_co_phieu: h.quantity,
          gia_von: h.costPrice,
          gia_hien_tai: h.stock.currentPrice,
          status: h.sharesT2 > 0 ? 'LOCKED_T2' : h.sharesT1 > 0 ? 'LOCKED_T1' : 'UNLOCKED',
          shares_unlocked: h.sharesUnlocked,
          shares_t1: h.sharesT1,
          shares_t2: h.sharesT2,
        })),
      };
    });
  }

  async getPortfolioByIdOrTier(idOrTier: string) {
    let portfolio: any = null;
    const lower = idOrTier.toLowerCase();

    if (lower === '10m' || lower === '10000000') {
      portfolio = await this.prisma.portfolio.findFirst({
        where: { initialCapital: 10000000 },
        include: { user: true, holdings: { include: { stock: true } } },
      });
    } else if (lower === '20m' || lower === '20000000') {
      portfolio = await this.prisma.portfolio.findFirst({
        where: { initialCapital: 20000000 },
        include: { user: true, holdings: { include: { stock: true } } },
      });
    } else if (lower === '100m' || lower === '100000000') {
      portfolio = await this.prisma.portfolio.findFirst({
        where: { initialCapital: 100000000 },
        include: { user: true, holdings: { include: { stock: true } } },
      });
    } else {
      portfolio = await this.prisma.portfolio.findUnique({
        where: { id: idOrTier },
        include: { user: true, holdings: { include: { stock: true } } },
      });
    }

    if (!portfolio) {
      return this.getActivePortfolio();
    }

    const pnlCash = +(portfolio.currentValue - portfolio.initialCapital).toFixed(2);
    const pnlPct = +((pnlCash / portfolio.initialCapital) * 100).toFixed(2);

    return {
      id: portfolio.id,
      userId: portfolio.userId,
      userTier: `${Math.round(portfolio.initialCapital / 1_000_000)}M`,
      userEmail: portfolio.user?.email,
      userName: portfolio.user?.fullName,
      initialCapital: portfolio.initialCapital,
      currentValue: portfolio.currentValue,
      cashBalance: portfolio.cashBalance,
      pnlCash,
      pnlPct,
      status: portfolio.status,
      totalHoldingsCount: portfolio.holdings.length,
      holdings: portfolio.holdings.map((h: any) => ({
        ma_co_phieu: h.stock.symbol,
        name: h.stock.companyName,
        so_co_phieu: h.quantity,
        gia_von: h.costPrice,
        gia_hien_tai: h.stock.currentPrice,
        status: h.sharesT2 > 0 ? 'LOCKED_T2' : h.sharesT1 > 0 ? 'LOCKED_T1' : 'UNLOCKED',
        shares_unlocked: h.sharesUnlocked,
        shares_t1: h.sharesT1,
        shares_t2: h.sharesT2,
      })),
    };
  }

  async getPortfolioHoldings(portfolioId: string) {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
      include: { holdings: { include: { stock: true } } },
    });

    if (!portfolio) {
      throw new NotFoundException(`Không tìm thấy danh mục với ID: ${portfolioId}`);
    }

    return portfolio.holdings.map((h) => {
      const stockVal = h.quantity * h.stock.currentPrice;
      const weight = +(stockVal / (portfolio.currentValue || 1)).toFixed(3);
      let status = 'UNLOCKED';
      if (h.sharesT2 > 0) status = 'LOCKED_T2';
      else if (h.sharesT1 > 0) status = 'LOCKED_T1';

      return {
        id: h.id,
        stockId: h.stockId,
        symbol: h.stock.symbol,
        companyName: h.stock.companyName,
        quantity: h.quantity,
        costPrice: h.costPrice,
        currentPrice: h.stock.currentPrice,
        sharesUnlocked: h.sharesUnlocked,
        sharesT1: h.sharesT1,
        sharesT2: h.sharesT2,
        status,
        weight,
      };
    });
  }

  async getPortfolioVersions(portfolioId: string) {
    return this.prisma.portfolioVersion.findMany({
      where: { portfolioId },
      orderBy: { versionNumber: 'desc' },
    });
  }

  /**
   * Thực thi tái cơ cấu danh mục dựa trên danh sách phân bổ khuyến nghị
   */
  async executeRebalance(
    portfolioId: string,
    allocations: Array<{
      symbol: string;
      action: string;
      sharesAllocated: number;
      targetPrice: number;
    }>,
  ) {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
      include: { holdings: { include: { stock: true } } },
    });

    if (!portfolio) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    let updatedCash = portfolio.cashBalance;

    for (const alloc of allocations) {
      const stock = await this.prisma.stock.findUnique({
        where: { symbol: alloc.symbol.toUpperCase() },
      });
      if (!stock) continue;

      const price = alloc.targetPrice > 0 ? alloc.targetPrice : stock.currentPrice;
      const shares = alloc.sharesAllocated || 100;

      if (alloc.action === 'BUY') {
        const cost = shares * price;
        // Kiểm tra tiền mặt hoặc cho phép khớp lệnh mô phỏng
        if (updatedCash >= cost) {
          updatedCash -= cost;
        }

        const existingHolding = portfolio.holdings.find((h) => h.stockId === stock.id);
        if (existingHolding) {
          const newQty = existingHolding.quantity + shares;
          const newCost = (existingHolding.quantity * existingHolding.costPrice + cost) / newQty;

          await this.prisma.portfolioHolding.update({
            where: { id: existingHolding.id },
            data: {
              quantity: newQty,
              costPrice: +newCost.toFixed(2),
              sharesT2: existingHolding.sharesT2 + shares, // Cổ phiếu mua mới chờ về T+2
            },
          });
        } else {
          await this.prisma.portfolioHolding.create({
            data: {
              portfolioId: portfolio.id,
              stockId: stock.id,
              quantity: shares,
              costPrice: price,
              sharesUnlocked: 0,
              sharesT1: 0,
              sharesT2: shares,
            },
          });
        }
      }
    }

    // Tính lại NAV danh mục
    const allHoldings = await this.prisma.portfolioHolding.findMany({
      where: { portfolioId: portfolio.id },
      include: { stock: true },
    });
    const totalStockValue = allHoldings.reduce((sum, h) => sum + h.quantity * h.stock.currentPrice, 0);
    const newNAV = +(updatedCash + totalStockValue).toFixed(2);

    await this.prisma.portfolio.update({
      where: { id: portfolio.id },
      data: {
        cashBalance: +updatedCash.toFixed(2),
        currentValue: newNAV,
      },
    });

    // Tạo bản ghi snapshot version
    const lastVersion = await this.prisma.portfolioVersion.findFirst({
      where: { portfolioId: portfolio.id },
      orderBy: { versionNumber: 'desc' },
    });
    const nextVersionNum = (lastVersion?.versionNumber || 1) + 1;

    const snapshotRecord = await this.prisma.portfolioVersion.create({
      data: {
        portfolioId: portfolio.id,
        versionNumber: nextVersionNum,
        currentValue: newNAV,
        cashBalance: +updatedCash.toFixed(2),
        changeType: 'REBALANCE',
        holdingsSnapshot: JSON.stringify(
          allHoldings.map((h) => ({
            symbol: h.stock.symbol,
            qty: h.quantity,
            cost: h.costPrice,
            price: h.stock.currentPrice,
            unlocked: h.sharesUnlocked,
            t1: h.sharesT1,
            t2: h.sharesT2,
          })),
        ),
      },
    });

    return {
      portfolioId: portfolio.id,
      previousNav: portfolio.currentValue,
      newNav: newNAV,
      remainingCash: +updatedCash.toFixed(2),
      versionNumber: nextVersionNum,
      snapshotId: snapshotRecord.id,
    };
  }

  /**
   * Ghi nhận lệnh giao dịch Mua / Bán thủ công từ người dùng
   */
  async createOrder(portfolioId: string, dto: CreateOrderDto) {
    if (dto.quantity % 100 !== 0 || dto.quantity <= 0) {
      throw new BadRequestException('Khối lượng giao dịch bắt buộc phải là bội số của lô 100 cổ phiếu (ví dụ: 100, 200, 500).');
    }
    if (dto.price <= 0) {
      throw new BadRequestException('Giá khớp lệnh phải lớn hơn 0.');
    }

    const symbol = dto.symbol.toUpperCase().trim();
    let stock = await this.prisma.stock.findUnique({
      where: { symbol },
    });
    if (!stock) {
      stock = await this.prisma.stock.create({
        data: {
          symbol,
          companyName: `Cổ phiếu ${symbol}`,
          exchange: 'HOSE',
          currentPrice: dto.price,
        },
      });
    }

    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
      include: { holdings: { include: { stock: true } } },
    });

    if (!portfolio) {
      throw new NotFoundException(`Không tìm thấy danh mục ID: ${portfolioId}`);
    }

    if (dto.action === 'BUY') {
      const totalCost = dto.quantity * dto.price;
      if (portfolio.cashBalance < totalCost) {
        throw new BadRequestException(
          `Số dư tiền mặt không đủ để thực hiện lệnh mua. Cần ${new Intl.NumberFormat('vi-VN').format(totalCost)} đ nhưng số dư chỉ còn ${new Intl.NumberFormat('vi-VN').format(portfolio.cashBalance)} đ.`
        );
      }
      const newCash = portfolio.cashBalance - totalCost;

      const existingHolding = portfolio.holdings.find((h) => h.stockId === stock.id);
      if (existingHolding) {
        const newQty = existingHolding.quantity + dto.quantity;
        const newCost = (existingHolding.quantity * existingHolding.costPrice + totalCost) / newQty;
        await this.prisma.portfolioHolding.update({
          where: { id: existingHolding.id },
          data: {
            quantity: newQty,
            costPrice: +newCost.toFixed(2),
            sharesT2: existingHolding.sharesT2 + dto.quantity,
          },
        });
      } else {
        await this.prisma.portfolioHolding.create({
          data: {
            portfolioId: portfolio.id,
            stockId: stock.id,
            quantity: dto.quantity,
            costPrice: dto.price,
            sharesUnlocked: 0,
            sharesT1: 0,
            sharesT2: dto.quantity,
          },
        });
      }

      const updatedHoldings = await this.prisma.portfolioHolding.findMany({
        where: { portfolioId: portfolio.id },
        include: { stock: true },
      });
      const totalStockVal = updatedHoldings.reduce((sum, h) => sum + h.quantity * (h.stock.currentPrice || h.costPrice), 0);
      const newNav = +(newCash + totalStockVal).toFixed(2);

      await this.prisma.portfolio.update({
        where: { id: portfolio.id },
        data: {
          cashBalance: +newCash.toFixed(2),
          currentValue: newNav,
        },
      });

      const order = await this.prisma.orderTransaction.create({
        data: {
          portfolioId: portfolio.id,
          stockId: stock.id,
          action: 'BUY',
          quantity: dto.quantity,
          price: dto.price,
          totalValue: totalCost,
          realizedPnl: null,
          status: 'COMPLETED',
          notes: dto.notes || `Mua thủ công ${dto.quantity} cp ${symbol} giá ${dto.price}`,
          orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
        },
        include: { stock: true },
      });

      const lastVer = await this.prisma.portfolioVersion.findFirst({
        where: { portfolioId: portfolio.id },
        orderBy: { versionNumber: 'desc' },
      });
      const nextVer = (lastVer?.versionNumber || 1) + 1;

      await this.prisma.portfolioVersion.create({
        data: {
          portfolioId: portfolio.id,
          versionNumber: nextVer,
          currentValue: newNav,
          cashBalance: +newCash.toFixed(2),
          changeType: 'MANUAL_BUY',
          holdingsSnapshot: JSON.stringify(
            updatedHoldings.map((h) => ({
              symbol: h.stock.symbol,
              qty: h.quantity,
              cost: h.costPrice,
              price: h.stock.currentPrice,
              unlocked: h.sharesUnlocked,
              t1: h.sharesT1,
              t2: h.sharesT2,
            })),
          ),
        },
      });

      await this.prisma.notification.create({
        data: {
          userId: portfolio.userId,
          title: `Khớp lệnh MUA: ${symbol}`,
          message: `Đã ghi nhận mua ${dto.quantity} cp ${symbol} tại mức giá ${dto.price.toLocaleString('vi-VN')} đ. Cổ phiếu dự kiến về tài khoản vào ngày T+2.`,
          type: 'ORDER_EXECUTION',
          status: 'UNREAD',
        },
      });

      return {
        success: true,
        order,
        portfolio: {
          id: portfolio.id,
          cashBalance: +newCash.toFixed(2),
          currentValue: newNav,
        },
      };
    } else {
      // SELL Logic
      const existingHolding = portfolio.holdings.find((h) => h.stockId === stock.id);
      if (!existingHolding || existingHolding.sharesUnlocked < dto.quantity) {
        const available = existingHolding ? existingHolding.sharesUnlocked : 0;
        const pendingT = existingHolding ? existingHolding.sharesT1 + existingHolding.sharesT2 : 0;
        throw new BadRequestException(
          `Không đủ cổ phiếu khả dụng để bán. Cổ phiếu ${symbol} hiện chỉ có ${available} cp khả dụng${pendingT > 0 ? ` (${pendingT} cp đang chờ chu kỳ T+ chưa về tài khoản)` : ''}.`,
        );
      }

      const totalRevenue = dto.quantity * dto.price;
      const costOfSoldShares = dto.quantity * existingHolding.costPrice;
      const realizedPnl = +(totalRevenue - costOfSoldShares).toFixed(2);
      const newCash = portfolio.cashBalance + totalRevenue;

      const remainQty = existingHolding.quantity - dto.quantity;
      const remainUnlocked = existingHolding.sharesUnlocked - dto.quantity;

      if (remainQty <= 0) {
        await this.prisma.portfolioHolding.delete({
          where: { id: existingHolding.id },
        });
      } else {
        await this.prisma.portfolioHolding.update({
          where: { id: existingHolding.id },
          data: {
            quantity: remainQty,
            sharesUnlocked: remainUnlocked,
          },
        });
      }

      const updatedHoldings = await this.prisma.portfolioHolding.findMany({
        where: { portfolioId: portfolio.id },
        include: { stock: true },
      });
      const totalStockVal = updatedHoldings.reduce((sum, h) => sum + h.quantity * (h.stock.currentPrice || h.costPrice), 0);
      const newNav = +(newCash + totalStockVal).toFixed(2);

      await this.prisma.portfolio.update({
        where: { id: portfolio.id },
        data: {
          cashBalance: +newCash.toFixed(2),
          currentValue: newNav,
        },
      });

      const order = await this.prisma.orderTransaction.create({
        data: {
          portfolioId: portfolio.id,
          stockId: stock.id,
          action: 'SELL',
          quantity: dto.quantity,
          price: dto.price,
          totalValue: totalRevenue,
          realizedPnl,
          status: 'COMPLETED',
          notes: dto.notes || `Bán thủ công ${dto.quantity} cp ${symbol} giá ${dto.price}`,
          orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
        },
        include: { stock: true },
      });

      const lastVer = await this.prisma.portfolioVersion.findFirst({
        where: { portfolioId: portfolio.id },
        orderBy: { versionNumber: 'desc' },
      });
      const nextVer = (lastVer?.versionNumber || 1) + 1;

      await this.prisma.portfolioVersion.create({
        data: {
          portfolioId: portfolio.id,
          versionNumber: nextVer,
          currentValue: newNav,
          cashBalance: +newCash.toFixed(2),
          changeType: 'MANUAL_SELL',
          holdingsSnapshot: JSON.stringify(
            updatedHoldings.map((h) => ({
              symbol: h.stock.symbol,
              qty: h.quantity,
              cost: h.costPrice,
              price: h.stock.currentPrice,
              unlocked: h.sharesUnlocked,
              t1: h.sharesT1,
              t2: h.sharesT2,
            })),
          ),
        },
      });

      const pnlSign = realizedPnl >= 0 ? '+' : '';
      await this.prisma.notification.create({
        data: {
          userId: portfolio.userId,
          title: `Khớp lệnh BÁN: ${symbol}`,
          message: `Đã ghi nhận bán ${dto.quantity} cp ${symbol} tại giá ${dto.price.toLocaleString('vi-VN')} đ. Lãi/lỗ thực tế: ${pnlSign}${realizedPnl.toLocaleString('vi-VN')} đ. Tiền mặt đã được cộng vào tài khoản.`,
          type: 'ORDER_EXECUTION',
          status: 'UNREAD',
        },
      });

      return {
        success: true,
        order,
        portfolio: {
          id: portfolio.id,
          cashBalance: +newCash.toFixed(2),
          currentValue: newNav,
        },
      };
    }
  }

  /**
   * Lấy danh sách sổ lệnh giao dịch của danh mục
   */
  async getOrderTransactions(portfolioId: string) {
    return this.prisma.orderTransaction.findMany({
      where: { portfolioId },
      include: { stock: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
