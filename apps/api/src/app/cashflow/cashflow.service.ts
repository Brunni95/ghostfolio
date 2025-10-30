import { PortfolioChangedEvent } from '@ghostfolio/api/events/portfolio-changed.event';
import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { CreateCashflowDto, UpdateCashflowDto } from '@ghostfolio/api/app/cashflow/dto';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import {
  Cashflow,
  CashflowFrequency,
  CashflowType,
  Prisma
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  addDays,
  addMonths,
  addQuarters,
  addWeeks,
  addYears,
  isAfter,
  parseISO
} from 'date-fns';

@Injectable()
export class CashflowService {
  public constructor(
    private readonly accountService: AccountService,
    private readonly eventEmitter: EventEmitter2,
    private readonly prismaService: PrismaService
  ) {}

  public async create(
    data: CreateCashflowDto & { userId: string }
  ): Promise<Cashflow> {
    const { userId, accountId, startDate, endDate, isActive = true } = data;
    const start = parseISO(startDate);
    const end = endDate ? parseISO(endDate) : undefined;
    const nextExecutionAt =
      isActive && (!end || !isAfter(start, end)) ? start : null;

    const payload: Prisma.CashflowCreateInput = {
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      endDate: end,
      frequency: data.frequency,
      isActive: nextExecutionAt ? isActive : false,
      nextExecutionAt,
      startDate: start,
      type: data.type,
      account: {
        connect: {
          id_userId: {
            id: accountId,
            userId
          }
        }
      },
      user: {
        connect: { id: userId }
      }
    };

    return this.prismaService.cashflow.create({ data: payload });
  }

  public async update(
    id: string,
    data: UpdateCashflowDto
  ): Promise<Cashflow> {
    const updateData: Prisma.CashflowUpdateInput = {
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      frequency: data.frequency,
      isActive: data.isActive,
      type: data.type
    };

    if (data.startDate) {
      updateData.startDate = parseISO(data.startDate);
    }

    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate ? parseISO(data.endDate) : null;
    }

    if (data.startDate || data.endDate || data.isActive !== undefined) {
      const cashflow = await this.prismaService.cashflow.findUnique({
        where: { id }
      });

      if (cashflow) {
        const nextExecutionAt = this.getNextExecutionDate({
          cashflow: {
            ...cashflow,
            ...('startDate' in updateData && updateData.startDate
              ? { startDate: updateData.startDate as Date }
              : {}),
            ...('endDate' in updateData && updateData.endDate !== undefined
              ? { endDate: updateData.endDate as Date | null }
              : {}),
            ...('isActive' in updateData && updateData.isActive !== undefined
              ? { isActive: updateData.isActive as boolean }
              : {})
          },
          reference: cashflow.lastExecutionAt ?? cashflow.startDate
        });

        updateData.nextExecutionAt = nextExecutionAt;
      }
    }

    return this.prismaService.cashflow.update({
      data: updateData,
      where: { id }
    });
  }

  public async processDueCashflows({ asOf = new Date() } = {}) {
    const dueCashflows = await this.prismaService.cashflow.findMany({
      where: {
        isActive: true,
        nextExecutionAt: {
          lte: asOf
        }
      },
      orderBy: {
        nextExecutionAt: 'asc'
      }
    });

    for (const cashflow of dueCashflows) {
      let current = cashflow;

      while (current?.nextExecutionAt && current.nextExecutionAt <= asOf) {
        current = await this.bookCashflow(current, current.nextExecutionAt);

        if (!current?.isActive || !current?.nextExecutionAt) {
          break;
        }
      }
    }
  }

  public getInitialNextExecutionDate(
    cashflow: Pick<Cashflow, 'startDate' | 'endDate' | 'isActive'>
  ) {
    if (!cashflow.isActive) {
      return null;
    }

    if (cashflow.endDate && isAfter(cashflow.startDate, cashflow.endDate)) {
      return null;
    }

    return cashflow.startDate;
  }

  private async bookCashflow(cashflow: Cashflow, executionDate: Date) {
    const amount =
      cashflow.type === CashflowType.OUTFLOW
        ? cashflow.amount * -1
        : cashflow.amount;

    await this.accountService.updateAccountBalance({
      accountId: cashflow.accountId,
      amount,
      currency: cashflow.currency,
      date: executionDate,
      userId: cashflow.userId
    });

    const nextExecutionAt = this.getNextExecutionDate({
      cashflow,
      reference: executionDate
    });

    const updated = await this.prismaService.cashflow.update({
      data: {
        lastExecutionAt: executionDate,
        nextExecutionAt,
        ...(nextExecutionAt ? {} : { isActive: false })
      },
      where: { id: cashflow.id }
    });

    this.eventEmitter.emit(
      PortfolioChangedEvent.getName(),
      new PortfolioChangedEvent({ userId: cashflow.userId })
    );

    return updated;
  }

  private getNextExecutionDate({
    cashflow,
    reference
  }: {
    cashflow: Cashflow;
    reference: Date;
  }): Date | null {
    if (!cashflow.isActive) {
      return null;
    }

    let next: Date;

    switch (cashflow.frequency) {
      case CashflowFrequency.DAILY:
        next = addDays(reference, 1);
        break;
      case CashflowFrequency.WEEKLY:
        next = addWeeks(reference, 1);
        break;
      case CashflowFrequency.MONTHLY:
        next = addMonths(reference, 1);
        break;
      case CashflowFrequency.QUARTERLY:
        next = addQuarters(reference, 1);
        break;
      case CashflowFrequency.YEARLY:
        next = addYears(reference, 1);
        break;
      default:
        next = addMonths(reference, 1);
        break;
    }

    if (cashflow.endDate && isAfter(next, cashflow.endDate)) {
      return null;
    }

    return next;
  }
}
