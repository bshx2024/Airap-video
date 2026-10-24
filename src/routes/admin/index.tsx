'use client';

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  Percent,
  Users,
  Video,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';

import type {
  AdminDashboardData,
  AdminDashboardPeriodKey,
} from '@/modules/admin/dashboard-service';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';

import {
  ConversionFunnel,
  rate,
  useConversionFunnel,
} from './-conversion-funnel';
import { PeriodRangeSwitcher } from './-period-range-switcher';
import { AIAllTrendCharts } from './-trend-charts';

function formatCurrency(amount: number) {
  return `$${(amount / 100).toFixed(2)}`;
}

/** Change vs the previous window; hidden when both sides are zero. */
function Delta({
  current,
  previous,
  range,
}: {
  current: number;
  previous: number;
  range: AdminDashboardPeriodKey;
}) {
  if (!current && !previous) return null;
  const label =
    range === 'today'
      ? m['admin.dashboard.delta.vs_yesterday']()
      : m['admin.dashboard.delta.vs_previous']();
  if (!previous) {
    return (
      <span className="text-muted-foreground text-xs">
        {m['admin.dashboard.delta.no_previous']()} {label}
      </span>
    );
  }
  const change = (current - previous) / previous;
  const up = change >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const pct = Math.abs(change * 100);
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
      <span
        className={cn(
          'inline-flex items-center font-medium tabular-nums',
          up ? 'text-emerald-600' : 'text-rose-500'
        )}
      >
        <Icon className="size-3.5" />
        {pct.toFixed(pct > 0 && pct < 10 ? 1 : 0)}%
      </span>
      {label}
    </span>
  );
}

function StatCard({
  title,
  icon: Icon,
  iconClassName,
  value,
  children,
}: {
  title: string;
  icon: typeof Users;
  iconClassName: string;
  value: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription className="text-xs font-medium tracking-wider uppercase">
          {title}
        </CardDescription>
        <Icon className={cn('size-4', iconClassName)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function formatAxisLabel(dateKey: string, days: number) {
  if (days === 1) {
    return m['admin.dashboard.ranges.today']();
  }
  const [, month, day] = dateKey.split('-');
  return `${month}-${day}`;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="size-4 rounded" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="min-w-0 overflow-hidden">
            <CardHeader className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </CardHeader>
            <CardContent className="min-w-0">
              <Skeleton className="h-[240px] w-full rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AdminDashboardPage() {
  const [range, setRange] = useState<AdminDashboardPeriodKey>('7d');

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: () => apiGet<AdminDashboardData>('/api/admin/dashboard'),
  });

  const period = dashboardData?.periods?.[range];
  // Unfiltered funnel for the same window; shares its cache with the
  // conversion section below.
  const funnel = useConversionFunnel(range);
  const funnelTotals = funnel.data?.totals ?? {
    signups: 0,
    checkouts: 0,
    paid: 0,
  };
  const days = range === 'today' ? 1 : Number.parseInt(range, 10);

  const userChartConfig = {
    users: {
      label: m['admin.dashboard.charts.users.series'](),
      color: '#3b82f6',
    },
  } satisfies ChartConfig;

  const paymentChartConfig = {
    payments: {
      label: m['admin.dashboard.charts.payments.series'](),
      color: '#10b981',
    },
  } satisfies ChartConfig;

  const xAxisProps = {
    dataKey: 'label',
    tickLine: false,
    axisLine: false,
    minTickGap: 12,
    tickMargin: 8,
    padding: { left: 8, right: 8 },
  };

  const yAxisProps = {
    allowDecimals: false,
    tickLine: false,
    axisLine: false,
    width: 36,
    tickMargin: 8,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header & Period Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {m['admin.title']()}
          </h1>
          <p className="text-muted-foreground text-sm">
            {m['admin.description']()}
          </p>
        </div>
        <PeriodRangeSwitcher value={range} onChange={setRange} />
      </div>

      {isLoading || !period ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Summary metrics — one window (the tabs above), each vs the previous one */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={m['admin.dashboard.summary.new_users']()}
              icon={Users}
              iconClassName="text-blue-500"
              value={period.summary.users.toLocaleString()}
            >
              <Delta
                current={period.summary.users}
                previous={period.previous.users}
                range={range}
              />
            </StatCard>

            <StatCard
              title={m['admin.dashboard.summary.payments']()}
              icon={CreditCard}
              iconClassName="text-emerald-500"
              value={period.summary.payments.toLocaleString()}
            >
              <span className="text-muted-foreground">
                {m['admin.dashboard.summary.revenue']()}:{' '}
                <span className="text-foreground font-medium">
                  {formatCurrency(period.summary.revenue)}
                </span>
              </span>
              <Delta
                current={period.summary.revenue}
                previous={period.previous.revenue}
                range={range}
              />
            </StatCard>

            <StatCard
              title={m['admin.dashboard.summary.conversion']()}
              icon={Percent}
              iconClassName="text-violet-500"
              value={
                funnel.isPending ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  rate(funnelTotals.paid, funnelTotals.signups)
                )
              }
            >
              <span className="text-muted-foreground">
                {m['admin.dashboard.summary.conversion_hint']({
                  rate: rate(funnelTotals.checkouts, funnelTotals.signups),
                })}
              </span>
            </StatCard>

            <StatCard
              title={m['admin.dashboard.summary.video_tasks']()}
              icon={Video}
              iconClassName="text-sky-500"
              value={period.summary.imageTasks.toLocaleString()}
            >
              <span className="text-muted-foreground">
                <span className="font-medium text-emerald-600">
                  {period.summary.imageSuccess} ✓
                </span>
                {' · '}
                <span className="font-medium text-rose-500">
                  {period.summary.imageFailed} ✕
                </span>
              </span>
              <Delta
                current={period.summary.imageTasks}
                previous={period.previous.imageTasks}
                range={range}
              />
            </StatCard>
          </div>

          {/* Core Growth & Revenue Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* User Growth */}
            <Card className="min-w-0 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  {m['admin.dashboard.charts.users.title']()}
                </CardTitle>
                <CardDescription>
                  {m['admin.dashboard.charts.users.description']()}
                </CardDescription>
              </CardHeader>
              <CardContent className="min-w-0">
                <ChartContainer
                  className="aspect-auto h-[240px] w-full min-w-0"
                  config={userChartConfig}
                >
                  <LineChart
                    margin={{ left: 4, right: 12 }}
                    data={period.points.map((point) => ({
                      label: formatAxisLabel(point.dateKey, days),
                      users: point.users,
                    }))}
                  >
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 3"
                      opacity={0.3}
                    />
                    <XAxis {...xAxisProps} />
                    <YAxis {...yAxisProps} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="users"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Payments Trend */}
            <Card className="min-w-0 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  {m['admin.dashboard.charts.payments.title']()}
                </CardTitle>
                <CardDescription>
                  {m['admin.dashboard.charts.payments.description']()}
                </CardDescription>
              </CardHeader>
              <CardContent className="min-w-0">
                <ChartContainer
                  className="aspect-auto h-[240px] w-full min-w-0"
                  config={paymentChartConfig}
                >
                  <BarChart
                    margin={{ left: 4, right: 12 }}
                    data={period.points.map((point) => ({
                      label: formatAxisLabel(point.dateKey, days),
                      payments: point.payments,
                    }))}
                  >
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 3"
                      opacity={0.3}
                    />
                    <XAxis {...xAxisProps} />
                    <YAxis {...yAxisProps} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="payments"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* AI Video Generation Trend & Provider Failures */}
          <div className="grid gap-6 lg:grid-cols-2">
            <AIAllTrendCharts data={dashboardData} range={range} />
          </div>

          {/* Who converted: this window's sign-ups, by first-touch source */}
          <ConversionFunnel period={range} />
        </>
      )}
    </div>
  );
}

export const Route = createFileRoute('/admin/')({
  component: AdminDashboardPage,
});
