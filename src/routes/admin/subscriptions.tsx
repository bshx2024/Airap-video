import { useEffect, useState } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Eraser, MoreHorizontal, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { tDynamic } from '@/core/i18n/dynamic';
import { getPricingProduct } from '@/config/pricing';
import {
  isStaleProcessingUpgrade,
  PendingChangeType,
  processingUpgradeSince,
} from '@/modules/payment/plan-change';
import type { ProcessingUpgradeSyncState } from '@/modules/payment/processing-upgrade-sync';
import { apiDelete, apiGet, apiPost, type PageResult } from '@/lib/api-client';
import { apiErrorMessage } from '@/lib/api-error-message';
import { formatDateTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { DataTable, type Column } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserCell } from '@/components/user-cell';

interface Subscription {
  id: string;
  subscriptionNo: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  userImage: string | null;
  userAccountEmail: string | null;
  status: string;
  amount: number | null;
  currency: string | null;
  interval: string | null;
  paymentProvider: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  description: string | null;
  productId: string | null;
  pendingProductId: string | null;
  pendingEffectiveAt: string | null;
  pendingChangeType: string | null;
  providerScheduleId: string | null;
  updatedAt: string | null;
  createdAt: string;
}

/** Catalog plan name (e.g. "Pro · Monthly"), falls back to the id. */
function catalogPlanName(productId?: string | null): string {
  const product = productId ? getPricingProduct(productId) : null;
  if (!product) return productId || '—';
  const name = tDynamic(`landing.pricing.plan.${product.copyKey}.name`);
  const interval = product.plan?.interval;
  const label =
    interval === 'year'
      ? m['landing.pricing.yearly']()
      : interval === 'month'
        ? m['landing.pricing.monthly']()
        : '';
  return label ? `${name} · ${label}` : name;
}

function PendingChangeCell({ sub }: { sub: Subscription }) {
  if (!sub.pendingProductId && !sub.pendingChangeType) return <>—</>;
  const plan = catalogPlanName(sub.pendingProductId);
  if (sub.pendingChangeType === PendingChangeType.UPGRADE) {
    const since = processingUpgradeSince(sub);
    const stale = isStaleProcessingUpgrade(sub);
    return (
      <div className="space-y-0.5 text-xs">
        <Badge variant={stale ? 'destructive' : 'secondary'}>
          {stale
            ? m['admin.subscriptions.pending_upgrade_stale']()
            : m['admin.subscriptions.pending_upgrade']()}
        </Badge>
        <div>→ {plan}</div>
        {since !== null && (
          <div className="text-muted-foreground">
            {m['admin.subscriptions.pending_since']({
              time: formatDateTime(new Date(since).toISOString()),
            })}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-0.5 text-xs">
      <Badge variant="outline">
        {sub.pendingChangeType === PendingChangeType.RESUBSCRIBE
          ? m['admin.subscriptions.pending_resubscribe']()
          : m['admin.subscriptions.pending_period_end']()}
      </Badge>
      <div>→ {plan}</div>
      {sub.pendingEffectiveAt && (
        <div className="text-muted-foreground">
          {m['admin.subscriptions.pending_effective']({
            time: formatDateTime(sub.pendingEffectiveAt),
          })}
        </div>
      )}
    </div>
  );
}

const SYNC_TOAST: Record<
  ProcessingUpgradeSyncState,
  { kind: 'success' | 'info' | 'error'; text: () => string }
> = {
  applied: { kind: 'success', text: m['admin.subscriptions.sync_applied'] },
  failed: { kind: 'info', text: m['admin.subscriptions.sync_failed'] },
  pending: { kind: 'info', text: m['admin.subscriptions.sync_pending'] },
  throttled: { kind: 'info', text: m['admin.subscriptions.sync_throttled'] },
  unsupported: {
    kind: 'info',
    text: m['admin.subscriptions.sync_unsupported'],
  },
  unavailable: {
    kind: 'error',
    text: m['admin.subscriptions.sync_unavailable'],
  },
  idle: { kind: 'info', text: m['admin.subscriptions.sync_idle'] },
};

const PAGE_SIZE = 20;

const TABS = ['all', 'month', 'year'] as const;
type Tab = (typeof TABS)[number];

function SubscriptionsPage() {
  const initialSearch = Route.useSearch().search ?? '';
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [tab, debouncedSearch]);

  const query = useQuery({
    queryKey: ['admin-subscriptions', page, tab, debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (tab === 'month') params.set('interval', 'month');
      if (tab === 'year') params.set('interval', 'year');
      if (debouncedSearch) params.set('search', debouncedSearch);
      return apiGet<PageResult<Subscription>>(
        `/api/admin/subscriptions?${params}`
      );
    },
    placeholderData: keepPreviousData,
  });

  const subscriptions = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  const queryClient = useQueryClient();
  const [clearing, setClearing] = useState<Subscription | null>(null);

  const syncMutation = useMutation({
    mutationFn: (subscriptionNo: string) =>
      apiPost<{ state: ProcessingUpgradeSyncState }>(
        '/api/admin/subscriptions/pending',
        { subscriptionNo }
      ),
    onSuccess: ({ state }) => {
      const t = SYNC_TOAST[state] || SYNC_TOAST.unavailable;
      toast[t.kind](t.text());
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    },
    onError: (e: Error) => toast.error(apiErrorMessage(e)),
  });

  const clearMutation = useMutation({
    mutationFn: (subscriptionNo: string) =>
      apiDelete(
        `/api/admin/subscriptions/pending?${new URLSearchParams({ subscriptionNo })}`
      ),
    onSuccess: () => {
      toast.success(m['admin.subscriptions.clear_pending_success']());
      setClearing(null);
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    },
    onError: (e: Error) => toast.error(apiErrorMessage(e)),
  });

  function formatAmount(amount: number | null, currency: string | null) {
    if (amount == null) return '—';
    const value = amount / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(value);
  }

  function formatDate(d: string | null) {
    if (!d) return '—';
    return formatDateTime(d);
  }

  const statusVariant = (s: string) => {
    if (s === 'active' || s === 'trialing') return 'default' as const;
    if (s === 'canceled' || s === 'expired') return 'destructive' as const;
    return 'secondary' as const;
  };

  const columns: Column<Subscription>[] = [
    {
      header: m['admin.subscriptions.subscription_no'](),
      cell: (s) => (
        <span className="font-mono text-xs">{s.subscriptionNo}</span>
      ),
    },
    {
      header: m['admin.subscriptions.user'](),
      cell: (s) => (
        <UserCell
          userId={s.userId}
          name={s.userName}
          email={s.userAccountEmail || s.userEmail}
          image={s.userImage}
        />
      ),
    },
    {
      header: m['admin.subscriptions.amount'](),
      cell: (s) => (
        <span className="font-medium">
          {formatAmount(s.amount, s.currency)}
        </span>
      ),
    },
    {
      header: m['admin.subscriptions.interval'](),
      cell: (s) => s.interval || '—',
    },
    {
      header: m['admin.subscriptions.status'](),
      cell: (s) => <Badge variant={statusVariant(s.status)}>{s.status}</Badge>,
    },
    {
      header: m['admin.subscriptions.provider'](),
      cell: (s) => s.paymentProvider,
    },
    {
      header: m['admin.subscriptions.period'](),
      cell: (s) => (
        <span className="text-muted-foreground text-sm">
          {formatDate(s.currentPeriodStart)} ~ {formatDate(s.currentPeriodEnd)}
        </span>
      ),
    },
    {
      header: m['admin.subscriptions.pending_change'](),
      cell: (s) => <PendingChangeCell sub={s} />,
    },
    {
      header: m['admin.subscriptions.created_at'](),
      cell: (s) => (
        <span className="text-muted-foreground text-sm">
          {formatDateTime(s.createdAt)}
        </span>
      ),
    },
    {
      header: m['admin.subscriptions.actions'](),
      className: 'w-[80px]',
      cell: (s) => {
        const hasPending = !!(s.pendingProductId || s.pendingChangeType);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="size-7">
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={
                  s.pendingChangeType !== PendingChangeType.UPGRADE ||
                  syncMutation.isPending
                }
                onClick={() => syncMutation.mutate(s.subscriptionNo)}
              >
                <RefreshCw
                  className={cn(
                    'size-4',
                    syncMutation.isPending &&
                      syncMutation.variables === s.subscriptionNo &&
                      'animate-spin'
                  )}
                />
                {m['admin.subscriptions.sync_pending_action']()}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!hasPending}
                onClick={() => hasPending && setClearing(s)}
              >
                <Eraser className="size-4" />
                {m['admin.subscriptions.clear_pending']()}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">
          {m['admin.subscriptions.title']()}
        </h1>
        <p className="text-muted-foreground">
          {m['admin.subscriptions.description']()}
        </p>
      </div>

      <div className="border-border flex gap-1 overflow-x-auto overflow-y-hidden border-b">
        {TABS.map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
              tab === tb
                ? 'border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            )}
          >
            {tDynamic(`admin.subscriptions.tab_${tb}`)}
          </button>
        ))}
      </div>

      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={subscriptions}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            rowKey={(s) => s.id}
            emptyText={m['admin.subscriptions.no_subscriptions']()}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={m['admin.subscriptions.search_placeholder']()}
            onRefresh={() => query.refetch()}
            loading={query.isFetching || query.isPending}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!clearing}
        onOpenChange={(open) => !open && setClearing(null)}
        variant="warning"
        title={m['admin.subscriptions.clear_pending_title']()}
        description={
          clearing
            ? m['admin.subscriptions.clear_pending_desc']({
                subscriptionNo: clearing.subscriptionNo,
                plan: catalogPlanName(clearing.pendingProductId),
              })
            : undefined
        }
        confirmText={m['admin.subscriptions.clear_pending_confirm']()}
        isLoading={clearMutation.isPending}
        closeOnConfirm={false}
        onConfirm={() => {
          if (clearing) clearMutation.mutate(clearing.subscriptionNo);
        }}
      />
    </div>
  );
}

export const Route = createFileRoute('/admin/subscriptions')({
  validateSearch: (search: Record<string, unknown>): { search?: string } =>
    typeof search.search === 'string' && search.search
      ? { search: search.search }
      : {},
  component: SubscriptionsPage,
});
