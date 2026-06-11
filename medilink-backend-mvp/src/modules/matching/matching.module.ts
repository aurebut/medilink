import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [MatchingController],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
