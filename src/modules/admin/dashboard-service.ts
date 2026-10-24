import { and, eq, gte, isNull } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask, order, user } from '@/config/db/schema';

export type DashboardPoint = {
  label: string;
  dateKey: string;
  users: number;
  payments: number;
  revenue: number;
  imageTasks: number;
  imageSuccess: number;
  imageFailed: number;
  failureProviders: Record<string, number>;
  imageFailureProviders: Record<string, number>;
};

export type AdminDashboardPeriodKey = 'today' | '7d' | '30d';

export type ChannelStatItem = {
  name: string;
  total: number;
  failed: number;
};

/** Headline numbers of the preceding window, for "vs previous" deltas. */
export type DashboardPreviousSummary = {
  users: number;
  payments: number;
  revenue: number;
  imageTasks: number;
};

export type AdminDashboardPeriod = {
  key: AdminDashboardPeriodKey;
  label: string;
  /** ISO start of the window (local midnight); the window ends now. */
  since: string;
  /**
   * Same elapsed length, shifted back one window: today vs yesterday up to the
   * same time, 7d vs the 7 days before, etc.
   */
  previous: DashboardPreviousSummary;
  summary: {
    users: number;
    payments: number;
    revenue: number;
    imageTasks: number;
    imageSuccess: number;
    imageFailed: number;
  };
  activeProviders: Array<{
    provider: string;
    count: number;
  }>;
  imageProviders: Array<{
    provider: string;
    count: number;
  }>;
  channelStats: {
    image: ChannelStatItem[];
  };
  points: DashboardPoint[];
};

export type AdminDashboardData = {
  periods: Record<AdminDashboardPeriodKey, AdminDashboardPeriod>;
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayLabel(date: Date, days: number, index: number) {
  if (days === 1) {
    return 'Today';
  }
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  if (days === 7 && index === days - 1) {
    return `Today · ${month}-${day}`;
  }
  return `${month}-${day}`;
}

function buildPoints(days: number): DashboardPoint[] {
  const today = startOfDay(new Date());
  const start = addDays(today, -(days - 1));

  return Array.from({ length: days }, (_, index) => {
    const current = addDays(start, index);
    return {
      label: formatDisplayLabel(current, days, index),
      dateKey: formatDateKey(current),
      users: 0,
      payments: 0,
      revenue: 0,
      imageTasks: 0,
      imageSuccess: 0,
      imageFailed: 0,
      failureProviders: {},
      imageFailureProviders: {},
    };
  });
}

function sumPoints(points: DashboardPoint[]) {
  return points.reduce(
    (acc, point) => {
      acc.users += point.users;
      acc.payments += point.payments;
      acc.revenue += point.revenue;
      acc.imageTasks += point.imageTasks;
      acc.imageSuccess += point.imageSuccess;
      acc.imageFailed += point.imageFailed;
      return acc;
    },
    {
      users: 0,
      payments: 0,
      revenue: 0,
      imageTasks: 0,
      imageSuccess: 0,
      imageFailed: 0,
    }
  );
}

function getProviderCounts(
  points: DashboardPoint[],
  key: 'failureProviders' | 'imageFailureProviders'
) {
  const counts = new Map<string, number>();

  for (const point of points) {
    for (const [provider, count] of Object.entries(point[key])) {
      counts.set(provider, (counts.get(provider) || 0) + count);
    }
  }

  return Array.from(counts.entries())
    .map(([provider, count]) => ({ provider, count }))
    .sort((a, b) => b.count - a.count);
}

export const DASHBOARD_PERIOD_DAYS: Record<AdminDashboardPeriodKey, number> = {
  today: 1,
  '7d': 7,
  '30d': 30,
};

/** Start of a dashboard window: local midnight, `days - 1` days ago. */
export function getDashboardPeriodSince(
  key: AdminDashboardPeriodKey,
  now = new Date()
): Date {
  return addDays(startOfDay(now), -(DASHBOARD_PERIOD_DAYS[key] - 1));
}

function buildPeriod(
  days: number,
  key: AdminDashboardPeriodKey
): AdminDashboardPeriod {
  const points = buildPoints(days);

  return {
    key,
    label: key,
    since: getDashboardPeriodSince(key).toISOString(),
    previous: { users: 0, payments: 0, revenue: 0, imageTasks: 0 },
    summary: sumPoints(points),
    activeProviders: [],
    imageProviders: [],
    channelStats: {
      image: [],
    },
    points,
  };
}

function toDateKey(value: Date | string | number | null | undefined) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return formatDateKey(date);
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const now = new Date();
  const today = startOfDay(now);
  const start30d = addDays(today, -29);
  // Previous windows reach back one more window (60 days for the 30d view).
  const start60d = addDays(today, -59);

  const [usersList, ordersList, tasksList] = await Promise.all([
    db()
      .select({ createdAt: user.createdAt })
      .from(user)
      // Agent service accounts (type 'api') are not sign-ups.
      .where(and(gte(user.createdAt, start60d), eq(user.type, 'user'))),
    db()
      .select({
        createdAt: order.createdAt,
        amount: order.amount,
        status: order.status,
      })
      .from(order)
      .where(
        and(
          gte(order.createdAt, start60d),
          eq(order.status, 'paid'),
          isNull(order.deletedAt)
        )
      ),
    db()
      .select({
        createdAt: aiTask.createdAt,
        status: aiTask.status,
        provider: aiTask.provider,
        model: aiTask.model,
        mediaType: aiTask.mediaType,
      })
      .from(aiTask)
      .where(and(gte(aiTask.createdAt, start60d), isNull(aiTask.deletedAt))),
  ]);

  const periods: Record<AdminDashboardPeriodKey, AdminDashboardPeriod> = {
    today: buildPeriod(1, 'today'),
    '7d': buildPeriod(7, '7d'),
    '30d': buildPeriod(30, '30d'),
  };

  const periodEntries = Object.entries(periods) as Array<
    [AdminDashboardPeriodKey, AdminDashboardPeriod]
  >;

  const applyToPeriods = (
    dateKey: string,
    updater: (point: DashboardPoint, periodKey: AdminDashboardPeriodKey) => void
  ) => {
    for (const [periodKey, period] of periodEntries) {
      const point = period.points.find((item) => item.dateKey === dateKey);
      if (point) {
        updater(point, periodKey);
      }
    }
  };

  const channelMaps: Record<
    AdminDashboardPeriodKey,
    {
      image: Map<string, ChannelStatItem>;
    }
  > = {
    today: { image: new Map() },
    '7d': { image: new Map() },
    '30d': { image: new Map() },
  };

  usersList.forEach((item: any) => {
    const dateKey = toDateKey(item.createdAt);
    if (!dateKey) return;
    applyToPeriods(dateKey, (point) => {
      point.users += 1;
    });
  });

  ordersList.forEach((item: any) => {
    const dateKey = toDateKey(item.createdAt);
    if (!dateKey) return;
    applyToPeriods(dateKey, (point) => {
      point.payments += 1;
      point.revenue += item.amount || 0;
    });
  });

  tasksList.forEach((item: any) => {
    // video-lite only tracks video generation on the admin board
    if ((item.mediaType || 'image') !== 'video') return;

    const dateKey = toDateKey(item.createdAt);
    if (!dateKey) return;
    const isSuccess = item.status === 'success';
    const isFailed = item.status === 'failed' || item.status === 'canceled';
    const provider = item.provider || 'default';
    const channelName = item.model ? `${provider} / ${item.model}` : provider;

    applyToPeriods(dateKey, (point, periodKey) => {
      point.imageTasks += 1;
      if (isSuccess) point.imageSuccess += 1;
      if (isFailed) {
        point.imageFailed += 1;
        point.imageFailureProviders[provider] =
          (point.imageFailureProviders[provider] || 0) + 1;
        point.failureProviders[provider] =
          (point.failureProviders[provider] || 0) + 1;
      }

      const cMap = channelMaps[periodKey].image;
      const exist = cMap.get(channelName) || {
        name: channelName,
        total: 0,
        failed: 0,
      };
      exist.total += 1;
      if (isFailed) exist.failed += 1;
      cMap.set(channelName, exist);
    });
  });

  // Previous-window totals: [since - span, now - span), span = window length.
  const toTime = (value: unknown) => {
    if (!value) return NaN;
    const date = value instanceof Date ? value : new Date(value as string);
    return date.getTime();
  };
  for (const [periodKey, period] of periodEntries) {
    const span = DASHBOARD_PERIOD_DAYS[periodKey] * 24 * 60 * 60 * 1000;
    const from = new Date(period.since).getTime() - span;
    const to = now.getTime() - span;
    const inPrev = (value: unknown) => {
      const t = toTime(value);
      return t >= from && t < to;
    };
    const prevOrders = ordersList.filter((o: any) => inPrev(o.createdAt));
    period.previous = {
      users: usersList.filter((u: any) => inPrev(u.createdAt)).length,
      payments: prevOrders.length,
      revenue: prevOrders.reduce(
        (sum: number, o: any) => sum + (o.amount || 0),
        0
      ),
      // Same rule as the points: only video tasks count on this board.
      imageTasks: tasksList.filter(
        (t: any) => inPrev(t.createdAt) && (t.mediaType || 'image') === 'video'
      ).length,
    };
  }

  for (const [periodKey, period] of periodEntries) {
    period.summary = sumPoints(period.points);
    period.activeProviders = getProviderCounts(
      period.points,
      'failureProviders'
    );
    period.imageProviders = getProviderCounts(
      period.points,
      'imageFailureProviders'
    );
    period.channelStats = {
      image: Array.from(channelMaps[periodKey].image.values()).sort(
        (a, b) => b.total - a.total
      ),
    };
  }

  return {
    periods,
  };
}
