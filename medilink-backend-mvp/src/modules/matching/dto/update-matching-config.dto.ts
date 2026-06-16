import { IsObject, IsOptional } from 'class-validator';

export class UpdateMatchingConfigDto {
  @IsOptional()
  @IsObject()
  weights?: Record<string, number>;

  @IsOptional()
  @IsObject()
  thresholds?: Record<string, number>;

  @IsOptional()
  @IsObject()
  exclusions?: Record<string, boolean | number>;

  @IsOptional()
  @IsObject()
  dispatch?: Record<string, number | boolean>;
}
