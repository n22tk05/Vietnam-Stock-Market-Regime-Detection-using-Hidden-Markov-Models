import { Module } from '@nestjs/common';
import { InvestmentProfileController } from './investment-profile.controller';
import { InvestmentProfileService } from './investment-profile.service';

@Module({
  controllers: [InvestmentProfileController],
  providers: [InvestmentProfileService],
  exports: [InvestmentProfileService],
})
export class InvestmentProfileModule {}
