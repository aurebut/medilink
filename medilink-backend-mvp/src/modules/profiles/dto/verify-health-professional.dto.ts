import { IsString, Matches } from 'class-validator';

export class VerifyHealthProfessionalDto {
  @IsString()
  @Matches(/^[0-9 ._-]{8,20}$/, {
    message: 'Le RPPS doit contenir uniquement des chiffres.',
  })
  rpps: string;
}
