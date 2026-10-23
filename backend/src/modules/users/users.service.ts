import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile() {
    let user = await this.prisma.user.findFirst();
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          id: 'd0000000-0000-0000-0000-000000000001',
          email: 'nha-dau-tu@aiquantum.vn',
          fullName: 'Nhà Đầu Tư Cá Nhân',
          passwordHash: '$2b$12$simulated_password_hash',
          role: 'USER',
          status: 'ACTIVE',
        },
      });
    }
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async updateProfile(payload: { email?: string; fullName?: string }) {
    const user = await this.prisma.user.findFirst();
    if (!user) return this.getProfile();

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: payload.email ?? user.email,
        fullName: payload.fullName ?? user.fullName,
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      role: updated.role,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async getPreferences() {
    const user = await this.prisma.user.findFirst();
    return {
      id: 'pref-default-1',
      userId: user ? user.id : 'd0000000-0000-0000-0000-000000000001',
      emailNotifications: true,
      inAppNotifications: true,
      language: 'vi',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
