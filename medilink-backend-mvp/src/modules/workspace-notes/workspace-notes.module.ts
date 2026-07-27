import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { WorkspaceNotesController } from './workspace-notes.controller';
import { WorkspaceNotesService } from './workspace-notes.service';

@Module({
  imports: [AuditModule, PermissionsModule],
  controllers: [WorkspaceNotesController],
  providers: [WorkspaceNotesService],
})
export class WorkspaceNotesModule {}
