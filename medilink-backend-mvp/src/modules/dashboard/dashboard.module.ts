import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { EstablishmentsModule } from '../establishments/establishments.module';
import { MissionsModule } from '../missions/missions.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    DocumentsModule,
    EstablishmentsModule,
    MissionsModule,
    PermissionsModule,
    ProfilesModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
