import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MatchingController } from './matching.controller';
import { MatchingDispatchWorker } from './matching-dispatch.worker';
import { MatchingService } from './matching.service';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [MatchingController],
  providers: [MatchingService, MatchingDispatchWorker],
  exports: [MatchingService],
})
export class MatchingModule {}
