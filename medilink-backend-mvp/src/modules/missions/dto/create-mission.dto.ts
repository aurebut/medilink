import { CompensationMode, MissionType, RequiredLevel } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import {
  IsBoundedString,
  IsBoundedStringArray,
} from '../../../common/validators/bounded-input.decorators';

export class CreateMissionDto {
  @IsOptional()
  @IsUUID()
  establishmentId?: string;

  @IsBoundedString(180)
  @MinLength(3)
  title: string;

  @IsOptional()
  @IsBoundedString(5000)
  description?: string;

  @IsEnum(MissionType)
  missionType: MissionType;

  @IsBoundedString(160)
  @MinLength(2)
  specialty: string;

  @IsOptional()
  @IsEnum(RequiredLevel)
  requiredLevel?: RequiredLevel;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsEnum(RequiredLevel, { each: true })
  requiredLevels?: RequiredLevel[];

  @IsOptional()
  @IsBoundedString(120)
  practiceSetting?: string;

  @IsOptional()
  @IsBoundedStringArray(50, 160)
  requiredActs?: string[];

  @IsOptional()
  @IsBoundedString(300)
  location?: string;

  @IsBoundedString(120)
  @MinLength(2)
  city: string;

  @IsOptional()
  @IsBoundedString(80)
  sector?: string;

  @IsOptional()
  @IsBoundedString(300)
  patientType?: string;

  @IsOptional()
  @IsBoundedString(300)
  softwareUsed?: string;

  @IsOptional()
  @IsBoolean()
  hasSecretary?: boolean;

  @IsOptional()
  @IsBoundedString(120)
  secretaryType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  averagePatientsPerDay?: number;

  @IsOptional()
  @IsBoolean()
  isMultidisciplinary?: boolean;

  @IsOptional()
  @IsBoundedStringArray(50, 160)
  equipmentAvailable?: string[];

  @IsOptional()
  @IsBoundedStringArray(30, 120)
  mobilityOptions?: string[];

  @IsOptional()
  @IsBoundedStringArray(30, 120)
  acceptedMissionTypes?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  minimumCompensation?: number;

  @IsOptional()
  @IsBoundedStringArray(30, 80)
  preferredDurations?: string[];

  @IsOptional()
  @IsBoundedStringArray(30, 120)
  refusedSchedules?: string[];

  @IsOptional()
  @IsBoundedStringArray(50, 160)
  acceptedPatientTypes?: string[];

  @IsOptional()
  @IsBoundedStringArray(50, 120)
  knownSoftware?: string[];

  @IsOptional()
  @IsBoundedString(2000)
  departmentInfo?: string;

  @IsOptional()
  @IsBoundedString(2000)
  teamInfo?: string;

  @IsOptional()
  @IsBoundedString(2000)
  equipmentInfo?: string;

  @IsOptional()
  @IsBoundedString(2000)
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
  @IsBoundedString(20)
  startTime?: string;

  @IsOptional()
  @IsBoundedString(20)
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
  @IsIn(['EUR'])
  compensationCurrency?: string;

  @IsOptional()
  @IsBoundedStringArray(20, 50)
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  publishNow?: boolean;
}
