import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  private async getUserId(userId?: string): Promise<string> {
    if (userId) return userId;
    const user = await this.prisma.user.findFirst();
    return user ? user.id : 'd0000000-0000-0000-0000-000000000001';
  }

  async getNotifications(userId?: string) {
    const targetUserId = await this.getUserId(userId);
    let list = await this.prisma.notification.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    if (list.length === 0) {
      // Seed default sample notifications
      const defaults = [
        {
          userId: targetUserId,
          title: 'Khuyến nghị phân bổ phiên 10/10/2026',
          message: 'Hệ thống AI Quantum đã sinh khuyến nghị tối ưu cho phiên 10/10/2026: Ưu tiên gom VND, BVH, GEX.',
          type: 'RECOMMENDATION',
          status: 'UNREAD',
          metadata: JSON.stringify({ recommendationId: 'rec-20261010-001' }),
        },
        {
          userId: targetUserId,
          title: 'Cổ phiếu DPM, GEX, HT1 sắp về tài khoản',
          message: 'Lô 100 cp DPM, 100 cp GEX và 100 cp HT1 đang ở trạng thái T+1, dự kiến về khả dụng phiên tiếp theo.',
          type: 'SETTLEMENT_T',
          status: 'READ',
          metadata: JSON.stringify({ t1Count: 3 }),
        },
        {
          userId: targetUserId,
          title: 'Thị trường giữ vững trạng thái Bullish',
          message: 'Mô hình HMM xác nhận thị trường duy trì xu hướng tăng trưởng (xác suất 0.854).',
          type: 'REGIME_CHANGE',
          status: 'READ',
          metadata: JSON.stringify({ regime: 'BULL' }),
        },
      ];

      for (const d of defaults) {
        await this.prisma.notification.create({ data: d });
      }

      list = await this.prisma.notification.findMany({
        where: { userId: targetUserId },
        orderBy: { createdAt: 'desc' },
      });
    }

    return list.map((n) => ({
      id: n.id,
      userId: n.userId,
      title: n.title,
      message: n.message,
      type: n.type,
      status: n.status,
      readAt: n.readAt?.toISOString() || null,
      createdAt: n.createdAt.toISOString(),
      metadata: n.metadata ? JSON.parse(n.metadata) : null,
    }));
  }

  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: string = 'RECOMMENDATION',
    metadata?: any,
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        status: 'UNREAD',
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  }

  async markAsRead(id: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif) {
      throw new NotFoundException(`Không tìm thấy thông báo ID: ${id}`);
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });
  }

  async applyNotification(id: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif) {
      throw new NotFoundException(`Không tìm thấy thông báo ID: ${id}`);
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        status: 'APPLIED',
        readAt: new Date(),
      },
    });
  }
}
