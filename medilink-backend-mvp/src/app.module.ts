import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './modules/admin/admin.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { BillingModule } from './modules/billing/billing.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { EstablishmentsModule } from './modules/establishments/establishments.module';
import { MatchingModule } from './modules/matching/matching.module';
import { MissionsModule } from './modules/missions/missions.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditModule,
    NotificationsModule,
    PermissionsModule,
    AuthModule,
    BillingModule,
    UsersModule,
    ProfilesModule,
    DocumentsModule,
    EstablishmentsModule,
    MissionsModule,
    MatchingModule,
    ApplicationsModule,
    ConversationsModule,
    DashboardModule,
    AdminModule,
  ],
})
export class AppModule {}
