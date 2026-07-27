import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ListWorkspaceNotesDto {
  @IsOptional()
  @IsUUID()
  establishmentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  prefix?: string;
}
