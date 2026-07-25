import {
  AccountingActivityMode,
  AccountingDeclarationFrequency,
  AccountingEntryKind,
  AccountingSocialScheme,
  AccountingTaxRegime,
} from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

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
  @IsOptional() @IsString() @MaxLength(80)
  categoryCode?: string;
  @IsOptional() @IsInt() @Min(0) @Max(10000)
  professionalShareBps?: number;
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

export class UpdateCandidateAccountingProfileDto {
  @IsOptional() @IsEnum(AccountingTaxRegime)
  taxRegime?: AccountingTaxRegime;
  @IsOptional() @IsEnum(AccountingSocialScheme)
  socialScheme?: AccountingSocialScheme;
  @IsOptional() @IsEnum(AccountingActivityMode)
  activityMode?: AccountingActivityMode;
  @IsOptional() @IsEnum(AccountingDeclarationFrequency)
  declarationFrequency?: AccountingDeclarationFrequency;
  @IsOptional() @IsDateString()
  activityStartDate?: string;
  @IsOptional() @IsBoolean()
  exclusiveLocum?: boolean;
  @IsOptional() @IsBoolean()
  hasOtherIndependentActivity?: boolean;
  @IsOptional() @IsBoolean()
  onboardingCompleted?: boolean;
}
