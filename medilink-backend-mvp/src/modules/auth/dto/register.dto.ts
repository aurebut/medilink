import {
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export enum RegisterAccountType {
  CANDIDATE = 'candidate',
  ESTABLISHMENT = 'establishment',
}

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password: string;

  @IsEnum(RegisterAccountType)
  accountType: RegisterAccountType;

  @ValidateIf((dto: RegisterDto) => dto.accountType === RegisterAccountType.CANDIDATE)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  firstName?: string;

  @ValidateIf((dto: RegisterDto) => dto.accountType === RegisterAccountType.CANDIDATE)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsIn(['FEMININE', 'MASCULINE'])
  candidateGender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9 ._-]{8,20}$/, {
    message: 'Le RPPS doit contenir uniquement des chiffres.',
  })
  rpps?: string;
}
