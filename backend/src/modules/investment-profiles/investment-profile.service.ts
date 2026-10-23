import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvestmentProfileDto, UpdateInvestmentProfileDto } from './dto/investment-profile.dto';

@Injectable()
export class InvestmentProfileService {
  constructor(private readonly prisma: PrismaService) {}

  private async getUserId(userId?: string): Promise<string> {
    if (userId) return userId;
    const user = await this.prisma.user.findFirst();
    return user ? user.id : 'd0000000-0000-0000-0000-000000000001';
  }

  async createProfile(dto: CreateInvestmentProfileDto, userId?: string) {
    const targetUserId = await this.getUserId(userId);

    // Vô hiệu hóa profile cũ nếu có
    await this.prisma.investmentProfile.updateMany({
      where: { userId: targetUserId, isActive: true },
      data: { isActive: false },
    });

    const profile = await this.prisma.investmentProfile.create({
      data: {
        userId: targetUserId,
        capital: dto.capital,
        riskAppetite: dto.riskAppetite,
        investmentHorizon: dto.investmentHorizon,
        expectedReturn: dto.expectedReturn ?? 15.0,
        maximumDrawdown: dto.maximumDrawdown ?? 10.0,
        isActive: true,
      },
    });

    return profile;
  }

  async getCurrentProfile(userId?: string) {
    const targetUserId = await this.getUserId(userId);
    let profile = await this.prisma.investmentProfile.findFirst({
      where: { userId: targetUserId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!profile) {
      // Khởi tạo profile mặc định 10M
      profile = await this.prisma.investmentProfile.create({
        data: {
          userId: targetUserId,
          capital: 10000000,
          riskAppetite: 'MEDIUM',
          investmentHorizon: 'MEDIUM_TERM',
          expectedReturn: 15.0,
          maximumDrawdown: 10.0,
          isActive: true,
        },
      });
    }

    return profile;
  }

  async updateCurrentProfile(userId: string | undefined, dto: UpdateInvestmentProfileDto) {
    const current = await this.getCurrentProfile(userId);
    return this.updateProfile(current.id, dto);
  }

  async updateProfile(id: string, dto: UpdateInvestmentProfileDto) {
    const profile = await this.prisma.investmentProfile.findUnique({
      where: { id },
    });

    if (!profile) {
      throw new NotFoundException(`Không tìm thấy hồ sơ đầu tư với ID: ${id}`);
    }

    return this.prisma.investmentProfile.update({
      where: { id },
      data: {
        ...(dto.capital !== undefined && { capital: dto.capital }),
        ...(dto.riskAppetite !== undefined && { riskAppetite: dto.riskAppetite }),
        ...(dto.investmentHorizon !== undefined && { investmentHorizon: dto.investmentHorizon }),
        ...(dto.expectedReturn !== undefined && { expectedReturn: dto.expectedReturn }),
        ...(dto.maximumDrawdown !== undefined && { maximumDrawdown: dto.maximumDrawdown }),
      },
    });
  }
}
