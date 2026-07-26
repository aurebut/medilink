import { applyDecorators } from '@nestjs/common';
import {
  ArrayMaxSize,
  IsArray,
  IsString,
  MaxLength,
} from 'class-validator';

export function IsBoundedString(maxLength: number) {
  return applyDecorators(IsString(), MaxLength(maxLength));
}

export function IsBoundedStringArray(
  maxItems = 50,
  maxItemLength = 160,
) {
  return applyDecorators(
    IsArray(),
    ArrayMaxSize(maxItems),
    IsString({ each: true }),
    MaxLength(maxItemLength, { each: true }),
  );
}
