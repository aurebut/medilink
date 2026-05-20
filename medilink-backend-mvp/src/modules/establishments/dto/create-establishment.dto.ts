import { EstablishmentType } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

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
  @IsBoolean()
  hasSecretary?: boolean;

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
