import { CompensationMode, MissionType, RequiredLevel } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
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

  @IsOptional()
  @IsEnum(RequiredLevel)
  requiredLevel?: RequiredLevel;

  @IsOptional()
  @IsArray()
  @IsEnum(RequiredLevel, { each: true })
  requiredLevels?: RequiredLevel[];

  @IsOptional()
  @IsString()
  location?: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsString()
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
  @IsBoolean()
  hasSecretary?: boolean;

  @IsOptional()
  @IsString()
  secretaryType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  averagePatientsPerDay?: number;

  @IsOptional()
  @IsBoolean()
  isMultidisciplinary?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipmentAvailable?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mobilityOptions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptedMissionTypes?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  minimumCompensation?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredDurations?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  refusedSchedules?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptedPatientTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  knownSoftware?: string[];

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
  @IsEnum(CompensationMode)
  compensationMode?: CompensationMode;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  retrocessionPercentage?: number;

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
