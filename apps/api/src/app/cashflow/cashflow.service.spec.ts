import { CashflowService } from './cashflow.service';

import { PortfolioChangedEvent } from '@ghostfolio/api/events/portfolio-changed.event';
import { CashflowRecurrence, CashflowType } from '@prisma/client';

describe('CashflowService', () => {
  let cashflowService: CashflowService;
  let accountService: { updateAccountBalance: jest.Mock };
  let eventEmitter: { emit: jest.Mock };
  let prismaService: any;

  beforeEach(() => {
    accountService = {
      updateAccountBalance: jest.fn().mockResolvedValue(null)
    } as any;

    eventEmitter = {
      emit: jest.fn()
    } as any;

    prismaService = {
      account: {
        findUnique: jest.fn().mockResolvedValue({ id: 'account', userId: 'user' })
      },
      cashflow: {
        create: jest.fn().mockImplementation(async ({ data }) => ({
          ...data,
          accountId: data.account.connect.id_userId.id,
          currency: data.currency,
          id: 'cashflow-id',
          userId: 'user'
        })),
        delete: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([])
      },
      cashflowSeries: {
        delete: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({ id: 'series-id', userId: 'user' }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue(null)
      }
    } as any;

    cashflowService = new CashflowService(
      accountService as any,
      eventEmitter as any,
      prismaService
    );
  });

  it('should create a cashflow and update account balance', async () => {
    const cashflow = await cashflowService.createCashflow(
      {
        accountId: 'account',
        amount: 100,
        currency: 'USD',
        date: '2024-01-01T00:00:00.000Z',
        type: CashflowType.INFLOW
      },
      'user'
    );

    expect(prismaService.account.findUnique).toHaveBeenCalled();
    expect(prismaService.cashflow.create).toHaveBeenCalled();
    expect(accountService.updateAccountBalance).toHaveBeenCalledWith({
      accountId: 'account',
      amount: 100,
      currency: 'USD',
      date: new Date('2024-01-01T00:00:00.000Z'),
      userId: 'user'
    });
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      PortfolioChangedEvent.getName(),
      expect.any(PortfolioChangedEvent)
    );
    expect(cashflow).toMatchObject({ amount: 100, type: CashflowType.INFLOW });
  });

  it('processRecurringCashflows should create cashflows for due series', async () => {
    const createCashflowSpy = jest
      .spyOn(cashflowService, 'createCashflow')
      .mockResolvedValue({} as any);

    prismaService.cashflowSeries.findMany.mockResolvedValue([
      {
        accountId: 'account',
        amount: 50,
        category: null,
        currency: 'USD',
        description: null,
        endDate: null,
        id: 'series-id',
        lastOccurredAt: new Date('2024-01-01T00:00:00.000Z'),
        recurrence: CashflowRecurrence.MONTHLY,
        startDate: new Date('2024-01-01T00:00:00.000Z'),
        timezone: 'UTC',
        type: CashflowType.OUTFLOW,
        userId: 'user'
      }
    ]);

    await cashflowService.processRecurringCashflows(
      new Date('2024-03-15T00:00:00.000Z')
    );

    expect(createCashflowSpy).toHaveBeenCalledTimes(2);
    expect(prismaService.cashflowSeries.update).toHaveBeenCalled();
  });
});
