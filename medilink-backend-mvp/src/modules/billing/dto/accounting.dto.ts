import { AccountingEntryKind } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateAccountingEntryDto {
  @IsEnum(AccountingEntryKind)
  kind: AccountingEntryKind;
  @IsString() @MaxLength(20)
  date: string;
  @IsString() @MaxLength(180)
  counterparty: string;
  @IsString() @MaxLength(240)
  mission: string;
  @IsInt() @Min(1) @Max(1000000000)
  amountCents: number;
  @IsOptional() @IsString() @MaxLength(8)
  currency?: string;
  @IsString() @MaxLength(80)
  paymentMethod: string;
  @IsOptional() @IsString() @MaxLength(1200)
  notes?: string;
  @IsOptional() @IsBoolean()
  hasReceipt?: boolean;
}

export class UpdateAccountingSettingsDto {
  @IsOptional() @IsInt() @Min(0) @Max(100)
  provisionRate?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1000000000)
  budgetLimit?: number;
}

export class SetAccountingClassificationDto {
  @IsString() @MaxLength(240)
  recordKey: string;
  @IsBoolean()
  classified: boolean;
}
