import { IsCurrencyCode } from '@ghostfolio/api/validators/is-currency-code';

import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min
} from 'class-validator';
import { CashflowType } from '@prisma/client';
import { isString } from 'lodash';

export class UpdateCashflowDto {
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams) =>
    isString(value) ? value.trim() : value
  )
  category?: string;

  @IsOptional()
  @IsCurrencyCode()
  currency?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams) =>
    isString(value) ? value.trim() : value
  )
  @MaxLength(256)
  description?: string;

  @IsOptional()
  @IsUUID()
  seriesId?: string | null;

  @IsOptional()
  @IsEnum(CashflowType)
  type?: CashflowType;
}
