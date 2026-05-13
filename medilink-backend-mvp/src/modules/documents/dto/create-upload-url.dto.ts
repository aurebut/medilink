import { DocumentType } from '@prisma/client';
import { IsEnum, IsInt, IsMimeType, IsString, Max, Min } from 'class-validator';

export class CreateUploadUrlDto {
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @IsString()
  fileName: string;

  @IsMimeType()
  mimeType: string;

  @IsInt()
  @Min(1)
  @Max(25 * 1024 * 1024)
  sizeBytes: number;
}
