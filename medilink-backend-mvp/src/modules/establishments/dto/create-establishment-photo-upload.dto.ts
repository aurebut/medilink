import { IsInt, IsMimeType, IsString, Max, Min } from 'class-validator';

export class CreateEstablishmentPhotoUploadDto {
  @IsString()
  fileName: string;

  @IsMimeType()
  mimeType: string;

  @IsInt()
  @Min(1)
  @Max(8 * 1024 * 1024)
  sizeBytes: number;
}
