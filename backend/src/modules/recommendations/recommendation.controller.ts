import { Controller, Get, Post, Param, Req } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';

@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get('current')
  async getCurrent(@Req() req: any) {
    const userId = req.user?.id;
    const data = await this.recommendationService.getCurrentRecommendation(userId);
    return { success: true, data };
  }

  @Post('generate')
  async generate(@Req() req: any) {
    const userId = req.user?.id;
    const data = await this.recommendationService.generateRecommendation(userId);
    return { success: true, data };
  }

  @Get(':id')
  async getById(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    const data = await this.recommendationService.getCurrentRecommendation(userId);
    return { success: true, data };
  }

  @Post(':id/confirm')
  async confirm(@Param('id') id: string) {
    const data = await this.recommendationService.confirmRecommendation(id);
    return { success: true, data };
  }

  @Post(':id/dismiss')
  async dismiss(@Param('id') id: string) {
    const data = await this.recommendationService.dismissRecommendation(id);
    return { success: true, data };
  }
}
