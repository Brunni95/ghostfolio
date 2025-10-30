import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { HasPermissionGuard } from '@ghostfolio/api/guards/has-permission.guard';
import { RedactValuesInResponseInterceptor } from '@ghostfolio/api/interceptors/redact-values-in-response/redact-values-in-response.interceptor';
import { Filter } from '@ghostfolio/common/interfaces';
import { permissions } from '@ghostfolio/common/permissions';
import { RequestWithUser } from '@ghostfolio/common/types';

import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { CashflowType } from '@prisma/client';
import { parseISO } from 'date-fns';

import { CashflowService } from './cashflow.service';
import { CreateCashflowDto } from './dto/create-cashflow.dto';
import { CreateCashflowSeriesDto } from './dto/create-cashflow-series.dto';
import { UpdateCashflowDto } from './dto/update-cashflow.dto';
import { UpdateCashflowSeriesDto } from './dto/update-cashflow-series.dto';

@Controller('cashflow')
export class CashflowController {
  public constructor(
    private readonly cashflowService: CashflowService,
    @Inject(REQUEST) private readonly request: RequestWithUser
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  @UseInterceptors(RedactValuesInResponseInterceptor)
  public async getCashflows(
    @Query('accounts') accounts?: string,
    @Query('categories') categories?: string,
    @Query('from') from?: string,
    @Query('seriesId') seriesId?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
    @Query('to') to?: string,
    @Query('types') types?: string
  ) {
    const filters: Filter[] = [];

    if (accounts) {
      for (const accountId of accounts.split(',')) {
        filters.push({
          id: accountId,
          type: 'ACCOUNT'
        });
      }
    }

    if (categories) {
      for (const category of categories.split(',')) {
        filters.push({
          id: category,
          type: 'CASHFLOW_CATEGORY'
        });
      }
    }

    if (types) {
      for (const type of types.split(',')) {
        if (Object.values(CashflowType).includes(type as CashflowType)) {
          filters.push({
            id: type,
            type: 'CASHFLOW_TYPE'
          });
        }
      }
    }

    const dateFrom = from ? parseISO(from) : undefined;
    const dateTo = to ? parseISO(to) : undefined;

    return this.cashflowService.cashflows({
      dateFrom,
      dateTo,
      filters,
      seriesId,
      skip: skip === undefined || isNaN(Number(skip)) ? undefined : Number(skip),
      take: take === undefined || isNaN(Number(take)) ? undefined : Number(take),
      userId: this.request.user.id
    });
  }

  @Get('series')
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async getSeries(@Query('accounts') accounts?: string) {
    const accountIds = accounts?.split(',').filter((id) => !!id) ?? [];

    return this.cashflowService.getSeries({
      accountIds,
      userId: this.request.user.id
    });
  }

  @Post()
  @HasPermission(permissions.createCashflow)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async createCashflow(@Body() data: CreateCashflowDto) {
    return this.cashflowService.createCashflow(data, this.request.user.id);
  }

  @Post('series')
  @HasPermission(permissions.createCashflowSeries)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async createCashflowSeries(@Body() data: CreateCashflowSeriesDto) {
    return this.cashflowService.createCashflowSeries(
      data,
      this.request.user.id
    );
  }

  @Put(':id')
  @HasPermission(permissions.updateCashflow)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async updateCashflow(
    @Param('id') id: string,
    @Body() data: UpdateCashflowDto
  ) {
    return this.cashflowService.updateCashflow(
      id,
      data,
      this.request.user.id
    );
  }

  @Put('series/:id')
  @HasPermission(permissions.updateCashflowSeries)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async updateCashflowSeries(
    @Param('id') id: string,
    @Body() data: UpdateCashflowSeriesDto
  ) {
    return this.cashflowService.updateCashflowSeries(
      id,
      data,
      this.request.user.id
    );
  }

  @Delete(':id')
  @HasPermission(permissions.deleteCashflow)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deleteCashflow(@Param('id') id: string) {
    return this.cashflowService.deleteCashflow(id, this.request.user.id);
  }

  @Delete('series/:id')
  @HasPermission(permissions.deleteCashflowSeries)
  @UseGuards(AuthGuard('jwt'), HasPermissionGuard)
  public async deleteCashflowSeries(@Param('id') id: string) {
    return this.cashflowService.deleteCashflowSeries(
      id,
      this.request.user.id
    );
  }
}
