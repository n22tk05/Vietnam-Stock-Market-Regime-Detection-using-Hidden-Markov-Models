import { Controller, Get, Post, Param, Body, Req } from '@nestjs/common';
import { PortfoliosService } from './portfolios.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('portfolios')
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) {}

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
  async getPortfolios() {
    const list = await this.portfoliosService.getAllPortfolios();
    return { success: true, data: list };
  }

  @Get('current')
  async getCurrentPortfolio(@Req() req: any) {
    const userId = this.extractUserId(req);
    const portfolio = await this.portfoliosService.getActivePortfolio(userId);
    return { success: true, data: portfolio };
  }

  @Get('current/holdings')
  async getCurrentPortfolioHoldings(@Req() req: any) {
    const userId = this.extractUserId(req);
    const portfolio = await this.portfoliosService.getActivePortfolio(userId);
    const holdings = await this.portfoliosService.getPortfolioHoldings(portfolio.id);
    return { success: true, data: holdings };
  }

  @Get('current/versions')
  async getCurrentPortfolioVersions(@Req() req: any) {
    const userId = this.extractUserId(req);
    const portfolio = await this.portfoliosService.getActivePortfolio(userId);
    const versions = await this.portfoliosService.getPortfolioVersions(portfolio.id);
    return { success: true, data: versions };
  }

  @Get('current/orders')
  async getCurrentPortfolioOrders(@Req() req: any) {
    const userId = this.extractUserId(req);
    const portfolio = await this.portfoliosService.getActivePortfolio(userId);
    const orders = await this.portfoliosService.getOrderTransactions(portfolio.id);
    return { success: true, data: orders };
  }

  @Get(':id')
  async getPortfolioById(@Param('id') id: string) {
    const portfolio = await this.portfoliosService.getPortfolioByIdOrTier(id);
    return { success: true, data: portfolio };
  }

  @Get(':id/holdings')
  async getPortfolioHoldings(@Param('id') id: string) {
    const holdings = await this.portfoliosService.getPortfolioHoldings(id);
    return { success: true, data: holdings };
  }

  @Get(':id/versions')
  async getPortfolioVersions(@Param('id') id: string) {
    const versions = await this.portfoliosService.getPortfolioVersions(id);
    return { success: true, data: versions };
  }

  @Post(':id/rebalance')
  async rebalancePortfolio(
    @Param('id') id: string,
    @Body()
    body: {
      allocations: Array<{
        symbol: string;
        action: string;
        sharesAllocated: number;
        targetPrice: number;
      }>;
    },
  ) {
    const data = await this.portfoliosService.executeRebalance(id, body.allocations || []);
    return { success: true, data };
  }

  @Post(':id/orders')
  async createOrder(@Param('id') id: string, @Body() dto: CreateOrderDto) {
    const result = await this.portfoliosService.createOrder(id, dto);
    return { success: true, data: result };
  }

  @Get(':id/orders')
  async getOrderTransactions(@Param('id') id: string) {
    const orders = await this.portfoliosService.getOrderTransactions(id);
    return { success: true, data: orders };
  }
}
