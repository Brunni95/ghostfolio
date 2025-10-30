import { PartialType } from '@nestjs/mapped-types';

import { CreateCashflowDto } from './create-cashflow.dto';

export class UpdateCashflowDto extends PartialType(CreateCashflowDto) {}
