import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { StocksModule } from './modules/stocks/stocks.module';
import { PortfoliosModule } from './modules/portfolios/portfolios.module';
import { MarketModule } from './modules/market/market.module';
import { RecommendationModule } from './modules/recommendations/recommendation.module';
import { InvestmentProfileModule } from './modules/investment-profiles/investment-profile.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { HistoryModule } from './modules/history/history.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    InvestmentProfileModule,
    StocksModule,
    PortfoliosModule,
    MarketModule,
    RecommendationModule,
    NotificationModule,
    HistoryModule,
    JobsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
