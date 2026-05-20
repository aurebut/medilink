import { MissionType, RequiredLevel } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateMissionDto {
  @IsOptional()
  @IsString()
  establishmentId?: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(MissionType)
  missionType: MissionType;

  @IsString()
  specialty: string;

  @IsEnum(RequiredLevel)
  requiredLevel: RequiredLevel;

  @IsOptional()
  @IsString()
  location?: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  softwareUsed?: string;

  @IsOptional()
  @IsString()
  departmentInfo?: string;

  @IsOptional()
  @IsString()
  teamInfo?: string;

  @IsOptional()
  @IsString()
  equipmentInfo?: string;

  @IsOptional()
  @IsString()
  practicalInfo?: string;

  @IsOptional()
  @IsBoolean()
  accommodationProvided?: boolean;

  @IsOptional()
  @IsBoolean()
  parkingAvailable?: boolean;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(72)
  durationHours?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  compensationAmount?: number;

  @IsOptional()
  @IsString()
  compensationCurrency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  publishNow?: boolean;
}
