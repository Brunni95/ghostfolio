import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { Cashflow } from '@prisma/client';

export interface ImportResponse {
  activities: Activity[];
  cashflows?: Cashflow[];
}
