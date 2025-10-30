import { CashflowModule } from '@ghostfolio/api/app/cashflow/cashflow.module';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';

import { CASHFLOW_QUEUE } from '@ghostfolio/common/config';

import { CashflowProcessor } from './cashflow.processor';
import { CashflowQueueService } from './cashflow.service';

@Module({
  exports: [BullModule, CashflowQueueService],
  imports: [
    CashflowModule,
    BullModule.registerQueue({
      name: CASHFLOW_QUEUE
    })
  ],
  providers: [CashflowProcessor, CashflowQueueService]
})
export class CashflowQueueModule {}
