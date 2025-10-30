import { AccountModule } from '@ghostfolio/api/app/account/account.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { CashflowService } from './cashflow.service';

@Module({
  exports: [CashflowService],
  imports: [AccountModule, PrismaModule],
  providers: [CashflowService]
})
export class CashflowModule {}
