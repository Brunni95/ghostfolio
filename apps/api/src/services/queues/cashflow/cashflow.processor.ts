import {
  CASHFLOW_QUEUE,
  DEFAULT_PROCESSOR_CASHFLOW_CONCURRENCY,
  PROCESS_RECURRING_CASHFLOW_JOB_NAME
} from '@ghostfolio/common/config';

import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';

import { CashflowQueueService } from './cashflow.service';

interface CashflowJobData {
  asOf?: string;
}

@Injectable()
@Processor(CASHFLOW_QUEUE)
export class CashflowProcessor {
  public constructor(
    private readonly cashflowQueueService: CashflowQueueService
  ) {}

  @Process({
    concurrency: parseInt(
      process.env.PROCESSOR_CASHFLOW_CONCURRENCY ??
        DEFAULT_PROCESSOR_CASHFLOW_CONCURRENCY.toString(),
      10
    ),
    name: PROCESS_RECURRING_CASHFLOW_JOB_NAME
  })
  public async handleRecurring(job: Job<CashflowJobData>) {
    const asOf = job.data?.asOf ? new Date(job.data.asOf) : new Date();

    Logger.log(
      `Processing recurring cashflows at ${asOf.toISOString()}`,
      `CashflowProcessor (${PROCESS_RECURRING_CASHFLOW_JOB_NAME})`
    );

    await this.cashflowQueueService.processDueCashflows(asOf);
  }
}
