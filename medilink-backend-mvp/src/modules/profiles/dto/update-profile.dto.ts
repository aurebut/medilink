import { MedicalStatus } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsIn(['FEMININE', 'MASCULINE'])
  candidateGender?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsEnum(MedicalStatus)
  medicalStatus?: MedicalStatus;

  @IsOptional()
  @IsString()
  medicalStatusOther?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  orientation?: string;

  @IsOptional()
  @IsString()
  hospitalOrFaculty?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(80)
  experienceYears?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actsPerformed?: string[];

  @IsOptional()
  @IsString()
  availabilityNotes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredCities?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  maxTravelRadiusKm?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mobilityOptions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptedWeekdays?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptedTimeSlots?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(720)
  minimumNoticeHours?: number;

  @IsOptional()
  @IsString()
  mobilityRangeType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  housingRequiredBeyondKm?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptedPracticeSettings?: string[];

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
  knownSoftware?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptedPatientTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  refusedPatientTypes?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(300)
  maxPatientsPerDay?: number;

  @IsOptional()
  @IsBoolean()
  parkingRequired?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptedActs?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  refusedActs?: string[];

  @IsOptional()
  @IsBoolean()
  secretaryRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  accommodationRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  fastPaymentImportant?: boolean;

  @IsOptional()
  @IsString()
  acceptedPressureLevel?: string;
}
