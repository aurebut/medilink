import { EstablishmentMemberRole } from '@prisma/client';
import { IsEmail, IsEnum, MaxLength } from 'class-validator';

export class AddMemberDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsEnum(EstablishmentMemberRole)
  role: EstablishmentMemberRole;
}
