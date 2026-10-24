import { useCallback, useEffect, useRef, useState } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  CalendarClock,
  ExternalLink,
  Eye,
  Hourglass,
  Loader2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Undo2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { tDynamic } from '@/core/i18n/dynamic';
import { Link } from '@/core/i18n/navigation';
import { getPricingProduct } from '@/config/pricing';
import {
  isProcessingUpgradeOverdue,
  isUpgradeInProgress,
  PendingChangeType,
  planChangeSupport,
  resumeMode,
  shouldQueryProcessingUpgrade,
} from '@/modules/payment/plan-change';
import type {
  AwaitingConfirmation,
  PlanChangeOutcome,
} from '@/modules/payment/plan-change-service';
import {
  isPlanChangeSyncSettled,
  PLAN_CHANGE_SYNC_INTERVAL_MS,
  PLAN_CHANGE_SYNC_MAX_ATTEMPTS,
  planChangeStep,
  processingUpgradeRefreshToast,
  providerDisplayName,
  type PlanChangeSyncResult,
} from '@/modules/payment/plan-change-ui';
import { ApiError, apiGet, apiPost, type PageResult } from '@/lib/api-client';
import { apiErrorMessage } from '@/lib/api-error-message';
import { formatDate, formatDateTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { useExternalRedirect } from '@/hooks/use-external-redirect';
import { DataTable, type Column } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Subscription = {
  id: string;
  subscriptionNo: string;
  status: string;
  paymentProvider: string;
  planName?: string | null;
  productName?: string | null;
  interval?: string | null;
  intervalCount?: number | null;
  amount?: number | null;
  currency?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  canceledAt?: string | null;
  canceledEndAt?: string | null;
  canceledReason?: string | null;
  createdAt?: string | null;
  productId?: string | null;
  pendingProductId?: string | null;
  pendingEffectiveAt?: string | null;
  pendingChangeType?: string | null;
  /** Last row change; for a processing upgrade = when it was booked. */
  updatedAt?: string | null;
  /** Waffo change opened but not confirmed (current subscription only). */
  awaiting_confirmation?: AwaitingConfirmation | null;
};

type ResubscribeSuggestion = {
  product_id: string;
  previous_product_id?: string | null;
  ended_at?: string | null;
} | null;

/** Localized catalog plan name (e.g. "Pro · Monthly"), falls back to the id. */
function catalogPlanName(productId?: string | null): string {
  const product = productId ? getPricingProduct(productId) : null;
  if (!product) return productId || '—';
  const name = tDynamic(`landing.pricing.plan.${product.copyKey}.name`);
  const interval = intervalLabel(product.plan?.interval);
  return interval ? `${name} · ${interval}` : name;
}

const TABS = [
  'all',
  'active',
  'trialing',
  'paused',
  'expired',
  'pending_cancel',
  'canceled',
] as const;
type Tab = (typeof TABS)[number];

const PAGE_SIZE = 20;

function formatAmount(amount: number, currency: string) {
  const normalized = (currency || 'usd').toUpperCase();
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: normalized,
  }).format(amount / 100);
}

function statusVariant(
  status?: string | null
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const s = (status || '').toLowerCase();
  if (s === 'active' || s === 'trialing') return 'default';
  if (s === 'canceled' || s === 'expired') return 'destructive';
  return 'secondary';
}

/** Reuse tab_* keys (active / trialing / …) for badge copy. */
function statusLabel(status?: string | null): string {
  const s = (status || '').toLowerCase().trim();
  if (!s) return '—';
  const key = `settings.billing.tab_${s}`;
  const localized = tDynamic(key);
  return localized === key ? status || s : localized;
}

function intervalLabel(interval?: string | null): string {
  const i = (interval || '').toLowerCase().trim();
  if (!i) return '';
  if (i === 'month' || i === 'monthly') return m['landing.pricing.monthly']();
  if (i === 'year' || i === 'yearly') return m['landing.pricing.yearly']();
  return interval || i;
}

function cancelConfirmCopy(sub: Subscription) {
  const plan = sub.planName || sub.productName || '—';
  if (!sub.pendingProductId) {
    return m['settings.billing.cancel_description']({ plan });
  }
  // The current plan runs to period end. Not pendingEffectiveAt: for an
  // upgrade still waiting on payment it is the 24h processing deadline.
  const raw = sub.currentPeriodEnd || sub.canceledEndAt;
  const parsed = raw ? new Date(raw) : null;
  const date =
    parsed && !Number.isNaN(parsed.getTime())
      ? parsed.toLocaleDateString()
      : '—';
  return m['settings.billing.cancel_drops_pending']({
    plan,
    next: catalogPlanName(sub.pendingProductId),
    date,
  });
}

function isCancellable(status?: string | null) {
  const s = (status || '').toLowerCase();
  return s === 'active' || s === 'trialing';
}

/** Cancel waits for an upgrade still being applied (the API refuses too). */
function canCancel(sub: Subscription) {
  return isCancellable(sub.status) && !isUpgradeInProgress(sub);
}

function BillingPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('all');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewing, setViewing] = useState<Subscription | null>(null);
  const [canceling, setCanceling] = useState<Subscription | null>(null);
  /** Error from the last cancel attempt, shown inside the dialog. */
  const [cancelError, setCancelError] = useState<string | null>(null);
  // "Continue confirm" leaves for Waffo: stay busy until the page unloads.
  const { redirecting, redirect } = useExternalRedirect();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [tab, debouncedSearch]);

  const currentQuery = useQuery({
    queryKey: ['billing', 'current'],
    queryFn: () =>
      apiGet<Subscription | null>('/api/user/subscriptions/current'),
  });
  const current = currentQuery.data ?? null;
  const currentLoaded = !currentQuery.isPending;

  // Creem downgrade: the old plan has ended → offer the plan they picked.
  const resubscribeQuery = useQuery({
    queryKey: ['billing', 'resubscribe'],
    queryFn: () =>
      apiGet<{ resubscribe: ResubscribeSuggestion }>(
        '/api/user/subscriptions/change'
      ),
    enabled: currentLoaded && !current,
  });
  const resubscribe = resubscribeQuery.data?.resubscribe ?? null;

  // Waffo plan change: ask Waffo for the result (don't wait for the
  // webhook). 'confirming' = polling after the customer came back from the
  // confirm page; 'timeout' = no result yet after ~20s.
  const [syncPhase, setSyncPhase] = useState<'idle' | 'confirming' | 'timeout'>(
    'idle'
  );
  const syncRun = useRef(0);
  const quietSyncDone = useRef(false);

  const syncOnce = useCallback(
    async ({
      force = false,
    }: { force?: boolean } = {}): Promise<PlanChangeSyncResult> => {
      try {
        const res = await apiPost<{
          subscription: Subscription | null;
          sync: PlanChangeSyncResult;
          report?: unknown[];
        }>(
          '/api/user/subscriptions/change/sync',
          force ? { force } : undefined
        );
        // What the provider answered (visible in devtools for support).
        console.info('[billing] plan change sync', res.sync, res.report);
        queryClient.setQueryData(['billing', 'current'], res.subscription);
        return res.sync;
      } catch {
        return 'unavailable'; // rate limited / network: just try again
      }
    },
    [queryClient]
  );

  const pollPlanChange = useCallback(async () => {
    const run = ++syncRun.current;
    setSyncPhase('confirming');
    const provider = providerDisplayName('waffo');
    for (let i = 0; i < PLAN_CHANGE_SYNC_MAX_ATTEMPTS; i++) {
      if (i > 0) {
        await new Promise((r) => setTimeout(r, PLAN_CHANGE_SYNC_INTERVAL_MS));
      }
      if (run !== syncRun.current) return; // superseded / unmounted
      const sync = await syncOnce();
      if (run !== syncRun.current) return;
      if (isPlanChangeSyncSettled(sync)) {
        setSyncPhase('idle');
        if (sync === 'confirmed') {
          toast.success(m['settings.billing.sync_confirmed']({ provider }));
        } else if (sync === 'failed') {
          toast.error(m['settings.billing.sync_failed']({ provider }));
        }
        queryClient.invalidateQueries({ queryKey: ['billing'] });
        return;
      }
    }
    setSyncPhase('timeout');
  }, [queryClient, syncOnce]);

  useEffect(() => () => void syncRun.current++, []);

  // Back from Waffo's plan-change confirm page: poll for the result.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('plan_change') === '1') {
      url.searchParams.delete('plan_change');
      window.history.replaceState(null, '', url.toString());
      quietSyncDone.current = true;
      void pollPlanChange();
    }
  }, [pollPlanChange]);

  // Opened billing later with a change still "awaiting": check once, quietly
  // (covers a missed webhook or a closed tab after confirming).
  useEffect(() => {
    if (quietSyncDone.current || !current?.awaiting_confirmation) return;
    quietSyncDone.current = true;
    void syncOnce().then((sync) => {
      if (sync === 'confirmed' || sync === 'failed') {
        queryClient.invalidateQueries({ queryKey: ['billing'] });
      }
    });
  }, [current?.awaiting_confirmation, queryClient, syncOnce]);

  // Upgrade still "processing" 30+ min after it was booked (Waffo / Creem):
  // the webhook may be lost, so ask the provider once, quietly.
  const processingCheckDone = useRef(false);
  useEffect(() => {
    if (processingCheckDone.current || !current) return;
    if (!shouldQueryProcessingUpgrade(current)) return;
    processingCheckDone.current = true;
    void syncOnce().then((sync) => {
      if (sync === 'applied' || sync === 'failed') {
        queryClient.invalidateQueries({ queryKey: ['billing'] });
      }
    });
  }, [current, queryClient, syncOnce]);

  // 「刷新状态」 on a processing upgrade: ask the provider now.
  const refreshMutation = useMutation({
    mutationFn: () => syncOnce({ force: true }),
    onSuccess: (sync) => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      const t = processingUpgradeRefreshToast(sync);
      const text = {
        applied: m['settings.billing.refresh_applied'],
        updated: m['settings.billing.refresh_updated'],
        failed: m['settings.billing.refresh_failed'],
        throttled: m['settings.billing.refresh_throttled'],
        unsupported: m['settings.billing.refresh_unsupported'],
        pending: m['settings.billing.refresh_pending'],
        unavailable: m['settings.billing.refresh_unavailable'],
      }[t.key]();
      toast[t.kind](text);
    },
  });

  const listQuery = useQuery({
    queryKey: ['billing', 'list', page, tab, debouncedSearch],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (tab !== 'all') params.set('status', tab);
      if (debouncedSearch) params.set('search', debouncedSearch);
      return apiGet<PageResult<Subscription>>(
        `/api/user/subscriptions?${params}`
      );
    },
    placeholderData: keepPreviousData,
  });
  const rows = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;

  const cancelMutation = useMutation({
    mutationFn: (subscriptionNo: string) =>
      apiPost('/api/user/subscriptions/cancel', { subscriptionNo }),
    onSuccess: () => {
      toast.success(m['settings.billing.cancel_success']());
      setCanceling(null);
      setCancelError(null);
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (err) => {
      // Keep the dialog open and show why; the user can retry or go back.
      setCancelError(
        err instanceof ApiError
          ? apiErrorMessage(err) || m['settings.billing.cancel_failed']()
          : m['settings.billing.cancel_failed']()
      );
    },
  });
  const submitting = cancelMutation.isPending;

  const undoMutation = useMutation({
    mutationFn: (subscriptionNo: string) =>
      apiPost('/api/user/subscriptions/change/cancel', {
        subscription_no: subscriptionNo,
      }),
    onSuccess: () => {
      toast.success(m['settings.billing.pending_undo_success']());
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (err) => {
      toast.error(
        apiErrorMessage(err) || m['settings.billing.pending_undo_failed']()
      );
    },
  });

  // 「恢复订阅」 in-app (Stripe / Dodo / Creem / Waffo API): stays on this page.
  const resumeMutation = useMutation({
    mutationFn: (subscriptionNo: string) =>
      apiPost('/api/user/subscriptions/resume', { subscriptionNo }),
    onSuccess: () => {
      toast.success(m['settings.billing.resume_success']());
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err) || m['errors.resume_failed']());
    },
  });

  // Provider portal (payment method / invoices). Resume is in-app for
  // Stripe / Dodo / Creem / Waffo; cancel stays in-app for every provider.
  const portalMutation = useMutation({
    mutationFn: () =>
      apiPost<{ url: string }>('/api/user/subscriptions/portal', {
        locale: getLocale(),
      }),
    onSuccess: (res) => redirect(res.url),
    onError: (err) => {
      toast.error(apiErrorMessage(err) || m['errors.portal_failed']());
    },
  });

  // Waffo change awaiting confirmation: reopen a fresh confirm page.
  const continueMutation = useMutation({
    mutationFn: (productId: string) =>
      apiPost<PlanChangeOutcome>('/api/user/subscriptions/change', {
        product_id: productId,
        locale: getLocale(),
        // Reopening a change the customer already chose (incl. "monthly at
        // the end of the yearly period").
        accept_period_end: true,
      }),
    onSuccess: (outcome) => {
      const step = planChangeStep(outcome);
      if (step.kind === 'redirect') {
        // Button keeps its spinner until the browser leaves for Waffo.
        redirect(step.url);
        return;
      }
      if (step.kind === 'invalid') {
        toast.error(m['settings.billing.awaiting_failed']());
      }
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (err) => {
      toast.error(
        apiErrorMessage(err) || m['settings.billing.awaiting_failed']()
      );
    },
  });

  const discardMutation = useMutation({
    mutationFn: () => apiPost('/api/user/subscriptions/change/abandon'),
    onSuccess: () => {
      toast.success(m['settings.billing.awaiting_abandoned']());
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: (err) => {
      toast.error(
        apiErrorMessage(err) || m['settings.billing.awaiting_failed']()
      );
    },
  });

  function confirmCancel() {
    if (!canceling || submitting) return;
    setCancelError(null);
    cancelMutation.mutate(canceling.subscriptionNo);
  }

  function openCancel(sub: Subscription) {
    setCancelError(null);
    setCanceling(sub);
  }

  const columns: Column<Subscription>[] = [
    {
      header: m['settings.billing.subscription_no'](),
      cell: (r) => (
        <span className="font-mono text-xs">{r.subscriptionNo}</span>
      ),
    },
    {
      header: m['settings.billing.plan'](),
      cell: (r) => (
        <span className="font-medium">
          {r.planName || r.productName || '—'}
        </span>
      ),
    },
    {
      header: m['settings.billing.interval'](),
      cell: (r) =>
        r.interval ? (
          <span className="text-sm">
            {r.intervalCount ? `${r.intervalCount} ` : ''}
            {intervalLabel(r.interval)}
          </span>
        ) : (
          '—'
        ),
    },
    {
      header: m['settings.billing.status'](),
      cell: (r) => (
        <Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge>
      ),
    },
    {
      header: m['settings.billing.amount'](),
      cell: (r) =>
        r.amount && r.currency ? (
          <span className="tabular-nums">
            {formatAmount(r.amount, r.currency)}
          </span>
        ) : (
          '—'
        ),
    },
    {
      header: m['settings.billing.current_period'](),
      cell: (r) => (
        <span className="text-muted-foreground text-xs whitespace-pre-line">
          {r.currentPeriodStart && r.currentPeriodEnd
            ? `${formatDate(r.currentPeriodStart)}\n~ ${formatDate(r.currentPeriodEnd)}`
            : '—'}
        </span>
      ),
    },
    {
      header: m['settings.billing.end_time'](),
      cell: (r) => (
        <span className="text-muted-foreground text-sm">
          {r.canceledEndAt ? formatDate(r.canceledEndAt) : '—'}
        </span>
      ),
    },
    {
      header: m['settings.billing.date'](),
      cell: (r) => (
        <span className="text-muted-foreground text-sm">
          {r.createdAt ? formatDateTime(r.createdAt) : '—'}
        </span>
      ),
    },
    {
      header: m['settings.billing.actions_col'](),
      className: 'w-[80px]',
      cell: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="size-7">
                <MoreHorizontal className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setViewing(r)}>
              <Eye className="size-4" />
              {m['settings.billing.view']()}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => canCancel(r) && openCancel(r)}
              disabled={!canCancel(r)}
            >
              <XCircle className="size-4" />
              {m['settings.billing.cancel']()}
            </DropdownMenuItem>
            {isCancellable(r.status) && isUpgradeInProgress(r) && (
              <p className="text-muted-foreground max-w-56 px-2 pb-1.5 text-xs">
                {m['settings.billing.cancel_upgrade_in_progress']()}
              </p>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">{m['settings.billing.title']()}</h1>
        <p className="text-muted-foreground">
          {m['settings.billing.description']()}
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{m['settings.billing.subscription']()}</CardTitle>
            <Link
              href="/pricing"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'gap-2'
              )}
            >
              <Pencil className="size-4" />
              {current
                ? m['settings.billing.adjust']()
                : m['settings.billing.subscribe']()}
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {!currentLoaded ? (
            <p className="text-muted-foreground text-sm">…</p>
          ) : current ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold">
                  {current.planName || current.productName || '—'}
                </p>
                <Badge variant={statusVariant(current.status)}>
                  {statusLabel(current.status)}
                </Badge>
              </div>
              {current.amount && current.currency && (
                <p className="text-muted-foreground text-sm">
                  {formatAmount(current.amount, current.currency)}
                  {current.interval
                    ? ` / ${intervalLabel(current.interval)}`
                    : ''}
                </p>
              )}
              {current.canceledEndAt ? (
                <p className="text-destructive text-sm">
                  {m['settings.billing.ends_on']({
                    date: new Date(current.canceledEndAt).toLocaleDateString(),
                  })}
                </p>
              ) : current.currentPeriodEnd ? (
                <p className="text-muted-foreground text-sm">
                  {m['settings.billing.renews_on']({
                    date: new Date(
                      current.currentPeriodEnd
                    ).toLocaleDateString(),
                  })}
                </p>
              ) : null}
              {current.pendingProductId && (
                <PendingChangeNotice
                  sub={current}
                  undoing={undoMutation.isPending}
                  onUndo={() => undoMutation.mutate(current.subscriptionNo)}
                  refreshing={refreshMutation.isPending}
                  onRefresh={() => refreshMutation.mutate()}
                />
              )}
              {!current.pendingProductId && current.awaiting_confirmation && (
                <AwaitingConfirmationNotice
                  awaiting={current.awaiting_confirmation}
                  providerName={providerDisplayName(current.paymentProvider)}
                  continuing={continueMutation.isPending || redirecting}
                  discarding={discardMutation.isPending}
                  syncPhase={syncPhase}
                  onRecheck={() => void pollPlanChange()}
                  onContinue={() =>
                    continueMutation.mutate(
                      current.awaiting_confirmation!.product_id
                    )
                  }
                  onDiscard={() => discardMutation.mutate()}
                />
              )}
              {/* Cancel and resume stay in-app (incl. Waffo). */}
              {resumeMode(current) && (
                <div className="space-y-1.5 pt-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      resumeMutation.isPending ||
                      portalMutation.isPending ||
                      redirecting
                    }
                    onClick={() =>
                      resumeMode(current) === 'in_app'
                        ? resumeMutation.mutate(current.subscriptionNo)
                        : portalMutation.mutate()
                    }
                  >
                    {resumeMutation.isPending
                      ? m['settings.billing.resuming']()
                      : portalMutation.isPending || redirecting
                        ? '…'
                        : m['settings.billing.resume']()}
                  </Button>
                  <p className="text-muted-foreground text-xs">
                    {resumeMode(current) === 'in_app'
                      ? m['settings.billing.resume_hint_in_app']({
                          date: new Date(
                            current.canceledEndAt ||
                              current.currentPeriodEnd ||
                              Date.now()
                          ).toLocaleDateString(),
                        })
                      : m['settings.billing.resume_hint']({
                          provider: providerDisplayName(
                            current.paymentProvider
                          ),
                          date: new Date(
                            current.canceledEndAt ||
                              current.currentPeriodEnd ||
                              Date.now()
                          ).toLocaleDateString(),
                        })}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-muted-foreground text-3xl font-bold">
                {m['settings.billing.no_subscription']()}
              </p>
              {resubscribe && (
                <div className="border-primary/30 bg-primary/5 space-y-2 rounded-lg border p-3 text-sm">
                  <p>
                    {m['settings.billing.resubscribe_prompt']({
                      plan: catalogPlanName(resubscribe.product_id),
                    })}
                  </p>
                  <Link
                    href="/pricing"
                    className={buttonVariants({ size: 'sm' })}
                  >
                    {m['settings.billing.resubscribe_cta']({
                      plan: catalogPlanName(resubscribe.product_id),
                    })}
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
            {tDynamic(`settings.billing.tab_${tb}`)}
          </button>
        ))}
      </div>

      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={rows}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            rowKey={(r) => r.id}
            emptyText={m['settings.billing.no_subscription']()}
            search={search}
            onSearchChange={setSearch}
            onRefresh={async () => {
              currentQuery.refetch();
              await listQuery.refetch();
            }}
            loading={listQuery.isFetching || listQuery.isPending}
          />
        </CardContent>
      </Card>

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {m['settings.billing.subscription_details']()}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {viewing?.subscriptionNo}
            </DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3 py-2 text-sm">
              <DetailRow label={m['settings.billing.plan']()}>
                {viewing.planName || viewing.productName || '—'}
              </DetailRow>
              <DetailRow label={m['settings.billing.status']()}>
                <Badge variant={statusVariant(viewing.status)}>
                  {statusLabel(viewing.status)}
                </Badge>
              </DetailRow>
              <DetailRow label={m['settings.billing.amount']()}>
                {viewing.amount && viewing.currency
                  ? `${formatAmount(viewing.amount, viewing.currency)}${
                      viewing.interval
                        ? ` / ${intervalLabel(viewing.interval)}`
                        : ''
                    }`
                  : '—'}
              </DetailRow>
              <DetailRow label={m['settings.billing.provider']()}>
                {viewing.paymentProvider}
              </DetailRow>
              <DetailRow label={m['settings.billing.period_start']()}>
                {viewing.currentPeriodStart
                  ? formatDateTime(viewing.currentPeriodStart)
                  : '—'}
              </DetailRow>
              <DetailRow label={m['settings.billing.period_end']()}>
                {viewing.currentPeriodEnd
                  ? formatDateTime(viewing.currentPeriodEnd)
                  : '—'}
              </DetailRow>
              {viewing.canceledAt && (
                <DetailRow label={m['settings.billing.canceled_at']()}>
                  {formatDateTime(viewing.canceledAt)}
                </DetailRow>
              )}
              {viewing.canceledEndAt && (
                <DetailRow label={m['settings.billing.canceled_end_at']()}>
                  {formatDateTime(viewing.canceledEndAt)}
                </DetailRow>
              )}
              {viewing.canceledReason && (
                <DetailRow label={m['settings.billing.canceled_reason']()}>
                  {viewing.canceledReason}
                </DetailRow>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>
              {m['settings.billing.close']()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!canceling}
        onOpenChange={(v) => {
          // No Esc / backdrop close while the request runs.
          if (!v && !submitting) setCanceling(null);
        }}
      >
        <DialogContent showCloseButton={!submitting}>
          <DialogHeader>
            <DialogTitle>{m['settings.billing.cancel_title']()}</DialogTitle>
            <DialogDescription>
              {canceling ? cancelConfirmCopy(canceling) : null}
            </DialogDescription>
            {submitting && (
              <p
                className="text-muted-foreground flex items-center gap-1.5 text-xs sm:text-sm"
                aria-live="polite"
              >
                <Loader2 className="size-3.5 shrink-0 animate-spin" />
                {m['landing.pricing.change.processing_hint']({
                  provider: providerDisplayName(canceling?.paymentProvider),
                })}
              </p>
            )}
            {cancelError && !submitting && (
              <p
                role="alert"
                className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-xs sm:text-sm"
              >
                {cancelError}
              </p>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCanceling(null)}
              disabled={submitting}
            >
              {m['settings.billing.cancel_back']()}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancel}
              disabled={submitting}
              aria-busy={submitting || undefined}
            >
              {submitting && (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              )}
              {submitting
                ? m['settings.billing.canceling']()
                : m['settings.billing.cancel_confirm']()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Waffo plan change opened but not confirmed on Waffo's page yet. */
function AwaitingConfirmationNotice({
  awaiting,
  providerName,
  continuing,
  discarding,
  syncPhase,
  onRecheck,
  onContinue,
  onDiscard,
}: {
  awaiting: AwaitingConfirmation;
  providerName: string;
  /** Request running or already leaving for the provider page. */
  continuing: boolean;
  discarding: boolean;
  /** confirming = asking the provider for the result after the return. */
  syncPhase: 'idle' | 'confirming' | 'timeout';
  onRecheck: () => void;
  onContinue: () => void;
  onDiscard: () => void;
}) {
  const confirming = syncPhase === 'confirming';
  const busy = continuing || discarding || confirming;
  return (
    <div className="mt-3 space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
      <p className="flex items-start gap-2">
        <Hourglass className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <span>
          {m['settings.billing.awaiting_confirmation']({
            plan: catalogPlanName(awaiting.product_id),
          })}
        </span>
      </p>
      {confirming ? (
        <p
          className="text-muted-foreground flex items-center gap-1.5 text-xs"
          aria-live="polite"
        >
          <Loader2 className="size-3.5 shrink-0 animate-spin" />
          {m['settings.billing.sync_confirming']({ provider: providerName })}
        </p>
      ) : syncPhase === 'timeout' ? (
        <p className="text-muted-foreground text-xs" aria-live="polite">
          {m['settings.billing.sync_timeout']({ provider: providerName })}
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          {m['settings.billing.awaiting_hint']()}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {syncPhase === 'timeout' && (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={onRecheck}
          >
            {m['settings.billing.sync_recheck']()}
          </Button>
        )}
        <Button
          size="sm"
          className="gap-2"
          disabled={busy}
          aria-busy={continuing || undefined}
          onClick={onContinue}
        >
          {continuing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ExternalLink className="size-4" />
          )}
          {continuing
            ? m['landing.pricing.change.redirecting']({
                provider: providerName,
              })
            : m['settings.billing.awaiting_continue']()}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={busy}
          aria-busy={discarding || undefined}
          onClick={onDiscard}
        >
          {discarding && <Loader2 className="size-4 animate-spin" />}
          {discarding
            ? m['settings.billing.awaiting_abandoning']()
            : m['settings.billing.awaiting_abandon']()}
        </Button>
      </div>
    </div>
  );
}

/** Booked plan change on the current subscription (+ undo where possible). */
function PendingChangeNotice({
  sub,
  undoing,
  onUndo,
  refreshing,
  onRefresh,
}: {
  sub: Subscription;
  undoing: boolean;
  onUndo: () => void;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const upgrading = isUpgradeInProgress(sub);
  const date = sub.pendingEffectiveAt
    ? new Date(sub.pendingEffectiveAt).toLocaleDateString()
    : sub.currentPeriodEnd
      ? new Date(sub.currentPeriodEnd).toLocaleDateString()
      : '—';
  const plan = catalogPlanName(sub.pendingProductId);
  const isResubscribe = sub.pendingChangeType === PendingChangeType.RESUBSCRIBE;
  // Only a period-end booking can be undone. An upgrade waiting on payment
  // (type upgrade) is already submitted; Waffo cannot take a booking back.
  const canUndo =
    sub.pendingChangeType === PendingChangeType.DOWNGRADE &&
    planChangeSupport(sub.paymentProvider).undo;
  // Period-end bookings only: this period's plan credits expire with it and
  // the renewal grants the new plan's full credits (no rollover).
  const targetCredits =
    sub.pendingChangeType === PendingChangeType.DOWNGRADE &&
    (getPricingProduct(sub.productId || '')?.creditsValidDays ?? 0) > 0
      ? (getPricingProduct(sub.pendingProductId || '')?.credits ?? 0)
      : 0;

  return (
    <div className="border-border bg-muted/40 mt-3 space-y-2 rounded-lg border p-3 text-sm">
      <p className="flex items-start gap-2">
        <CalendarClock className="mt-0.5 size-4 shrink-0" />
        <span>
          {isResubscribe
            ? m['settings.billing.pending_resubscribe']({ plan, date })
            : sub.pendingChangeType === PendingChangeType.UPGRADE
              ? isProcessingUpgradeOverdue(sub)
                ? m['settings.billing.pending_activating_overdue']()
                : m['settings.billing.pending_activating']({ plan })
              : m['settings.billing.pending_change']({ plan, date })}
        </span>
      </p>
      {upgrading && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={refreshing}
          onClick={onRefresh}
        >
          <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
          {refreshing
            ? m['settings.billing.pending_refreshing']()
            : m['settings.billing.pending_refresh']()}
        </Button>
      )}
      {targetCredits > 0 && (
        <p className="text-muted-foreground text-xs">
          {m['settings.billing.pending_credits']({
            date,
            plan,
            credits: targetCredits,
          })}
        </p>
      )}
      {canUndo ? (
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={undoing}
          onClick={onUndo}
        >
          {undoing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Undo2 className="size-4" />
          )}
          {undoing
            ? m['settings.billing.pending_undoing']()
            : m['settings.billing.pending_undo']()}
        </Button>
      ) : (
        !isResubscribe &&
        sub.paymentProvider === 'waffo' && (
          <p className="text-muted-foreground text-xs">
            {m['settings.billing.pending_cannot_undo']()}
          </p>
        )
      )}
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="flex-1">{children}</span>
    </div>
  );
}

export const Route = createFileRoute('/settings/billing')({
  component: BillingPage,
});
