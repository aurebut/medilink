import { CompensationMode } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SendProposalDto {
  @IsOptional()
  @IsEnum(CompensationMode)
  compensationMode?: CompensationMode;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(1000000)
  amount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  retrocessionPercentage?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  startDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  startTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  endTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  notes?: string;
}

export class ReleasePaymentDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000000000)
  grossHonorariaCents?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000000000)
  candidateAmountCents?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  notes?: string;
}
