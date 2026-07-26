import { MissionType, RequiredLevel } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBooleanString, IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SearchMissionsDto {
  @IsOptional()
  @IsEnum(MissionType)
  missionType?: MissionType;

  @IsOptional()
  @IsEnum(RequiredLevel)
  requiredLevel?: RequiredLevel;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  specialty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  departmentInfo?: string;

  @IsOptional()
  @IsString()
  @IsIn(['SECTEUR_1', 'SECTEUR_2', 'SECTEUR_3'])
  sector?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  patientType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  softwareUsed?: string;

  @IsOptional()
  @IsBooleanString()
  hasSecretary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  retrocessionMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  retrocessionMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  offset?: number = 0;
}
