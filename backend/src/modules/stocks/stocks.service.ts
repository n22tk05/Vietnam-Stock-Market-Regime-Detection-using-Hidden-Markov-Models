import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StocksService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly defaultStocks = [
    { symbol: 'VND', companyName: 'Chứng khoán VNDirect', exchange: 'HOSE', currentPrice: 13200 },
    { symbol: 'DIG', companyName: 'Tổng Công ty CP Đầu tư Phát triển Xây dựng', exchange: 'HOSE', currentPrice: 9400 },
    { symbol: 'VSC', companyName: 'Công ty Cổ phần Container Việt Nam', exchange: 'HOSE', currentPrice: 13150 },
    { symbol: 'DPM', companyName: 'Tổng Công ty Phân bón & Hóa chất Dầu khí', exchange: 'HOSE', currentPrice: 21900 },
    { symbol: 'GEX', companyName: 'Tập đoàn GELEX', exchange: 'HOSE', currentPrice: 22250 },
    { symbol: 'HT1', companyName: 'Công ty CP Xi măng Vicem Hà Tiên', exchange: 'HOSE', currentPrice: 12250 },
    { symbol: 'BVH', companyName: 'Tập đoàn Bảo Việt', exchange: 'HOSE', currentPrice: 42500 },
    { symbol: 'MWG', companyName: 'Công ty CP Đầu tư Thế Giới Di Động', exchange: 'HOSE', currentPrice: 45600 },
    { symbol: 'VHC', companyName: 'Công ty CP Vĩnh Hoàn', exchange: 'HOSE', currentPrice: 71200 },
  ];

  async getAll() {
    let stocks = await this.prisma.stock.findMany();
    if (stocks.length === 0) {
      for (const s of this.defaultStocks) {
        await this.prisma.stock.upsert({
          where: { symbol: s.symbol },
          update: { currentPrice: s.currentPrice },
          create: s,
        });
      }
      stocks = await this.prisma.stock.findMany();
    }
    return stocks;
  }

  async getBySymbol(symbol: string) {
    const s = await this.prisma.stock.findUnique({
      where: { symbol: symbol.toUpperCase() },
    });
    if (s) return s;
    return this.defaultStocks.find((item) => item.symbol === symbol.toUpperCase()) || null;
  }
}
