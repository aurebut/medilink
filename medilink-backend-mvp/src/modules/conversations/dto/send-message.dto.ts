import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  clientRequestId?: string;
}
