import { EstablishmentType } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

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
