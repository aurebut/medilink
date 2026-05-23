import { MedicalStatus } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
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
