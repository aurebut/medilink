import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApplyDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  coverMessage?: string;
}
