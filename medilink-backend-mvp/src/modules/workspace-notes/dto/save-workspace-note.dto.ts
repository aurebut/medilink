import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SaveWorkspaceNoteDto {
  @IsString()
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsUUID()
  establishmentId?: string;
}
