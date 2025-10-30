import { Cashflow } from '@prisma/client';

export interface CashflowWithBase extends Cashflow {
  amountInBaseCurrency: number;
  signedAmountInBaseCurrency: number;
}
