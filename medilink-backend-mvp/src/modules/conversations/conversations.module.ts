import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ConversationEventsService } from './conversation-events.service';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

@Module({
  imports: [AuditModule, NotificationsModule, PermissionsModule],
  controllers: [ConversationsController],
  providers: [ConversationEventsService, ConversationsService],
})
export class ConversationsModule {}
