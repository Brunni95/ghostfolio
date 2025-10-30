import { IsCurrencyCode } from '@ghostfolio/api/validators/is-currency-code';

import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min
} from 'class-validator';
import { CashflowRecurrence, CashflowType } from '@prisma/client';
import { isString } from 'lodash';

export class CreateCashflowSeriesDto {
  @IsUUID()
  accountId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(CashflowType)
  type: CashflowType;

  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams) =>
    isString(value) ? value.trim() : value
  )
  category?: string;

  @IsCurrencyCode()
  currency: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams) =>
    isString(value) ? value.trim() : value
  )
  @MaxLength(256)
  description?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsEnum(CashflowRecurrence)
  @IsNotEmpty()
  recurrence: CashflowRecurrence;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
