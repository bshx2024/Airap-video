import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { RefreshCw, X } from 'lucide-react';

import type { AdminDashboardPeriodKey } from '@/modules/admin/dashboard-service';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const DIMENSIONS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'referrer',
  'country',
] as const;
type Dimension = (typeof DIMENSIONS)[number];

interface Counts {
  signups: number;
  checkouts: number;
  paid: number;
}
interface FunnelReport {
  since: string;
  totals: Counts;
  groupBy: Dimension;
  rows: (Counts & { value: string })[];
  options: Record<Dimension, string[]>;
}

// Select values can't be '' — sentinels for "no filter" and "untagged".
const ANY = '__any__';
const NONE = '__none__';

export function rate(part: number, whole: number) {
  if (!whole) return '—';
  return `${((part / whole) * 100).toFixed(1)}%`;
}

const EMPTY_COUNTS: Counts = { signups: 0, checkouts: 0, paid: 0 };

/**
 * Funnel for the dashboard's calendar window (`period`), so its sign-ups are
 * exactly the New Users card. Unfiltered calls share the cache with the
 * dashboard's conversion card.
 */
export function useConversionFunnel(
  period: AdminDashboardPeriodKey,
  groupBy: Dimension = 'utm_source',
  filters: Partial<Record<Dimension, string>> = {}
) {
  return useQuery({
    queryKey: ['admin-analytics-funnel', period, groupBy, filters],
    queryFn: () => {
      const params = new URLSearchParams({ period, groupBy });
      for (const [dim, value] of Object.entries(filters)) {
        if (value !== undefined) params.set(dim, value);
      }
      return apiGet<FunnelReport>(`/api/admin/analytics/funnel?${params}`);
    },
    placeholderData: keepPreviousData,
  });
}

/**
 * Conversion section of the admin dashboard: cohort funnel bars plus the
 * first-touch breakdown. The time window comes from the dashboard's range tabs.
 */
export function ConversionFunnel({
  period,
}: {
  period: AdminDashboardPeriodKey;
}) {
  const [groupBy, setGroupBy] = useState<Dimension>('utm_source');
  const [filters, setFilters] = useState<Partial<Record<Dimension, string>>>(
    {}
  );

  const query = useConversionFunnel(period, groupBy, filters);
  const report = query.data;
  const totals = report?.totals ?? EMPTY_COUNTS;
  const hasFilters = Object.keys(filters).length > 0;
  const untagged = m['admin.analytics.untagged']();

  function dimLabel(dim: Dimension) {
    return dim === 'referrer'
      ? m['admin.analytics.dim_referrer']()
      : dim === 'country'
        ? m['admin.analytics.dim_country']()
        : dim;
  }

  function setFilter(dim: Dimension, value: string | undefined) {
    setFilters((prev) => {
      const next = { ...prev };
      if (value === undefined) delete next[dim];
      else next[dim] = value;
      return next;
    });
  }

  // Sign-ups are the New Users card above, so the first bar shows only the
  // 100% baseline; later steps carry their own counts.
  const steps = [
    {
      label: m['admin.analytics.signups'](),
      // Filtered cohorts are a subset, so then the count is new information.
      value: hasFilters ? totals.signups : (null as number | null),
      share: totals.signups ? 1 : 0,
      hint: hasFilters ? '' : m['admin.dashboard.funnel.base_hint'](),
    },
    {
      label: m['admin.analytics.checkouts'](),
      value: totals.checkouts,
      share: totals.signups ? totals.checkouts / totals.signups : 0,
      hint: m['admin.analytics.of_signups']({
        rate: rate(totals.checkouts, totals.signups),
      }),
    },
    {
      label: m['admin.analytics.paid'](),
      value: totals.paid,
      share: totals.signups ? totals.paid / totals.signups : 0,
      hint: `${m['admin.analytics.of_checkouts']({
        rate: rate(totals.paid, totals.checkouts),
      })} · ${m['admin.analytics.of_signups']({
        rate: rate(totals.paid, totals.signups),
      })}`,
    },
  ];

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-base font-semibold">
            {m['admin.analytics.title']()}
          </CardTitle>
          <CardDescription>
            {m['admin.dashboard.funnel.description']()}
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => query.refetch()}
          aria-label={m['admin.analytics.refresh']()}
        >
          <RefreshCw
            className={cn('size-4', query.isFetching && 'animate-spin')}
          />
        </Button>
      </CardHeader>
      <CardContent className="min-w-0 space-y-6">
        {/* Filters (apply to the bars and the breakdown) */}
        <div className="flex flex-wrap items-center gap-2">
          {DIMENSIONS.map((dim) => {
            const options = report?.options[dim] ?? [];
            const current = filters[dim];
            // Keep the active value selectable even if it fell out of the top list.
            const values =
              current !== undefined && !options.includes(current)
                ? [current, ...options]
                : options;
            const items = [
              {
                value: ANY,
                label: `${dimLabel(dim)}: ${m['admin.analytics.any']()}`,
              },
              ...values.map((v) => ({
                value: v || NONE,
                label: `${dimLabel(dim)}: ${v || untagged}`,
              })),
            ];
            return (
              <Select
                key={dim}
                items={items}
                value={current === undefined ? ANY : current || NONE}
                onValueChange={(v) =>
                  setFilter(
                    dim,
                    !v || v === ANY ? undefined : v === NONE ? '' : String(v)
                  )
                }
              >
                <SelectTrigger
                  className={cn(
                    'max-w-60',
                    current !== undefined && 'border-primary'
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          })}
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
              <X className="size-4" />
              {m['admin.analytics.clear_filters']()}
            </Button>
          )}
        </div>

        {/* Funnel bars */}
        {query.isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-md" />
            ))}
          </div>
        ) : (
          <div
            className={cn(
              'space-y-3',
              query.isFetching && 'opacity-60 transition-opacity'
            )}
          >
            {steps.map((step) => (
              <div
                key={step.label}
                className="grid grid-cols-[minmax(0,8rem)_1fr] items-center gap-3 sm:grid-cols-[10rem_1fr_minmax(0,14rem)]"
              >
                <div className="truncate text-sm font-medium">{step.label}</div>
                <div className="bg-muted relative h-9 overflow-hidden rounded-md">
                  <div
                    className="bg-primary/25 h-full rounded-md transition-[width]"
                    style={{ width: `${Math.max(step.share * 100, 0)}%` }}
                  />
                  <span className="absolute inset-y-0 left-3 flex items-center text-sm font-semibold tabular-nums">
                    {step.value === null
                      ? rate(totals.signups, totals.signups)
                      : step.value.toLocaleString()}
                  </span>
                </div>
                <p className="text-muted-foreground col-span-2 text-xs sm:col-span-1">
                  {step.hint}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3 border-t pt-4">
          <div className="flex flex-row flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              {m['admin.analytics.breakdown']()}
            </h3>
            <Select
              items={DIMENSIONS.map((d) => ({
                value: d,
                label: `${m['admin.analytics.group_by']()}: ${dimLabel(d)}`,
              }))}
              value={groupBy}
              onValueChange={(v) => v && setGroupBy(v as Dimension)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIMENSIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {`${m['admin.analytics.group_by']()}: ${dimLabel(d)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{dimLabel(groupBy)}</TableHead>
                  <TableHead className="text-right">
                    {m['admin.analytics.signups']()}
                  </TableHead>
                  <TableHead className="text-right">
                    {m['admin.analytics.checkouts']()}
                  </TableHead>
                  <TableHead className="text-right">
                    {m['admin.analytics.checkout_rate']()}
                  </TableHead>
                  <TableHead className="text-right">
                    {m['admin.analytics.paid']()}
                  </TableHead>
                  <TableHead className="text-right">
                    {m['admin.analytics.paid_rate']()}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody
                className={cn(
                  query.isFetching && 'opacity-60 transition-opacity'
                )}
              >
                {(report?.rows ?? []).map((row) => (
                  <TableRow key={row.value}>
                    <TableCell className="max-w-80">
                      <button
                        className="hover:text-primary truncate text-left underline-offset-4 hover:underline"
                        title={m['admin.analytics.filter_by_value']()}
                        onClick={() => setFilter(groupBy, row.value)}
                      >
                        {row.value || (
                          <span className="text-muted-foreground">
                            {untagged}
                          </span>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.signups}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.checkouts}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {rate(row.checkouts, row.signups)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.paid}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {rate(row.paid, row.signups)}
                    </TableCell>
                  </TableRow>
                ))}
                {report && report.rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-muted-foreground h-24 text-center"
                    >
                      <p>{m['admin.analytics.empty']()}</p>
                      <p className="mt-1 text-xs">
                        {m['admin.analytics.empty_hint']()}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-muted-foreground text-xs">
            {m['admin.analytics.footnote']()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
