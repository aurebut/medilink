import {
  ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsDateString, IsEmail,
  IsIn, IsInt, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min,
} from 'class-validator';
import { DOSSIER_ATTACHMENT_KINDS, DossierAttachmentKind, DossierDetails, GeneratedDossierKind } from './dossier-types';

export class DossierRevisionDto {
  @IsInt() @Min(1) revision: number;
}

export class UpdateDossierDto extends DossierRevisionDto {
  @IsObject() details: DossierDetails;
}

export class GenerateDossierDto extends DossierRevisionDto {
  @IsIn(['CONTRACT', 'DECLARATION']) kind: GeneratedDossierKind;
}

export class UploadDossierDto extends DossierRevisionDto {
  @IsIn(DOSSIER_ATTACHMENT_KINDS)
  kind: DossierAttachmentKind;
  @IsString() @MaxLength(180) @Matches(/^[^\x00-\x1f\x7f/\\]+$/) fileName: string;
  @IsIn(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']) mimeType: string;
  @IsInt() @Min(1) @Max(10 * 1024 * 1024) sizeBytes: number;
  @IsOptional() @IsDateString() expiresAt?: string;
}

export class SendDossierDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(15) @ArrayUnique()
  @IsString({ each: true }) @MaxLength(100, { each: true }) documentIds: string[];
  @IsEmail() @MaxLength(254) recipientEmail: string;
  @IsString() @MaxLength(160) @Matches(/\S/) recipientName: string;
  @IsIn(['COUNTERPART', 'ORDER', 'CPAM', 'OTHER']) recipientType: 'COUNTERPART' | 'ORDER' | 'CPAM' | 'OTHER';
  @IsOptional() @IsString() @MaxLength(3000) message?: string;
  @IsString() @Matches(/^[a-zA-Z0-9_-]{16,100}$/) idempotencyKey: string;
}
