import { CashflowService } from './cashflow.service';

import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CashflowScheduler {
  public constructor(private readonly cashflowService: CashflowService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: 'UTC' })
  public async handleRecurringCashflows() {
    await this.cashflowService.processRecurringCashflows();
  }
}
