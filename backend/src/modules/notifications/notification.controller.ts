import { Controller, Get, Patch, Post, Param, Req } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications(@Req() req: any) {
    const userId = req.user?.id;
    const data = await this.notificationService.getNotifications(userId);
    return { success: true, data };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    const data = await this.notificationService.markAsRead(id);
    return { success: true, data };
  }

  @Post(':id/apply')
  async applyNotification(@Param('id') id: string) {
    const data = await this.notificationService.applyNotification(id);
    return { success: true, data };
  }
}
