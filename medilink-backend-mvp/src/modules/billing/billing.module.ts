import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { AccountingService } from './accounting.service';

@Module({
  imports: [AuditModule, PermissionsModule],
  controllers: [BillingController],
  providers: [BillingService, AccountingService],
  exports: [BillingService],
})
export class BillingModule {}

