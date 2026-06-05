import { IsEmail, IsEnum, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export enum RegisterAccountType {
  CANDIDATE = 'candidate',
  ESTABLISHMENT = 'establishment',
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(RegisterAccountType)
  accountType: RegisterAccountType;

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
  phone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9 ._-]{8,20}$/, {
    message: 'Le RPPS doit contenir uniquement des chiffres.',
  })
  rpps?: string;
}
