import { AccountModule } from '@ghostfolio/api/app/account/account.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { CashflowController } from './cashflow.controller';
import { CashflowScheduler } from './cashflow.scheduler';
import { CashflowService } from './cashflow.service';

@Module({
  controllers: [CashflowController],
  exports: [CashflowService],
  imports: [AccountModule, PrismaModule],
  providers: [CashflowScheduler, CashflowService]
})
export class CashflowModule {}
