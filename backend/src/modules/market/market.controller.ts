import { Controller, Get, Post } from '@nestjs/common';
import { MarketService } from './market.service';

@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('regimes/current')
  async getCurrentRegime() {
    const data = await this.marketService.getCurrentRegime();
    return { success: true, data };
  }

  @Get('regimes/history')
  async getRegimeHistory() {
    const data = await this.marketService.getRegimeHistory();
    return { success: true, data };
  }

  @Post('regimes/detect')
  async detectRegime() {
    const data = await this.marketService.detectAndPersistRegime();
    return { success: true, data };
  }
}
