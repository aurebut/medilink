import { MedicalStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import {
  IsBoundedString,
  IsBoundedStringArray,
} from '../../../common/validators/bounded-input.decorators';

export class UpdateProfileDto {
  @IsOptional()
  @IsBoundedString(100)
  firstName?: string;

  @IsOptional()
  @IsBoundedString(100)
  lastName?: string;

  @IsOptional()
  @IsIn(['FEMININE', 'MASCULINE'])
  candidateGender?: string;

  @IsOptional()
  @IsBoundedString(120)
  city?: string;

  @IsOptional()
  @IsBoundedString(120)
  country?: string;

  @IsOptional()
  @IsEnum(MedicalStatus)
  medicalStatus?: MedicalStatus;

  @IsOptional()
  @IsBoundedString(120)
  medicalStatusOther?: string;

  @IsOptional()
  @IsBoundedString(160)
  specialty?: string;

  @IsOptional()
  @IsBoundedString(120)
  orientation?: string;

  @IsOptional()
  @IsBoundedString(200)
  hospitalOrFaculty?: string;

  @IsOptional()
  @IsBoundedString(3000)
  bio?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(80)
  experienceYears?: number;

  @IsOptional()
  @IsBoundedStringArray(50, 160)
  actsPerformed?: string[];

  @IsOptional()
  @IsBoundedString(1000)
  availabilityNotes?: string;

  @IsOptional()
  @IsBoundedStringArray(50, 120)
  preferredCities?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  maxTravelRadiusKm?: number;

  @IsOptional()
  @IsBoundedStringArray(30, 120)
  mobilityOptions?: string[];

  @IsOptional()
  @IsBoundedStringArray(7, 30)
  acceptedWeekdays?: string[];

  @IsOptional()
  @IsBoundedStringArray(20, 40)
  acceptedTimeSlots?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(720)
  minimumNoticeHours?: number;

  @IsOptional()
  @IsBoundedString(80)
  mobilityRangeType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  housingRequiredBeyondKm?: number;

  @IsOptional()
  @IsBoundedStringArray(30, 120)
  acceptedPracticeSettings?: string[];

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
  @IsBoundedStringArray(50, 120)
  knownSoftware?: string[];

  @IsOptional()
  @IsBoundedStringArray(50, 160)
  acceptedPatientTypes?: string[];

  @IsOptional()
  @IsBoundedStringArray(50, 160)
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
  @IsBoundedStringArray(50, 160)
  acceptedActs?: string[];

  @IsOptional()
  @IsBoundedStringArray(50, 160)
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
  @IsBoundedString(80)
  acceptedPressureLevel?: string;
}
