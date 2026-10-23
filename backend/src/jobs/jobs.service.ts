import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../modules/notifications/notification.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Cron Job: Chạy lúc 15:05 mỗi ngày giao dịch (Thứ Hai đến Thứ Sáu)
   * Vòng quay thanh toán T+: Chuyển T+2 sang T+1, và T+1 sang Khả dụng (Unlocked)
   */
  @Cron('0 5 15 * * 1-5')
  async handleDailySettlement() {
    this.logger.log('⏰ Bắt đầu xử lý chu kỳ thanh toán T+ cuối phiên giao dịch...');
    return this.triggerDailySettlement();
  }

  /**
   * Phương thức thực thi chuyển trạng thái T+ (có thể gọi tự động từ Cron hoặc thủ công trong test)
   */
  async triggerDailySettlement() {
    const holdings = await this.prisma.portfolioHolding.findMany({
      where: {
        OR: [{ sharesT1: { gt: 0 } }, { sharesT2: { gt: 0 } }],
      },
      include: {
        stock: true,
        portfolio: { include: { user: true } },
      },
    });

    let settledCount = 0;

    for (const h of holdings) {
      const arrivedToUnlocked = h.sharesT1;
      const arrivedToT1 = h.sharesT2;

      const newUnlocked = h.sharesUnlocked + arrivedToUnlocked;
      const newT1 = arrivedToT1;
      const newT2 = 0;

      await this.prisma.portfolioHolding.update({
        where: { id: h.id },
        data: {
          sharesUnlocked: newUnlocked,
          sharesT1: newT1,
          sharesT2: newT2,
        },
      });

      // Nếu có cổ phiếu về khả dụng, tạo thông báo cho người dùng
      if (arrivedToUnlocked > 0 && h.portfolio?.userId) {
        await this.notificationService.createNotification(
          h.portfolio.userId,
          `Cổ phiếu ${h.stock.symbol} đã về tài khoản`,
          `Lô ${arrivedToUnlocked} cổ phiếu ${h.stock.symbol} đã hoàn tất thanh toán T+ và sẵn sàng giao dịch.`,
          'SETTLEMENT_T',
          { symbol: h.stock.symbol, shares: arrivedToUnlocked },
        );
      }

      settledCount++;
    }

    this.logger.log(`✅ Đã hoàn tất xử lý vòng quay T+ cho ${settledCount} vị thế cổ phiếu.`);
    return { settledCount };
  }

  /**
   * Cron Job: Chạy mỗi giờ để kiểm tra và hết hạn các khuyến nghị quá thời gian
   */
  @Cron('0 * * * *')
  async handleRecommendationExpiry() {
    const now = new Date();
    const expired = await this.prisma.recommendation.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: now },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    if (expired.count > 0) {
      this.logger.log(`⚠️ Đã hết hạn ${expired.count} khuyến nghị quá thời gian.`);
    }
    return expired;
  }
}
