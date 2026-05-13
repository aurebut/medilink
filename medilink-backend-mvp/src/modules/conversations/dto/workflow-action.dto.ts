import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SendProposalDto {
  @IsInt()
  @Min(0)
  @Max(1000000)
  amount: number;

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
