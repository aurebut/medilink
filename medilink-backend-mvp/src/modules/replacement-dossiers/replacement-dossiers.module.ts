import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DocumentsModule } from '../documents/documents.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReplacementDossiersController } from './replacement-dossiers.controller';
import { ReplacementDossiersService } from './replacement-dossiers.service';

@Module({
  imports: [AuditModule, DocumentsModule, NotificationsModule],
  controllers: [ReplacementDossiersController],
  providers: [ReplacementDossiersService],
})
export class ReplacementDossiersModule {}
