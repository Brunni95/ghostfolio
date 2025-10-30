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
import { CashflowType } from '@prisma/client';
import { isString } from 'lodash';

export class CreateCashflowDto {
  @IsUUID()
  accountId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams) =>
    isString(value) ? value.trim() : value
  )
  category?: string;

  @IsCurrencyCode()
  currency: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams) =>
    isString(value) ? value.trim() : value
  )
  @MaxLength(256)
  description?: string;

  @IsOptional()
  @IsUUID()
  seriesId?: string;

  @IsEnum(CashflowType)
  @IsNotEmpty()
  type: CashflowType;
}
