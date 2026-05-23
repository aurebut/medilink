import { EstablishmentType } from '@prisma/client';
import { IsArray, IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

export class CreateEstablishmentDto {
  @IsString()
  name: string;

  @IsEnum(EstablishmentType)
  type: EstablishmentType;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

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
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
