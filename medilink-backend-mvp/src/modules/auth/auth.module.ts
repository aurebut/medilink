import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DocumentsModule } from '../documents/documents.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    UsersModule,
    NotificationsModule,
    AuditModule,
    ProfilesModule,
    DocumentsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
