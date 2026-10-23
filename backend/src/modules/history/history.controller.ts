import { Controller, Get, Query } from '@nestjs/common';
import { HistoryService } from './history.service';

@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get('nav')
  async getNavHistory(@Query('portfolioId') portfolioId?: string) {
    const data = await this.historyService.getNavHistory(portfolioId);
    return { success: true, data };
  }

  @Get('audit')
  async getAuditLog() {
    const data = await this.historyService.getAuditLog();
    return { success: true, data };
  }
}
