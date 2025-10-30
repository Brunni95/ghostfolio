import { CashflowWithBase } from './cashflow-with-base.interface';

import { Account, CashflowSeries } from '@prisma/client';

export interface CashDetails {
  accounts: Account[];
  balanceInBaseCurrency: number;
  cashflows: CashflowWithBase[];
  series: CashflowSeries[];
}
