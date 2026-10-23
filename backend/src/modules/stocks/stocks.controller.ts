import { Controller, Get, Param } from '@nestjs/common';
import { StocksService } from './stocks.service';

@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Get()
  async getAll() {
    const data = await this.stocksService.getAll();
    return { success: true, data };
  }

  @Get(':symbol')
  async getBySymbol(@Param('symbol') symbol: string) {
    const data = await this.stocksService.getBySymbol(symbol);
    return { success: true, data };
  }
}
