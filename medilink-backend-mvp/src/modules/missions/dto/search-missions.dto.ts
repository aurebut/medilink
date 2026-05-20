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
  specialty?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  @IsIn(['SECTEUR_1', 'SECTEUR_2', 'SECTEUR_3'])
  sector?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  patientType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  softwareUsed?: string;

  @IsOptional()
  @IsBooleanString()
  hasSecretary?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

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
  offset?: number = 0;
}
