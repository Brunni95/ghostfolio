import { CashflowService } from '@ghostfolio/api/app/cashflow/cashflow.service';
import {
  CASHFLOW_QUEUE,
  PROCESS_RECURRING_CASHFLOW_JOB_NAME,
  PROCESS_RECURRING_CASHFLOW_JOB_OPTIONS
} from '@ghostfolio/common/config';

import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';

@Injectable()
export class CashflowQueueService {
  public constructor(
    @InjectQueue(CASHFLOW_QUEUE)
    private readonly cashflowQueue: Queue,
    private readonly cashflowService: CashflowService
  ) {}

  public async enqueueRecurringProcessing(asOf: Date = new Date()) {
    return this.cashflowQueue.add(
      PROCESS_RECURRING_CASHFLOW_JOB_NAME,
      { asOf: asOf.toISOString() },
      PROCESS_RECURRING_CASHFLOW_JOB_OPTIONS
    );
  }

  public async processDueCashflows(asOf: Date = new Date()) {
    await this.cashflowService.processDueCashflows({ asOf });
  }
}
