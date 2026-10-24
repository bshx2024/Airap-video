/**
 * Daily safety net behind the billing-page reconcile: a subscription whose
 * owner never opens billing would otherwise stay on an ended period when its
 * renewal / cancel (Stripe, Dodo, Creem, Waffo) or booked downgrade (Waffo
 * `plan_changed`) webhook was lost. The cron picks subscriptions lapsed for more than
 * RECONCILE_LAPSE_MS and runs the same syncs billing load uses, with
 * `force` (no per-minute throttle). Everything they call is claim-first and
 * keyed like the webhooks, so a run that overlaps a webhook or a page load
 * records nothing twice.
 *
 * Bounded per run (RECONCILE_BATCH_LIMIT, one subscription at a time) to
 * stay inside the Worker's subrequest budget; the rest wait for the next run.
 */
import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
} from 'drizzle-orm';

import { db } from '@/core/db';
import { subscription } from '@/config/db/schema';
import { SubscriptionStatus } from '@/modules/subscriptions/service';

import {
  isRenewalLapsed,
  isScheduledChangeOverdue,
  PendingChangeType,
  RENEWAL_QUERY_PROVIDERS,
  SCHEDULED_CHANGE_QUERY_PROVIDERS,
} from './plan-change';
import {
  syncLapsedRenewal,
  syncScheduledPlanChange,
  type ProcessingUpgradeSub,
  type ProcessingUpgradeSyncState,
} from './processing-upgrade-sync';

/** How long past its due time a subscription must be before the cron asks. */
export const RECONCILE_LAPSE_MS = 6 * 60 * 60 * 1000;

/** Most subscriptions asked per run. */
export const RECONCILE_BATCH_LIMIT = 25;

export type ReconcileKind = 'renewal' | 'scheduled_change';

/** Which sync a subscription needs, or null when it is not overdue. */
export function reconcileKind(
  sub: ProcessingUpgradeSub,
  now = Date.now(),
  lapseMs = RECONCILE_LAPSE_MS
): ReconcileKind | null {
  // A booked Waffo change owns the next period: apply it first (its renewal
  // on the old order never comes).
  if (
    sub.status !== SubscriptionStatus.CANCELED &&
    sub.status !== SubscriptionStatus.EXPIRED &&
    isScheduledChangeOverdue(sub, now - lapseMs)
  ) {
    return 'scheduled_change';
  }
  if (isRenewalLapsed(sub, now, lapseMs)) return 'renewal';
  return null;
}

/**
 * Subscriptions overdue by more than `lapseMs`, most recently due first (so
 * a few long-stuck rows cannot starve fresh lapses), at most `limit`.
 */
export async function findReconcileCandidates({
  now = Date.now(),
  lapseMs = RECONCILE_LAPSE_MS,
  limit = RECONCILE_BATCH_LIMIT,
}: { now?: number; lapseMs?: number; limit?: number } = {}) {
  const cutoff = new Date(now - lapseMs);
  const rows: ProcessingUpgradeSub[] = await db()
    .select()
    .from(subscription)
    .where(
      and(
        isNull(subscription.deletedAt),
        or(
          and(
            inArray(subscription.paymentProvider, [...RENEWAL_QUERY_PROVIDERS]),
            inArray(subscription.status, [
              SubscriptionStatus.ACTIVE,
              SubscriptionStatus.TRIALING,
            ]),
            isNotNull(subscription.subscriptionId),
            lte(subscription.currentPeriodEnd, cutoff)
          ),
          and(
            inArray(subscription.paymentProvider, [
              ...SCHEDULED_CHANGE_QUERY_PROVIDERS,
            ]),
            inArray(subscription.status, [
              SubscriptionStatus.ACTIVE,
              SubscriptionStatus.TRIALING,
              SubscriptionStatus.PENDING_CANCEL,
            ]),
            eq(subscription.pendingChangeType, PendingChangeType.DOWNGRADE),
            isNotNull(subscription.pendingProductId),
            or(
              lte(subscription.pendingEffectiveAt, cutoff),
              and(
                isNull(subscription.pendingEffectiveAt),
                lte(subscription.currentPeriodEnd, cutoff)
              )
            )
          )
        )
      )
    )
    .orderBy(desc(subscription.currentPeriodEnd))
    .limit(limit);
  // The SQL is the coarse cut; the same predicates billing uses decide.
  return rows.filter((row) => reconcileKind(row, now, lapseMs) !== null);
}

export type ReconcileSummary = {
  checked: number;
  states: Partial<Record<ProcessingUpgradeSyncState, number>>;
};

/** Ask the provider for each overdue subscription and apply like its webhook. */
export async function reconcileLapsedSubscriptions({
  now = Date.now(),
  lapseMs = RECONCILE_LAPSE_MS,
  limit = RECONCILE_BATCH_LIMIT,
}: {
  now?: number;
  lapseMs?: number;
  limit?: number;
} = {}): Promise<ReconcileSummary> {
  const candidates = await findReconcileCandidates({ now, lapseMs, limit });
  const summary: ReconcileSummary = { checked: 0, states: {} };
  for (const sub of candidates) {
    const kind = reconcileKind(sub, now, lapseMs);
    let state: ProcessingUpgradeSyncState;
    try {
      ({ state } =
        kind === 'renewal'
          ? await syncLapsedRenewal(sub, { force: true, now, graceMs: lapseMs })
          : await syncScheduledPlanChange(sub, { force: true, now }));
    } catch (error) {
      console.error('[payment] reconcile failed', {
        subscriptionNo: sub.subscriptionNo,
        error: (error as Error)?.message || String(error),
      });
      state = 'unavailable';
    }
    summary.checked += 1;
    summary.states[state] = (summary.states[state] || 0) + 1;
  }
  return summary;
}
