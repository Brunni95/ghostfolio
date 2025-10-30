import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { PortfolioChangedEvent } from '@ghostfolio/api/events/portfolio-changed.event';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { Filter } from '@ghostfolio/common/interfaces';

import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Cashflow,
  CashflowRecurrence,
  CashflowSeries,
  CashflowType,
  Prisma
} from '@prisma/client';
import { addDays, addMonths, addQuarters, addWeeks, addYears, parseISO } from 'date-fns';

import { CreateCashflowDto } from './dto/create-cashflow.dto';
import { CreateCashflowSeriesDto } from './dto/create-cashflow-series.dto';
import { UpdateCashflowDto } from './dto/update-cashflow.dto';
import { UpdateCashflowSeriesDto } from './dto/update-cashflow-series.dto';

@Injectable()
export class CashflowService {
  public constructor(
    private readonly accountService: AccountService,
    private readonly eventEmitter: EventEmitter2,
    private readonly prismaService: PrismaService
  ) {}

  public async cashflow(
    where: Prisma.CashflowWhereUniqueInput,
    userId: string
  ): Promise<Cashflow | null> {
    return this.prismaService.cashflow.findFirst({
      where: {
        ...where,
        userId
      }
    });
  }

  public async cashflows({
    filters = [],
    orderBy = { date: 'desc' },
    dateFrom,
    dateTo,
    seriesId,
    skip,
    take,
    userId
  }: {
    dateFrom?: Date;
    dateTo?: Date;
    filters?: Filter[];
    orderBy?: Prisma.CashflowOrderByWithRelationInput;
    seriesId?: string;
    skip?: number;
    take?: number;
    userId: string;
  }): Promise<Cashflow[]> {
    const where = this.buildCashflowWhere({
      dateFrom,
      dateTo,
      filters,
      seriesId,
      userId
    });

    return this.prismaService.cashflow.findMany({
      orderBy,
      skip,
      take,
      where
    });
  }

  public async createCashflow(
    data: CreateCashflowDto,
    userId: string
  ): Promise<Cashflow> {
    await this.ensureAccountOwnership(data.accountId, userId);

    let seriesConnect: Prisma.CashflowCreateInput['series'];

    if (data.seriesId) {
      const series = await this.prismaService.cashflowSeries.findFirst({
        where: { id: data.seriesId, userId }
      });

      if (!series) {
        throw new NotFoundException('Cashflow series not found');
      }

      seriesConnect = { connect: { id: data.seriesId } };
    }

    const cashflowDate = parseISO(data.date);

    const cashflow = await this.prismaService.cashflow.create({
      data: {
        account: {
          connect: {
            id_userId: {
              id: data.accountId,
              userId
            }
          }
        },
        amount: data.amount,
        category: data.category,
        currency: data.currency,
        date: cashflowDate,
        description: data.description,
        series: seriesConnect,
        type: data.type,
        user: { connect: { id: userId } }
      }
    });

    await this.applyAccountBalanceDelta({
      accountId: cashflow.accountId,
      amount: this.getSignedAmount(cashflow.type, cashflow.amount),
      currency: cashflow.currency,
      date: cashflow.date,
      userId
    });

    this.eventEmitter.emit(
      PortfolioChangedEvent.getName(),
      new PortfolioChangedEvent({ userId })
    );

    return cashflow;
  }

  public async createCashflowSeries(
    data: CreateCashflowSeriesDto,
    userId: string
  ): Promise<CashflowSeries> {
    await this.ensureAccountOwnership(data.accountId, userId);

    return this.prismaService.cashflowSeries.create({
      data: {
        account: {
          connect: {
            id_userId: {
              id: data.accountId,
              userId
            }
          }
        },
        amount: data.amount,
        category: data.category,
        currency: data.currency,
        description: data.description,
        endDate: data.endDate ? parseISO(data.endDate) : undefined,
        recurrence: data.recurrence,
        startDate: parseISO(data.startDate),
        timezone: data.timezone ?? 'UTC',
        type: data.type,
        user: { connect: { id: userId } }
      }
    });
  }

  public async deleteCashflow(id: string, userId: string): Promise<Cashflow> {
    const cashflow = await this.prismaService.cashflow.findFirst({
      where: { id, userId }
    });

    if (!cashflow) {
      throw new NotFoundException('Cashflow not found');
    }

    await this.applyAccountBalanceDelta({
      accountId: cashflow.accountId,
      amount: -this.getSignedAmount(cashflow.type, cashflow.amount),
      currency: cashflow.currency,
      date: cashflow.date,
      userId
    });

    const deleted = await this.prismaService.cashflow.delete({ where: { id } });

    this.eventEmitter.emit(
      PortfolioChangedEvent.getName(),
      new PortfolioChangedEvent({ userId })
    );

    return deleted;
  }

  public async deleteCashflowSeries(
    id: string,
    userId: string
  ): Promise<CashflowSeries> {
    const series = await this.prismaService.cashflowSeries.findFirst({
      where: { id, userId }
    });

    if (!series) {
      throw new NotFoundException('Cashflow series not found');
    }

    return this.prismaService.cashflowSeries.delete({ where: { id } });
  }

  public async getSeries({
    accountIds = [],
    userId
  }: {
    accountIds?: string[];
    userId: string;
  }): Promise<CashflowSeries[]> {
    const where: Prisma.CashflowSeriesWhereInput = {
      userId
    };

    if (accountIds.length > 0) {
      where.accountId = { in: accountIds };
    }

    return this.prismaService.cashflowSeries.findMany({
      orderBy: { startDate: 'asc' },
      where
    });
  }

  public async processRecurringCashflows(referenceDate = new Date()): Promise<void> {
    const seriesList = await this.prismaService.cashflowSeries.findMany({
      where: {
        OR: [{ endDate: null }, { endDate: { gte: referenceDate } }],
        startDate: { lte: referenceDate }
      }
    });

    for (const series of seriesList) {
      if (series.recurrence === CashflowRecurrence.NONE) {
        if (!series.lastOccurredAt && series.startDate <= referenceDate) {
          await this.createFromSeries(series, series.startDate);
        }

        continue;
      }

      let nextOccurrence = series.lastOccurredAt
        ? this.getNextOccurrence(series.lastOccurredAt, series.recurrence)
        : series.startDate;

      while (nextOccurrence && nextOccurrence <= referenceDate) {
        if (series.endDate && nextOccurrence > series.endDate) {
          break;
        }

        const existing = await this.prismaService.cashflow.findFirst({
          where: {
            AND: [{ date: nextOccurrence }, { seriesId: series.id }]
          }
        });

        if (!existing) {
          await this.createFromSeries(series, nextOccurrence);
        }

        const following = this.getNextOccurrence(
          nextOccurrence,
          series.recurrence
        );

        if (!following || (series.endDate && following > series.endDate)) {
          break;
        }

        nextOccurrence = following;
      }
    }
  }

  public async updateCashflow(
    id: string,
    data: UpdateCashflowDto,
    userId: string
  ): Promise<Cashflow> {
    const existing = await this.prismaService.cashflow.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      throw new NotFoundException('Cashflow not found');
    }

    if (data.accountId && data.accountId !== existing.accountId) {
      await this.ensureAccountOwnership(data.accountId, userId);
    }

    if (data.seriesId) {
      const series = await this.prismaService.cashflowSeries.findFirst({
        where: { id: data.seriesId, userId }
      });

      if (!series) {
        throw new NotFoundException('Cashflow series not found');
      }
    }

    await this.applyAccountBalanceDelta({
      accountId: existing.accountId,
      amount: -this.getSignedAmount(existing.type, existing.amount),
      currency: existing.currency,
      date: existing.date,
      userId
    });

    const updated = await this.prismaService.cashflow.update({
      data: {
        account: data.accountId
          ? {
              connect: {
                id_userId: {
                  id: data.accountId,
                  userId
                }
              }
            }
          : undefined,
        amount: data.amount ?? undefined,
        category: data.category ?? undefined,
        currency: data.currency ?? undefined,
        date: data.date ? parseISO(data.date) : undefined,
        description: data.description ?? undefined,
        series: data.seriesId
          ? { connect: { id: data.seriesId } }
          : data.seriesId === null
          ? { disconnect: true }
          : undefined,
        type: data.type ?? undefined
      },
      where: { id }
    });

    await this.applyAccountBalanceDelta({
      accountId: updated.accountId,
      amount: this.getSignedAmount(updated.type, updated.amount),
      currency: updated.currency,
      date: updated.date,
      userId
    });

    this.eventEmitter.emit(
      PortfolioChangedEvent.getName(),
      new PortfolioChangedEvent({ userId })
    );

    return updated;
  }

  public async updateCashflowSeries(
    id: string,
    data: UpdateCashflowSeriesDto,
    userId: string
  ): Promise<CashflowSeries> {
    const existing = await this.prismaService.cashflowSeries.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      throw new NotFoundException('Cashflow series not found');
    }

    if (data.accountId && data.accountId !== existing.accountId) {
      await this.ensureAccountOwnership(data.accountId, userId);
    }

    return this.prismaService.cashflowSeries.update({
      data: {
        account: data.accountId
          ? {
              connect: {
                id_userId: {
                  id: data.accountId,
                  userId
                }
              }
            }
          : undefined,
        amount: data.amount ?? undefined,
        category: data.category ?? undefined,
        currency: data.currency ?? undefined,
        description: data.description ?? undefined,
        endDate: data.endDate
          ? parseISO(data.endDate)
          : data.endDate === null
          ? null
          : undefined,
        recurrence: data.recurrence ?? undefined,
        startDate: data.startDate ? parseISO(data.startDate) : undefined,
        timezone: data.timezone ?? undefined,
        type: data.type ?? undefined
      },
      where: { id }
    });
  }

  private async applyAccountBalanceDelta({
    accountId,
    amount,
    currency,
    date,
    userId
  }: {
    accountId: string;
    amount: number;
    currency: string;
    date: Date;
    userId: string;
  }) {
    if (amount === 0) {
      return;
    }

    await this.accountService.updateAccountBalance({
      accountId,
      amount,
      currency,
      date,
      userId
    });
  }

  private buildCashflowWhere({
    dateFrom,
    dateTo,
    filters,
    seriesId,
    userId
  }: {
    dateFrom?: Date;
    dateTo?: Date;
    filters: Filter[];
    seriesId?: string;
    userId: string;
  }) {
    const where: Prisma.CashflowWhereInput = {
      userId
    };

    const categories: string[] = [];
    const types: CashflowType[] = [];
    const accountIds: string[] = [];

    for (const filter of filters) {
      switch (filter.type) {
        case 'ACCOUNT':
          accountIds.push(filter.id);
          break;
        case 'CASHFLOW_CATEGORY':
          categories.push(filter.id);
          break;
        case 'CASHFLOW_TYPE':
          types.push(filter.id as CashflowType);
          break;
        default:
          break;
      }
    }

    if (accountIds.length > 0) {
      where.accountId = { in: accountIds };
    }

    if (categories.length > 0) {
      where.category = { in: categories };
    }

    if (types.length > 0) {
      where.type = { in: types };
    }

    if (dateFrom || dateTo) {
      where.date = {};

      if (dateFrom) {
        where.date.gte = dateFrom;
      }

      if (dateTo) {
        where.date.lte = dateTo;
      }
    }

    if (seriesId) {
      where.seriesId = seriesId;
    }

    return where;
  }

  private async createFromSeries(series: CashflowSeries, date: Date) {
    await this.createCashflow(
      {
        accountId: series.accountId,
        amount: series.amount,
        category: series.category ?? undefined,
        currency: series.currency,
        date: date.toISOString(),
        description: series.description ?? undefined,
        seriesId: series.id,
        type: series.type
      },
      series.userId
    );

    await this.prismaService.cashflowSeries.update({
      data: {
        lastOccurredAt: date
      },
      where: { id: series.id }
    });
  }

  private getNextOccurrence(date: Date, recurrence: CashflowRecurrence) {
    switch (recurrence) {
      case CashflowRecurrence.DAILY:
        return addDays(date, 1);
      case CashflowRecurrence.WEEKLY:
        return addWeeks(date, 1);
      case CashflowRecurrence.MONTHLY:
        return addMonths(date, 1);
      case CashflowRecurrence.QUARTERLY:
        return addQuarters(date, 1);
      case CashflowRecurrence.YEARLY:
        return addYears(date, 1);
      default:
        return null;
    }
  }

  private getSignedAmount(type: CashflowType, amount: number) {
    return type === CashflowType.INFLOW ? amount : -amount;
  }

  private async ensureAccountOwnership(accountId: string, userId: string) {
    const account = await this.prismaService.account.findUnique({
      where: {
        id_userId: {
          id: accountId,
          userId
        }
      }
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }
  }
}
