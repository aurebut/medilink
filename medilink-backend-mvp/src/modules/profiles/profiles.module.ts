import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DocumentsModule } from '../documents/documents.module';
import { AnsDirectoryService } from './ans-directory.service';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

@Module({
  imports: [AuditModule, DocumentsModule],
  controllers: [ProfilesController],
  providers: [ProfilesService, AnsDirectoryService],
  exports: [ProfilesService, AnsDirectoryService],
})
export class ProfilesModule {}
