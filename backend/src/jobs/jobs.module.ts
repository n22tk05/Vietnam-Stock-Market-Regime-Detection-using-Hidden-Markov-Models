import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { NotificationModule } from '../modules/notifications/notification.module';

@Module({
  imports: [NotificationModule],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
