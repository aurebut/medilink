import { EstablishmentType } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  IsBoundedString,
  IsBoundedStringArray,
} from '../../../common/validators/bounded-input.decorators';

export class CreateEstablishmentDto {
  @IsBoundedString(180)
  @MinLength(2)
  name: string;

  @IsEnum(EstablishmentType)
  type: EstablishmentType;

  @IsOptional()
  @IsBoundedString(300)
  address?: string;

  @IsOptional()
  @IsBoundedString(120)
  city?: string;

  @IsOptional()
  @IsBoundedString(120)
  country?: string;

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
  @IsBoundedString(32)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  website?: string;

  @IsOptional()
  @IsBoundedString(5000)
  description?: string;
}
