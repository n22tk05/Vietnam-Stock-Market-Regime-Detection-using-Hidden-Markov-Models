import { Controller, Get, Post, Patch, Put, Body, Param, Req } from '@nestjs/common';
import { InvestmentProfileService } from './investment-profile.service';
import { CreateInvestmentProfileDto, UpdateInvestmentProfileDto } from './dto/investment-profile.dto';

@Controller(['investment-profile', 'investment-profiles'])
export class InvestmentProfileController {
  constructor(private readonly profileService: InvestmentProfileService) {}

  private extractUserId(req: any): string | undefined {
    if (req.user?.id) return req.user.id;
    if (req.user?.sub) return req.user.sub;
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          return payload.sub || payload.id;
        }
      } catch (e) {
        // ignore
      }
    }
    return undefined;
  }

  @Get()
  async getActive(@Req() req: any) {
    const userId = this.extractUserId(req);
    const data = await this.profileService.getCurrentProfile(userId);
    return { success: true, data };
  }

  @Get('current')
  async getCurrent(@Req() req: any) {
    const userId = this.extractUserId(req);
    const data = await this.profileService.getCurrentProfile(userId);
    return { success: true, data };
  }

  @Post()
  async create(@Body() body: CreateInvestmentProfileDto, @Req() req: any) {
    const userId = this.extractUserId(req);
    const data = await this.profileService.createProfile(body, userId);
    return { success: true, data };
  }

  @Patch()
  async updateCurrent(@Body() body: UpdateInvestmentProfileDto, @Req() req: any) {
    const userId = this.extractUserId(req);
    const data = await this.profileService.updateCurrentProfile(userId, body);
    return { success: true, data };
  }

  @Put()
  async putCurrent(@Body() body: UpdateInvestmentProfileDto, @Req() req: any) {
    const userId = this.extractUserId(req);
    const data = await this.profileService.updateCurrentProfile(userId, body);
    return { success: true, data };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateInvestmentProfileDto) {
    const data = await this.profileService.updateProfile(id, body);
    return { success: true, data };
  }
}
