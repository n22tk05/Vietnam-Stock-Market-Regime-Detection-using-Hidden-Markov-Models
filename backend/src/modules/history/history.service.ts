import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  private getSimulatedHistory() {
    try {
      const filePath = path.resolve(process.cwd(), '..', 'ai_core', 'simulated_users.json');
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        return data.tier_10m?.history || [];
      }
    } catch {
      // fallback
    }
    return [];
  }

  async getNavHistory(portfolioId?: string) {
    // Ưu tiên đọc từ DB nếu đã có
    if (portfolioId) {
      const dbRecords = await this.prisma.navHistory.findMany({
        where: { portfolioId },
        orderBy: { createdAt: 'asc' },
      });
      if (dbRecords.length > 0) return dbRecords;
    }

    // Đọc từ chuỗi lịch sử trong simulated_users.json
    const simHistory = this.getSimulatedHistory();
    if (simHistory.length > 0) {
      return simHistory.map((item: any) => ({
        date: item.date,
        nav: item.nav,
        cash: item.cash,
        stockValue: item.stock_value,
        dailyChange: item.daily_change || 0,
        dailyChangePct: item.daily_change_pct || 0,
        topTickers: item.top_tickers || null,
      }));
    }

    return [
      { date: '07/10/2026', nav: 9450000, cash: 164000, stockValue: 9286000, dailyChange: -30000, dailyChangePct: -0.32 },
      { date: '08/10/2026', nav: 9410000, cash: 164000, stockValue: 9246000, dailyChange: -40000, dailyChangePct: -0.42 },
      { date: '09/10/2026', nav: 9379000, cash: 164000, stockValue: 9215000, dailyChange: -31000, dailyChangePct: -0.33 },
    ];
  }

  async getAuditLog(userId?: string) {
    const versions = await this.prisma.portfolioVersion.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return versions.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      action: v.changeType,
      nav: v.currentValue,
      cash: v.cashBalance,
      timestamp: v.createdAt.toISOString(),
      details: `Phiên bản danh mục #${v.versionNumber} được xác nhận sau khi thực thi ${v.changeType}`,
    }));
  }
}
