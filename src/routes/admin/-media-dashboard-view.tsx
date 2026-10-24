'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  ListFilter,
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
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';

import { PeriodRangeSwitcher } from './-period-range-switcher';

const PROVIDER_COLORS = [
  '#2563eb',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#84cc16',
];

function formatAxisLabel(dateKey: string, days: number) {
  if (days === 1) {
    return m['admin.dashboard.ranges.today']();
  }
  const [, month, day] = dateKey.split('-');
  return `${month}-${day}`;
}

function MediaDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 sm:p-6 sm:pb-2">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="size-4 rounded" />
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <Skeleton className="h-7 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="min-w-0 overflow-hidden">
            <CardHeader className="space-y-2 p-4 sm:p-6">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </CardHeader>
            <CardContent className="min-w-0 p-4 pt-0 sm:p-6 sm:pt-0">
              <Skeleton className="h-[260px] w-full rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="space-y-2 p-4 sm:p-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </CardHeader>
        <CardContent className="grid gap-3 p-4 pt-0 sm:grid-cols-2 sm:p-6 sm:pt-0 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-md" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function MediaDashboardView({
  mediaType = 'video',
  title,
  description,
  tasksLabel,
  failedTasksLabel,
}: {
  mediaType?: 'image' | 'video';
  title: string;
  description: string;
  tasksLabel: string;
  failedTasksLabel: string;
}) {
  const [range, setRange] = useState<AdminDashboardPeriodKey>('7d');

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: () => apiGet<AdminDashboardData>('/api/admin/dashboard'),
  });

  const period = dashboardData?.periods?.[range];
  const days = range === 'today' ? 1 : Number.parseInt(range, 10);

  const stats = useMemo(() => {
    if (!period) return { total: 0, success: 0, failed: 0, rate: '100%' };
    const total = period.summary.imageTasks;
    const success = period.summary.imageSuccess;
    const failed = period.summary.imageFailed;
    const rate =
      total > 0 ? `${((success / total) * 100).toFixed(1)}%` : '100%';
    return { total, success, failed, rate };
  }, [period]);

  const activeProviders = useMemo(() => {
    if (!period) return [];
    return period.imageProviders || [];
  }, [period]);

  const channelStats = useMemo(() => {
    if (!period?.channelStats) return [];
    return period.channelStats.image || [];
  }, [period]);

  const lineChartConfig = {
    total: {
      label: m['admin.dashboard.charts.tasks.series_total'](),
      color: '#3b82f6',
    },
    success: {
      label: m['admin.dashboard.charts.tasks.series_success'](),
      color: '#10b981',
    },
    failed: {
      label: m['admin.dashboard.charts.tasks.series_failed'](),
      color: '#ef4444',
    },
  } satisfies ChartConfig;

  const failureChartConfig = useMemo(() => {
    return activeProviders.reduce((acc, item, index) => {
      acc[item.provider] = {
        label: item.provider,
        color: PROVIDER_COLORS[index % PROVIDER_COLORS.length],
      };
      return acc;
    }, {} as ChartConfig);
  }, [activeProviders]);

  const failureChartData = useMemo(() => {
    if (!period) return [];
    return period.points.map((point) => {
      const next: Record<string, string | number> = {
        label: formatAxisLabel(point.dateKey, days),
      };

      const sourceMap = point.imageFailureProviders;

      activeProviders.forEach((provider) => {
        next[provider.provider] = sourceMap?.[provider.provider] || 0;
      });

      return next;
    });
  }, [days, activeProviders, period]);

  const lineChartData = useMemo(() => {
    if (!period) return [];
    return period.points.map((point) => ({
      label: formatAxisLabel(point.dateKey, days),
      total: point.imageTasks,
      success: point.imageSuccess,
      failed: point.imageFailed,
    }));
  }, [period, days]);

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

  const MediaIcon = mediaType === 'video' ? Video : ImageIcon;
  const mainColor = mediaType === 'video' ? '#8b5cf6' : '#3b82f6';

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header with Title and Action Links */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {title}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <PeriodRangeSwitcher value={range} onChange={setRange} size="sm" />

          <Link
            to="/admin/ai-tasks"
            search={{ type: mediaType }}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'inline-flex h-9 shrink-0 items-center gap-1.5 px-3 text-xs whitespace-nowrap'
            )}
          >
            <ListFilter className="size-3.5 shrink-0" />
            <span>{tasksLabel}</span>
          </Link>

          <Link
            to="/admin/ai-tasks"
            search={{ type: mediaType, status: 'failed' }}
            className={cn(
              buttonVariants({ variant: 'destructive', size: 'sm' }),
              'inline-flex h-9 shrink-0 items-center gap-1.5 px-3 text-xs whitespace-nowrap'
            )}
          >
            <AlertTriangle className="size-3.5 shrink-0" />
            <span>{failedTasksLabel}</span>
          </Link>
        </div>
      </div>

      {isLoading || !period ? (
        <MediaDashboardSkeleton />
      ) : (
        <>
          {/* 4 Metric Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 sm:p-6 sm:pb-2">
                <CardDescription className="truncate text-xs font-medium tracking-wider uppercase">
                  {m['admin.dashboard.charts.tasks.series_total']()}
                </CardDescription>
                <MediaIcon
                  className="size-4 shrink-0"
                  style={{ color: mainColor }}
                />
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="text-xl font-bold sm:text-2xl">
                  {stats.total}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 sm:p-6 sm:pb-2">
                <CardDescription className="truncate text-xs font-medium tracking-wider uppercase">
                  {m['admin.dashboard.charts.tasks.series_success']()}
                </CardDescription>
                <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="text-xl font-bold text-emerald-600 sm:text-2xl dark:text-emerald-400">
                  {stats.success}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 sm:p-6 sm:pb-2">
                <CardDescription className="truncate text-xs font-medium tracking-wider uppercase">
                  {m['admin.dashboard.charts.tasks.series_failed']()}
                </CardDescription>
                <AlertTriangle className="size-4 shrink-0 text-rose-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="text-xl font-bold text-rose-600 sm:text-2xl dark:text-rose-400">
                  {stats.failed}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 sm:p-6 sm:pb-2">
                <CardDescription className="truncate text-xs font-medium tracking-wider uppercase">
                  {m['admin.media.success_rate']()}
                </CardDescription>
                <Activity className="size-4 shrink-0 text-sky-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="text-foreground text-xl font-bold sm:text-2xl">
                  {stats.rate}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row: Trend Line Chart & Provider Failure Distribution */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Trend Chart */}
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base font-semibold">
                  {m['admin.media.trend_title']()}
                </CardTitle>
                <CardDescription className="text-xs">
                  {m['admin.media.trend_desc']()}
                </CardDescription>
              </CardHeader>
              <CardContent className="min-w-0 p-4 pt-0 sm:p-6 sm:pt-0">
                <ChartContainer
                  className="aspect-auto h-[260px] w-full min-w-0"
                  config={lineChartConfig}
                >
                  <LineChart
                    margin={{ left: 4, right: 12 }}
                    data={lineChartData}
                  >
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 3"
                      opacity={0.3}
                    />
                    <XAxis {...xAxisProps} />
                    <YAxis {...yAxisProps} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke={mainColor}
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="success"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="failed"
                      stroke="#ef4444"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Provider Failure Distribution */}
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base font-semibold">
                  {m['admin.dashboard.charts.failures.title']()}
                </CardTitle>
                <CardDescription className="text-xs">
                  {m['admin.dashboard.charts.failures.description']()}
                </CardDescription>
                {activeProviders.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {activeProviders.map((provider, index) => (
                      <Badge
                        key={provider.provider}
                        variant="outline"
                        className="text-[11px]"
                        style={{
                          borderColor:
                            PROVIDER_COLORS[index % PROVIDER_COLORS.length],
                        }}
                      >
                        {provider.provider} · {provider.count}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent className="min-w-0 p-4 pt-0 sm:p-6 sm:pt-0">
                <ChartContainer
                  className="aspect-auto h-[260px] w-full min-w-0"
                  config={failureChartConfig}
                >
                  <BarChart
                    margin={{ left: 4, right: 12 }}
                    data={failureChartData}
                  >
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 3"
                      opacity={0.3}
                    />
                    <XAxis {...xAxisProps} />
                    <YAxis {...yAxisProps} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    {activeProviders.map((provider, index) => (
                      <Bar
                        key={provider.provider}
                        dataKey={provider.provider}
                        stackId="failures"
                        fill={PROVIDER_COLORS[index % PROVIDER_COLORS.length]}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Channels / Models Breakdown */}
          {channelStats.length > 0 && (
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base font-semibold">
                  {m['admin.media.channels_title']()}
                </CardTitle>
                <CardDescription className="text-xs">
                  {m['admin.media.channels_desc']()}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {channelStats.map((item) => {
                    const failRate =
                      item.total > 0
                        ? ((item.failed / item.total) * 100).toFixed(1)
                        : '0.0';
                    return (
                      <div
                        key={item.name}
                        className="bg-card flex flex-col justify-between rounded-lg border p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span
                            className="truncate text-xs font-semibold"
                            title={item.name}
                          >
                            {item.name}
                          </span>
                          <Badge
                            variant={
                              item.failed > 0 ? 'destructive' : 'secondary'
                            }
                            className="shrink-0 text-[10px]"
                          >
                            {m['admin.media.fail_rate']({ rate: failRate })}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground flex items-center justify-between text-xs">
                          <span>
                            {m['admin.media.total_calls']()}{' '}
                            <strong className="text-foreground">
                              {item.total}
                            </strong>
                          </span>
                          <span>
                            {m['admin.media.failed_calls']()}{' '}
                            <strong className="text-rose-500">
                              {item.failed}
                            </strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
