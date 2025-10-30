import { IsCurrencyCode } from '@ghostfolio/api/validators/is-currency-code';
import { IsAfter1970Constraint } from '@ghostfolio/common/validator-constraints/is-after-1970';

import { CashflowFrequency, CashflowType } from '@prisma/client';
import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Validate
} from 'class-validator';
import { isString } from 'lodash';

import { IsAfterOrEqualDate } from './validators/is-after-or-equal-date';

export class CreateCashflowDto {
  @IsString()
  accountId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }: TransformFnParams) =>
    isString(value) ? value.trim() : value
  )
  description?: string;

  @IsCurrencyCode()
  currency: string;

  @IsEnum(CashflowFrequency)
  frequency: CashflowFrequency;

  @IsEnum(CashflowType)
  type: CashflowType;

  @IsISO8601()
  @Validate(IsAfter1970Constraint)
  startDate: string;

  @IsOptional()
  @IsISO8601()
  @Validate(IsAfterOrEqualDate('startDate', {
    message: 'endDate must be equal to or after startDate'
  }))
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
