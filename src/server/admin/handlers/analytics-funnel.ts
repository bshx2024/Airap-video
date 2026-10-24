import {
  getDashboardPeriodSince,
  type AdminDashboardPeriodKey,
} from '@/modules/admin/dashboard-service';
import {
  FUNNEL_DIMENSIONS,
  getFunnelReport,
  type FunnelDimension,
  type FunnelRange,
} from '@/modules/analytics/service';
import { respData, respErr } from '@/lib/resp';

import type { AdminHandlerContext } from '../types';

// Input is already validated by the operation schema in lib/admin-operations.
export async function GET({ request }: AdminHandlerContext) {
  try {
    const { searchParams } = new URL(request.url);
    const filters: Partial<Record<FunnelDimension, string>> = {};
    for (const dim of FUNNEL_DIMENSIONS) {
      const value = searchParams.get(dim);
      if (value !== null) filters[dim] = value;
    }
    // `period` aligns the cohort with the admin dashboard's calendar windows
    // (today / last 7 / last 30 days from local midnight), so the funnel's
    // sign-ups equal the dashboard's New Users card.
    const period = searchParams.get('period') as AdminDashboardPeriodKey | null;
    const report = await getFunnelReport({
      range: (searchParams.get('range') || '7d') as FunnelRange,
      since: period ? getDashboardPeriodSince(period) : undefined,
      groupBy: (searchParams.get('groupBy') || 'utm_source') as FunnelDimension,
      filters,
    });
    return respData(report);
  } catch (error: any) {
    return respErr(error.message || 'Internal error');
  }
}
