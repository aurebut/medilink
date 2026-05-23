import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

@Module({
  imports: [AuditModule, PermissionsModule],
  controllers: [DocumentsController, StorageController],
  providers: [DocumentsService, StorageService],
  exports: [DocumentsService, StorageService],
})
export class DocumentsModule {}
