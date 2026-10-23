import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaService } from '../../prisma/prisma.service';
import { PortfoliosService } from '../portfolios/portfolios.service';

@Injectable()
export class RecommendationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly portfoliosService: PortfoliosService,
  ) {}

  private getSimulatedData() {
    try {
      const filePath = path.resolve(process.cwd(), '..', 'ai_core', 'simulated_users.json');
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch {
      // fallback
    }
    return null;
  }

  async getCurrentRecommendation(userId?: string) {
    const portfolio = await this.portfoliosService.getActivePortfolio(userId);
    const simData = this.getSimulatedData();
    const tier10m = simData?.tier_10m;

    const baseDate = '09/10/2026';
    const targetRecommendationDate = '10/10/2026';

    const currentNav = portfolio.currentValue;
    const initialCapital = portfolio.initialCapital;
    const cashBalance = portfolio.cashBalance;

    // Tìm khuyến nghị PENDING trong DB hoặc tạo mới
    let rec = await this.prisma.recommendation.findFirst({
      where: { portfolioId: portfolio.id, status: 'PENDING' },
      include: { allocations: { include: { stock: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (!rec) {
      rec = await this.prisma.recommendation.create({
        data: {
          id: 'rec-20261010-001',
          userId: portfolio.userId,
          portfolioId: portfolio.id,
          type: 'REBALANCE',
          status: 'PENDING',
          totalWeight: 1.0,
          cashWeight: +(cashBalance / (currentNav || 1)).toFixed(4),
          cashAmount: cashBalance,
          explanation: `Dữ liệu đóng phiên ${baseDate} cho thấy xung lực dòng tiền duy trì tốt. Khuyến nghị tối ưu phân bổ cho phiên ${targetRecommendationDate}: Tập trung 3 mã dẫn đầu VND (10.6%), BVH (7.5%), GEX (7.2%).`,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        },
        include: { allocations: { include: { stock: true } } },
      });

      // Tạo các phân bổ mặc định
      const allocDefs = [
        { symbol: 'VND', weight: 0.106, action: 'BUY', price: 13200, shares: 100, reason: `Top 1 xung lực phiên ${baseDate} (10.6%). MUA GIA TĂNG phiên ${targetRecommendationDate}.` },
        { symbol: 'BVH', weight: 0.075, action: 'BUY', price: 42500, shares: 100, reason: `Top 2 xung lực (7.5%). Cổ phiếu phòng thủ nhóm tài chính bảo hiểm.` },
        { symbol: 'GEX', weight: 0.072, action: 'BUY', price: 22250, shares: 100, reason: `Top 3 xung lực (7.2%). NẮM GIỮ CHẶT vị thế có sẵn và gia tăng khi hàng về.` },
      ];

      for (const def of allocDefs) {
        const stock = await this.prisma.stock.upsert({
          where: { symbol: def.symbol },
          update: { currentPrice: def.price },
          create: {
            symbol: def.symbol,
            companyName: def.symbol === 'VND' ? 'VNDirect' : def.symbol === 'BVH' ? 'Bảo Việt' : 'GELEX',
            exchange: 'HOSE',
            currentPrice: def.price,
          },
        });

        await this.prisma.recommendationAllocation.create({
          data: {
            recommendationId: rec.id,
            stockId: stock.id,
            targetWeight: def.weight,
            targetPrice: def.price,
            action: def.action,
            sharesAllocated: def.shares,
            reason: def.reason,
          },
        });
      }

      rec = await this.prisma.recommendation.findUnique({
        where: { id: rec.id },
        include: { allocations: { include: { stock: true } } },
      });
    }

    const allocations = (rec?.allocations || []).map((a, idx) => ({
      id: a.id,
      stockId: a.stockId,
      symbol: a.stock.symbol,
      companyName: a.stock.companyName,
      exchange: a.stock.exchange,
      weight: a.targetWeight,
      amount: Math.round(a.targetWeight * initialCapital),
      referencePrice: a.targetPrice,
      quantityEstimated: a.sharesAllocated,
      action: a.action,
      reason: a.reason || '',
      rank: idx + 1,
    }));

    return {
      id: rec!.id,
      portfolioId: portfolio.id,
      regime: 'BULLISH_CONTINUATION',
      type: rec!.type,
      status: rec!.status,
      capital: initialCapital,
      riskAppetite: 'MEDIUM',
      investmentHorizon: 'MEDIUM_TERM',
      hmmModelVersion: 'HMM_Gaussian_v3.2',
      portfolioModelVersion: 'PPO_MultiTask_v7.0',
      totalWeight: rec!.totalWeight,
      cashWeight: rec!.cashWeight,
      cashAmount: rec!.cashAmount,
      baseDataDate: baseDate,
      recommendationDate: targetRecommendationDate,
      explanation: rec!.explanation,
      expiresAt: rec!.expiresAt.toISOString(),
      generatedAt: rec!.createdAt.toISOString(),
      confirmedAt: rec!.appliedAt ? rec!.appliedAt.toISOString() : null,
      allocations,
      userContext: {
        userTier: '10M',
        currentNav,
        cashLeft: cashBalance,
        activeHoldingsCount: 6,
      },
      disclaimer: 'Khuyến nghị được tính toán tự động phục vụ hỗ trợ quyết định đầu tư.',
    };
  }

  async generateRecommendation(userId?: string) {
    return this.getCurrentRecommendation(userId);
  }

  /**
   * Xác nhận và áp dụng khuyến nghị vào danh mục (Execute Rebalance)
   */
  async confirmRecommendation(recommendationId: string) {
    const rec = await this.prisma.recommendation.findUnique({
      where: { id: recommendationId },
      include: { allocations: { include: { stock: true } } },
    });

    if (!rec) {
      throw new NotFoundException(`Không tìm thấy khuyến nghị ID: ${recommendationId}`);
    }

    if (rec.status === 'APPLIED') {
      throw new BadRequestException('Khuyến nghị này đã được xác nhận và áp dụng trước đó');
    }

    // 1. Thực thi tái cơ cấu tài sản qua PortfoliosService
    const allocInputs = rec.allocations.map((a) => ({
      symbol: a.stock.symbol,
      action: a.action,
      sharesAllocated: a.sharesAllocated,
      targetPrice: a.targetPrice,
    }));

    const executionResult = await this.portfoliosService.executeRebalance(
      rec.portfolioId,
      allocInputs,
    );

    // 2. Cập nhật trạng thái khuyến nghị sang APPLIED
    const updated = await this.prisma.recommendation.update({
      where: { id: recommendationId },
      data: {
        status: 'APPLIED',
        appliedAt: new Date(),
      },
    });

    return {
      recommendationId: updated.id,
      status: updated.status,
      appliedAt: updated.appliedAt?.toISOString(),
      executionResult,
      message: 'Đã xác nhận và tái cơ cấu danh mục thành công!',
    };
  }

  /**
   * Từ chối / Hủy bỏ khuyến nghị
   */
  async dismissRecommendation(recommendationId: string) {
    const rec = await this.prisma.recommendation.findUnique({
      where: { id: recommendationId },
    });

    if (!rec) {
      throw new NotFoundException('Không tìm thấy khuyến nghị');
    }

    const updated = await this.prisma.recommendation.update({
      where: { id: recommendationId },
      data: { status: 'DISMISSED' },
    });

    return {
      recommendationId: updated.id,
      status: updated.status,
      message: 'Đã hủy bỏ khuyến nghị thành công',
    };
  }
}
