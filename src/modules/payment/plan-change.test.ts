import { describe, expect, it } from 'vitest';

import { getPricingProduct } from '@/config/pricing';

import {
  canResumeInPortal,
  canResumeSubscription,
  hasCustomerPortal,
  isPendingCancelExpired,
  isPendingChangeDue,
  isPlanPurchaseBlockedByEnding,
  isProcessingUpgradeOverdue,
  isReplacedByPlanChange,
  isStaleProcessingUpgrade,
  isSubscriptionEnding,
  isUnconfirmedWaffoBooking,
  isUpgradeInProgress,
  isWaffoOrderId,
  PendingChangeType,
  pickAwaitingWaffoPlanChange,
  pickConfirmedWaffoPlanChange,
  planCardAction,
  planChangeSupport,
  planFieldsFor,
  PROCESSING_UPGRADE_RECHECK_MS,
  PROCESSING_UPGRADE_TTL_MS,
  processingUpgradeSince,
  RENEWAL_SKEW_MS,
  replacedSubscriptionAction,
  resolveRenewalProductId,
  resumeMode,
  shouldKeepUserCancel,
  shouldPreservePlanChangeCancel,
  shouldQueryProcessingUpgrade,
  WAFFO_CONFIRM_TTL_MS,
  waffoChangeMustWaitForPeriodEnd,
  waffoPlanChangeCandidates,
} from './plan-change';

const day = 24 * 60 * 60 * 1000;
const periodEnd = new Date('2026-11-10T08:00:00Z');

const bookedDowngrade = {
  productId: 'ultra_monthly',
  paymentProvider: 'dodo',
  status: 'active',
  pendingProductId: 'pro_monthly',
  pendingEffectiveAt: periodEnd,
  pendingChangeType: PendingChangeType.DOWNGRADE,
};

describe('isPendingChangeDue', () => {
  it('due when the new period starts at (or around) the effective date', () => {
    expect(isPendingChangeDue(bookedDowngrade, periodEnd)).toBe(true);
    // provider period start drifts a few minutes
    expect(
      isPendingChangeDue(
        bookedDowngrade,
        new Date(periodEnd.getTime() - 60_000)
      )
    ).toBe(true);
    expect(
      isPendingChangeDue(bookedDowngrade, new Date(periodEnd.getTime() + day))
    ).toBe(true);
  });

  it('not due for an earlier period', () => {
    expect(
      isPendingChangeDue(
        bookedDowngrade,
        new Date(periodEnd.getTime() - RENEWAL_SKEW_MS - day)
      )
    ).toBe(false);
  });

  it('ignores Creem resubscribe bookings and providers that open a new subscription', () => {
    expect(
      isPendingChangeDue(
        {
          ...bookedDowngrade,
          pendingChangeType: PendingChangeType.RESUBSCRIBE,
        },
        periodEnd
      )
    ).toBe(false);
    expect(
      isPendingChangeDue(
        { ...bookedDowngrade, paymentProvider: 'waffo' },
        periodEnd
      )
    ).toBe(false);
  });
});

describe('resolveRenewalProductId (webhook order independent)', () => {
  it('payment webhook first, provider does not report the plan → booked downgrade applies', () => {
    expect(
      resolveRenewalProductId({
        sub: bookedDowngrade,
        reportedCatalogId: null,
        periodStart: periodEnd,
      })
    ).toEqual({ productId: 'pro_monthly', changed: true, clearPending: true });
  });

  it('payment webhook first, provider reports the new plan → applies', () => {
    expect(
      resolveRenewalProductId({
        sub: bookedDowngrade,
        reportedCatalogId: 'pro_monthly',
        periodStart: periodEnd,
      })
    ).toEqual({ productId: 'pro_monthly', changed: true, clearPending: true });
  });

  it('subscription.updated already applied it → no second change', () => {
    expect(
      resolveRenewalProductId({
        sub: {
          ...bookedDowngrade,
          productId: 'pro_monthly',
          pendingProductId: null,
          pendingChangeType: null,
          pendingEffectiveAt: null,
        },
        reportedCatalogId: 'pro_monthly',
        periodStart: periodEnd,
      })
    ).toEqual({
      productId: 'pro_monthly',
      changed: false,
      clearPending: false,
    });
  });

  it('provider still bills the old plan → old plan wins', () => {
    const r = resolveRenewalProductId({
      sub: bookedDowngrade,
      reportedCatalogId: 'ultra_monthly',
      periodStart: periodEnd,
    });
    expect(r.productId).toBe('ultra_monthly');
    expect(r.changed).toBe(false);
  });

  it('renewal of an earlier period keeps the current plan and the booking', () => {
    expect(
      resolveRenewalProductId({
        sub: bookedDowngrade,
        reportedCatalogId: null,
        periodStart: new Date(periodEnd.getTime() - 30 * day),
      })
    ).toEqual({
      productId: 'ultra_monthly',
      changed: false,
      clearPending: false,
    });
  });
});

describe('replacedSubscriptionAction (cancelReplacedSubscriptions tier check)', () => {
  it('higher or same-tier new plan replaces the old one now', () => {
    expect(replacedSubscriptionAction('ultra_monthly', 'pro_monthly')).toBe(
      'cancel_now'
    );
    expect(replacedSubscriptionAction('pro_yearly', 'pro_monthly')).toBe(
      'cancel_now'
    );
  });

  it('lower new plan (stale checkout paid late) does not cut the higher plan short', () => {
    expect(replacedSubscriptionAction('pro_monthly', 'ultra_monthly')).toBe(
      'cancel_at_period_end'
    );
    expect(replacedSubscriptionAction('pro_monthly', 'pro_yearly')).toBe(
      'cancel_at_period_end'
    );
  });

  it('unknown products fall back to replace now', () => {
    expect(replacedSubscriptionAction('nope', 'pro_monthly')).toBe(
      'cancel_now'
    );
    expect(replacedSubscriptionAction('pro_monthly', null)).toBe('cancel_now');
  });
});

describe('isPendingCancelExpired', () => {
  const now = Date.parse('2026-11-11T00:00:00Z');
  it('true only for PENDING_CANCEL past canceledEndAt', () => {
    expect(
      isPendingCancelExpired(
        { status: 'pending_cancel', canceledEndAt: periodEnd },
        now
      )
    ).toBe(true);
    expect(
      isPendingCancelExpired(
        { status: 'pending_cancel', canceledEndAt: new Date(now + day) },
        now
      )
    ).toBe(false);
    expect(
      isPendingCancelExpired(
        { status: 'active', canceledEndAt: periodEnd },
        now
      )
    ).toBe(false);
    expect(
      isPendingCancelExpired(
        { status: 'pending_cancel', canceledEndAt: null },
        now
      )
    ).toBe(false);
  });

  it('same-second canceledEndAt still ending for yearly (Waffo null period)', () => {
    const start = new Date('2026-10-19T16:10:59.122Z');
    expect(
      isPendingCancelExpired(
        {
          status: 'pending_cancel',
          canceledEndAt: start,
          currentPeriodStart: start,
          currentPeriodEnd: start,
          interval: 'year',
        },
        start.getTime() + 60_000
      )
    ).toBe(false);
  });
});

describe('planChangeSupport', () => {
  it('matches the provider decisions', () => {
    expect(planChangeSupport('stripe')).toEqual({
      immediate: 'native',
      periodEnd: 'native',
      undo: true,
    });
    expect(planChangeSupport('dodo').undo).toBe(true);
    expect(planChangeSupport('waffo')).toEqual({
      immediate: 'confirm',
      periodEnd: 'confirm',
      undo: false,
    });
    expect(planChangeSupport('creem').periodEnd).toBe(
      'cancel_then_resubscribe'
    );
    expect(planChangeSupport('paypal').periodEnd).toBe('unsupported');
    expect(planChangeSupport(null).immediate).toBe('checkout');
  });
});

describe('planCardAction', () => {
  it('routes subscribed users to the change flow', () => {
    expect(planCardAction('downgrade', true)).toBe('change');
    expect(planCardAction('upgrade', true)).toBe('change');
    expect(planCardAction('switch', true)).toBe('change');
    expect(planCardAction('subscribe', true)).toBe('checkout');
    expect(planCardAction('upgrade', false)).toBe('checkout');
    expect(planCardAction('buy', true)).toBe('checkout');
    expect(planCardAction('current', true)).toBe('none');
  });
});

describe('planFieldsFor', () => {
  it('copies the catalog plan', () => {
    expect(planFieldsFor('pro_monthly')).toMatchObject({
      productId: 'pro_monthly',
      creditsAmount: 3600,
      interval: 'month',
    });
    expect(planFieldsFor('nope')).toBeNull();
  });
});

describe('isReplacedByPlanChange / shouldPreservePlanChangeCancel', () => {
  it('treats canceled and plan_change rows as replaced for renewals', () => {
    expect(isReplacedByPlanChange({ status: 'canceled' })).toBe(true);
    expect(
      isReplacedByPlanChange({
        status: 'pending_cancel',
        canceledReasonType: 'plan_change',
      })
    ).toBe(true);
    expect(
      isReplacedByPlanChange({
        status: 'pending_cancel',
        canceledReasonType: 'user_request',
      })
    ).toBe(false);
    expect(isReplacedByPlanChange({ status: 'active' })).toBe(false);
  });

  it('keeps local plan_change cancel when the provider is still live', () => {
    expect(
      shouldPreservePlanChangeCancel(
        { status: 'canceled', canceledReasonType: 'plan_change' },
        'active'
      )
    ).toBe(true);
    expect(
      shouldPreservePlanChangeCancel(
        { status: 'pending_cancel', canceledReasonType: 'plan_change' },
        'trialing'
      )
    ).toBe(true);
    expect(
      shouldPreservePlanChangeCancel(
        { status: 'canceled', canceledReasonType: 'plan_change' },
        'canceled'
      )
    ).toBe(false);
    expect(
      shouldPreservePlanChangeCancel(
        { status: 'pending_cancel', canceledReasonType: 'user_request' },
        'active'
      )
    ).toBe(false);
  });
});

describe('Waffo hosted confirmation', () => {
  const now = Date.parse('2026-10-11T00:00:00Z');
  const sub = {
    subscriptionNo: 'SUB-W',
    paymentProvider: 'waffo',
    status: 'active',
    productId: 'pro_monthly',
    pendingProductId: null,
  };
  const mk = (
    id: string,
    o: {
      status?: string;
      ageMs?: number;
      productId?: string;
      from?: string;
      timing?: 'immediate' | 'period_end';
      superseded?: boolean;
    } = {}
  ) => ({
    id,
    orderNo: `ORD-${id}`,
    productId: o.productId ?? 'lite_monthly',
    status: o.status ?? 'created',
    createdAt: new Date(now - (o.ageMs ?? 60_000)),
    checkoutInfo: JSON.stringify({
      planChange: {
        fromSubscriptionNo: o.from ?? 'SUB-W',
        timing: o.timing ?? 'period_end',
        ...(o.superseded ? { superseded: true } : {}),
      },
    }),
  });

  it('awaiting = latest live created order of this subscription', () => {
    const orders = [
      mk('a', { ageMs: 120_000, productId: 'lite_yearly' }),
      mk('b', { ageMs: 30_000 }),
      mk('c', { ageMs: 10_000, from: 'SUB-OTHER' }),
      mk('d', { ageMs: 5_000, status: 'canceled', superseded: true }),
    ];
    expect(pickAwaitingWaffoPlanChange(orders, sub, now)?.id).toBe('b');
  });

  it('awaiting ignores sessions older than the TTL', () => {
    expect(
      pickAwaitingWaffoPlanChange(
        [mk('old', { ageMs: WAFFO_CONFIRM_TTL_MS + 1 })],
        sub,
        now
      )
    ).toBeNull();
  });

  it('no awaiting state once confirmed (booking / PENDING_CANCEL) or for other providers', () => {
    const orders = [mk('a')];
    expect(
      pickAwaitingWaffoPlanChange(
        orders,
        { ...sub, pendingProductId: 'lite_monthly' },
        now
      )
    ).toBeNull();
    expect(
      pickAwaitingWaffoPlanChange(
        orders,
        { ...sub, status: 'pending_cancel' },
        now
      )
    ).toBeNull();
    expect(
      pickAwaitingWaffoPlanChange(
        orders,
        { ...sub, paymentProvider: 'stripe' },
        now
      )
    ).toBeNull();
  });

  it('confirmation picks the live period-end order, else the latest superseded one', () => {
    expect(
      pickConfirmedWaffoPlanChange(
        [
          mk('old', { status: 'canceled', superseded: true, ageMs: 50_000 }),
          mk('live', { ageMs: 40_000 }),
          mk('up', { ageMs: 1_000, timing: 'immediate' }),
        ],
        'SUB-W',
        now
      )?.id
    ).toBe('live');
    expect(
      pickConfirmedWaffoPlanChange(
        [
          mk('s1', { status: 'canceled', superseded: true, ageMs: 50_000 }),
          mk('s2', { status: 'canceled', superseded: true, ageMs: 20_000 }),
          mk('plain-canceled', { status: 'canceled', ageMs: 1_000 }),
        ],
        'SUB-W',
        now
      )?.id
    ).toBe('s2');
    expect(
      pickConfirmedWaffoPlanChange(
        [mk('stale', { ageMs: WAFFO_CONFIRM_TTL_MS + 1 })],
        'SUB-W',
        now
      )
    ).toBeNull();
  });

  it('a Waffo booking without PENDING_CANCEL was never confirmed', () => {
    const booked = {
      ...sub,
      pendingProductId: 'lite_monthly',
      pendingChangeType: PendingChangeType.DOWNGRADE,
    };
    expect(isUnconfirmedWaffoBooking(booked)).toBe(true);
    expect(
      isUnconfirmedWaffoBooking({ ...booked, status: 'pending_cancel' })
    ).toBe(false);
    expect(
      isUnconfirmedWaffoBooking({ ...booked, paymentProvider: 'dodo' })
    ).toBe(false);
  });
});

describe('Waffo confirmed booking vs legacy booking', () => {
  const base = {
    paymentProvider: 'waffo',
    pendingChangeType: 'downgrade',
    pendingProductId: 'lite_monthly',
    status: 'active',
  };
  it('a booking with Waffo’s new order id is confirmed', () => {
    expect(
      isUnconfirmedWaffoBooking({ ...base, providerScheduleId: 'ORD_abc123' })
    ).toBe(false);
    expect(
      isUnconfirmedWaffoBooking({ ...base, providerScheduleId: 'ORDabc123' })
    ).toBe(true);
    expect(isWaffoOrderId('ORD_5dXBtmF2HLlHfbPNm0Wcnz')).toBe(true);
    expect(isWaffoOrderId('ORDu2nww0mv34h3hu')).toBe(false);
  });

  it('a confirmed attempt is no longer awaiting; candidates skip failed', () => {
    const now = Date.now();
    const mk = (
      id: string,
      status: string,
      extra: Record<string, unknown> = {}
    ) => ({
      id,
      orderNo: id,
      status,
      createdAt: new Date(now - 1000),
      checkoutInfo: JSON.stringify({
        planChange: { fromSubscriptionNo: 'S', timing: 'period_end', ...extra },
      }),
    });
    const sub = {
      subscriptionNo: 'S',
      paymentProvider: 'waffo',
      status: 'active',
    };
    expect(
      pickAwaitingWaffoPlanChange(
        [mk('a', 'created', { confirmedOrderId: 'ORD_x' })],
        sub,
        now
      )
    ).toBeNull();
    expect(
      waffoPlanChangeCandidates(
        [
          mk('a', 'created'),
          mk('b', 'canceled', { superseded: true }),
          mk('c', 'canceled', { failed: true }),
          mk('d', 'canceled'),
        ],
        'S',
        3,
        now
      ).map((o) => o.id)
    ).toEqual(['a', 'b']);
  });
});

describe('waffoChangeMustWaitForPeriodEnd', () => {
  const pro = getPricingProduct('pro_monthly')!;
  it('books a cheaper higher-tier plan (Lite yearly → Pro monthly) at period end', () => {
    expect(
      waffoChangeMustWaitForPeriodEnd({ amount: 10680, currency: 'USD' }, pro)
    ).toBe(true);
  });
  it('keeps immediate when the new plan charges more', () => {
    expect(
      waffoChangeMustWaitForPeriodEnd({ amount: 990, currency: 'USD' }, pro)
    ).toBe(false);
  });
  it('treats same price as period end', () => {
    expect(
      waffoChangeMustWaitForPeriodEnd(
        { amount: pro.priceInCents, currency: 'usd' },
        pro
      )
    ).toBe(true);
  });
  it('does not guess without a comparable amount', () => {
    expect(
      waffoChangeMustWaitForPeriodEnd({ amount: null, currency: 'USD' }, pro)
    ).toBe(false);
    expect(
      waffoChangeMustWaitForPeriodEnd({ amount: 10680, currency: 'EUR' }, pro)
    ).toBe(false);
  });
});

describe('replacedSubscriptionAction follows the intent matrix', () => {
  it('a newer higher monthly plan does not end a paid lower yearly plan early', () => {
    expect(replacedSubscriptionAction('pro_monthly', 'lite_yearly')).toBe(
      'cancel_at_period_end'
    );
  });
  it('a newer lower yearly plan keeps the higher monthly plan to period end', () => {
    expect(replacedSubscriptionAction('lite_yearly', 'pro_monthly')).toBe(
      'cancel_at_period_end'
    );
  });
  it('real upgrades still replace now', () => {
    expect(replacedSubscriptionAction('pro_yearly', 'lite_yearly')).toBe(
      'cancel_now'
    );
    expect(replacedSubscriptionAction('pro_yearly', 'pro_monthly')).toBe(
      'cancel_now'
    );
  });
});

describe('isStaleProcessingUpgrade', () => {
  const now = Date.parse('2026-10-19T06:00:00Z');
  const upgrade = (extra: Record<string, unknown>) => ({
    paymentProvider: 'stripe',
    pendingProductId: 'pro_monthly',
    pendingChangeType: 'upgrade',
    ...extra,
  });

  it('Stripe/Dodo upgrade past its deadline is stale', () => {
    for (const paymentProvider of ['stripe', 'dodo']) {
      expect(
        isStaleProcessingUpgrade(
          upgrade({ paymentProvider, pendingEffectiveAt: new Date(now - 1) }),
          now
        )
      ).toBe(true);
    }
  });

  it('within the deadline it is not', () => {
    expect(
      isStaleProcessingUpgrade(
        upgrade({ pendingEffectiveAt: new Date(now + 60_000) }),
        now
      )
    ).toBe(false);
  });

  it('booking without a deadline: last update + TTL', () => {
    const at = (ms: number) =>
      isStaleProcessingUpgrade(
        upgrade({ pendingEffectiveAt: null, updatedAt: new Date(now - ms) }),
        now
      );
    expect(at(PROCESSING_UPGRADE_TTL_MS + 1)).toBe(true);
    expect(at(PROCESSING_UPGRADE_TTL_MS - 60_000)).toBe(false);
  });

  it('Creem honors its booking deadline (now + 24h)', () => {
    const at = (ms: number) =>
      isStaleProcessingUpgrade(
        upgrade({
          paymentProvider: 'creem',
          pendingEffectiveAt: new Date(now + ms),
          updatedAt: new Date(now - PROCESSING_UPGRADE_TTL_MS * 2),
        }),
        now
      );
    expect(at(-1)).toBe(true);
    expect(at(60_000)).toBe(false);
  });

  it('Waffo: booked + 24h, whatever pendingEffectiveAt says', () => {
    const at = (bookedAgo: number, effective: Date | null) =>
      isStaleProcessingUpgrade(
        upgrade({
          paymentProvider: 'waffo',
          updatedAt: new Date(now - bookedAgo),
          pendingEffectiveAt: effective,
        }),
        now
      );
    // effectiveDate in the past but booked an hour ago: still processing
    expect(at(60 * 60_000, new Date(now - PROCESSING_UPGRADE_TTL_MS))).toBe(
      false
    );
    // effectiveDate far ahead but unknown for 24h+: stale
    expect(
      at(PROCESSING_UPGRADE_TTL_MS + 1, new Date(now + 30 * 86_400_000))
    ).toBe(true);
  });

  it('downgrades never time out here', () => {
    const past = new Date(now - PROCESSING_UPGRADE_TTL_MS * 2);
    expect(
      isStaleProcessingUpgrade(
        upgrade({
          pendingChangeType: 'downgrade',
          pendingEffectiveAt: past,
          updatedAt: past,
        }),
        now
      )
    ).toBe(false);
  });
});

describe('processing upgrade recheck', () => {
  const now = Date.parse('2026-10-19T06:00:00Z');
  const sub = (extra: Record<string, unknown>) => ({
    paymentProvider: 'waffo',
    pendingProductId: 'pro_monthly',
    pendingChangeType: 'upgrade',
    updatedAt: new Date(now - PROCESSING_UPGRADE_RECHECK_MS - 1),
    ...extra,
  });

  it('since = booking time (updatedAt), upgrades only', () => {
    expect(processingUpgradeSince(sub({}))).toBe(
      now - PROCESSING_UPGRADE_RECHECK_MS - 1
    );
    expect(
      processingUpgradeSince(sub({ pendingChangeType: 'downgrade' }))
    ).toBe(null);
  });

  it('overdue after 30 minutes, not before', () => {
    expect(isProcessingUpgradeOverdue(sub({}), now)).toBe(true);
    expect(
      isProcessingUpgradeOverdue(
        sub({ updatedAt: new Date(now - 10 * 60_000) }),
        now
      )
    ).toBe(false);
  });

  it('not overdue once stale (cancel no longer blocked)', () => {
    expect(
      isProcessingUpgradeOverdue(
        sub({ updatedAt: new Date(now - PROCESSING_UPGRADE_TTL_MS - 1) }),
        now
      )
    ).toBe(false);
  });

  it('queries Waffo/Creem/Dodo/Stripe, not others; force skips the 30 minute wait', () => {
    expect(shouldQueryProcessingUpgrade(sub({}), { now })).toBe(true);
    for (const paymentProvider of ['creem', 'dodo', 'stripe']) {
      expect(
        shouldQueryProcessingUpgrade(sub({ paymentProvider }), { now })
      ).toBe(true);
    }
    expect(
      shouldQueryProcessingUpgrade(sub({ paymentProvider: 'paypal' }), {
        now,
        force: true,
      })
    ).toBe(false);
    const fresh = sub({ updatedAt: new Date(now - 60_000) });
    expect(shouldQueryProcessingUpgrade(fresh, { now })).toBe(false);
    expect(shouldQueryProcessingUpgrade(fresh, { now, force: true })).toBe(
      true
    );
    expect(
      shouldQueryProcessingUpgrade(sub({ pendingChangeType: 'downgrade' }), {
        now,
        force: true,
      })
    ).toBe(false);
  });
});

describe('shouldKeepUserCancel', () => {
  const canceled = {
    status: 'pending_cancel',
    canceledReasonType: 'user_request',
  };
  it('keeps a billing cancel against a stale live Waffo update, but a portal resume clears it', () => {
    expect(shouldKeepUserCancel(canceled, 'waffo', 'active')).toBe(true);
    expect(shouldKeepUserCancel(canceled, 'waffo', 'pending_cancel')).toBe(
      true
    );
    // subscription.uncanceled (resumed in the Waffo portal)
    expect(
      shouldKeepUserCancel(canceled, 'waffo', 'active', { resumed: true })
    ).toBe(false);
  });
  it('lets Stripe/Dodo/Creem resume a canceled subscription', () => {
    expect(shouldKeepUserCancel(canceled, 'stripe', 'active')).toBe(false);
    expect(shouldKeepUserCancel(canceled, 'dodo', 'paused')).toBe(false);
    expect(shouldKeepUserCancel(canceled, 'stripe', 'pending_cancel')).toBe(
      true
    );
  });
  it('ignores rows not canceled from billing', () => {
    expect(shouldKeepUserCancel({ status: 'active' }, 'waffo', 'active')).toBe(
      false
    );
  });
});

describe('isUpgradeInProgress', () => {
  const now = Date.parse('2026-10-19T12:00:00Z');
  const hour = 60 * 60 * 1000;
  const upgrade = {
    pendingChangeType: PendingChangeType.UPGRADE,
    pendingProductId: 'pro_monthly',
  };
  it('blocks cancel while a Stripe/Dodo upgrade waits on payment', () => {
    for (const paymentProvider of ['stripe', 'dodo']) {
      expect(
        isUpgradeInProgress(
          { ...upgrade, paymentProvider, pendingEffectiveAt: now + hour },
          now
        )
      ).toBe(true);
    }
  });
  it('stops blocking once the processing deadline has passed', () => {
    expect(
      isUpgradeInProgress(
        { ...upgrade, paymentProvider: 'stripe', pendingEffectiveAt: now - 1 },
        now
      )
    ).toBe(false);
    expect(
      isUpgradeInProgress(
        { ...upgrade, paymentProvider: 'dodo', updatedAt: now - 25 * hour },
        now
      )
    ).toBe(false);
  });
  it('blocks cancel while a confirmed Waffo upgrade is not active yet', () => {
    expect(
      isUpgradeInProgress(
        {
          ...upgrade,
          paymentProvider: 'waffo',
          pendingEffectiveAt: now - 25 * hour,
        },
        now
      )
    ).toBe(true);
  });
  it('leaves period-end downgrades and plain subscriptions cancelable', () => {
    expect(
      isUpgradeInProgress(
        {
          pendingChangeType: PendingChangeType.DOWNGRADE,
          pendingProductId: 'basic_monthly',
          paymentProvider: 'stripe',
          pendingEffectiveAt: now + hour,
        },
        now
      )
    ).toBe(false);
    expect(isUpgradeInProgress({ paymentProvider: 'stripe' }, now)).toBe(false);
  });
});

describe('canceling subscription blocks other plans', () => {
  const now = Date.parse('2026-10-19T06:00:00Z');
  const ending = (productId: string, extra: Record<string, unknown> = {}) => ({
    productId,
    status: 'pending_cancel',
    canceledEndAt: new Date(now + 30 * 86_400_000),
    ...extra,
  });
  const blocked = (sub: unknown, target: string) =>
    isPlanPurchaseBlockedByEnding(getPricingProduct(target)!, sub as any, now);

  it('ending = canceled at period end and not over yet', () => {
    expect(isSubscriptionEnding(ending('ultra_monthly'), now)).toBe(true);
    expect(
      isSubscriptionEnding(
        ending('ultra_monthly', {
          canceledEndAt: new Date(now - 1),
          currentPeriodEnd: new Date(now - 1),
        }),
        now
      )
    ).toBe(false);
    expect(
      isSubscriptionEnding(ending('ultra_monthly', { status: 'active' }), now)
    ).toBe(false);
    expect(isSubscriptionEnding(null, now)).toBe(false);
  });

  it('upgrade, interval switch and downgrade are blocked', () => {
    const sub = ending('pro_monthly');
    expect(blocked(sub, 'ultra_monthly')).toBe(true); // upgrade
    expect(blocked(sub, 'pro_yearly')).toBe(true); // switch
    expect(blocked(sub, 'lite_monthly')).toBe(true); // downgrade
    expect(blocked(ending('ultra_monthly'), 'ultra_yearly')).toBe(true);
    expect(blocked(ending('pro_yearly'), 'ultra_monthly')).toBe(true);
  });

  it('credit packs and the current plan are not blocked here', () => {
    const sub = ending('ultra_monthly');
    expect(blocked(sub, 'credits_pro')).toBe(false);
    expect(blocked(sub, 'ultra_monthly')).toBe(false);
  });

  it('after the period ends (or when active) nothing is blocked', () => {
    expect(
      blocked(
        ending('ultra_monthly', {
          canceledEndAt: new Date(now - 1),
          currentPeriodEnd: new Date(now - 1),
        }),
        'ultra_yearly'
      )
    ).toBe(false);
    expect(
      blocked(ending('pro_monthly', { status: 'active' }), 'ultra_monthly')
    ).toBe(false);
    expect(blocked(null, 'ultra_yearly')).toBe(false);
  });
});

describe('resume mode', () => {
  const now = Date.parse('2026-10-19T00:00:00Z');
  const ending = (
    paymentProvider: string,
    extra: Record<string, any> = {}
  ) => ({
    status: 'pending_cancel',
    paymentProvider,
    canceledReasonType: 'user_request',
    canceledEndAt: new Date(now + 86_400_000),
    ...extra,
  });
  it('Stripe / Dodo / Creem / Waffo resume in-app', () => {
    for (const p of ['stripe', 'dodo', 'creem', 'waffo']) {
      expect(resumeMode(ending(p), now)).toBe('in_app');
      expect(canResumeInPortal(ending(p), now)).toBe(false);
      expect(canResumeSubscription(ending(p), now)).toBe(true);
    }
    expect(hasCustomerPortal('waffo')).toBe(true);
    expect(resumeMode(ending('paypal'), now)).toBeNull();
  });
  it('not when active, already ended, ended by a plan change / refund, or none', () => {
    expect(resumeMode(ending('stripe', { status: 'active' }), now)).toBeNull();
    expect(
      resumeMode(ending('stripe', { canceledEndAt: new Date(now - 1000) }), now)
    ).toBeNull();
    expect(
      resumeMode(ending('dodo', { canceledReasonType: 'plan_change' }), now)
    ).toBeNull();
    expect(
      resumeMode(ending('dodo', { canceledReasonType: 'refund' }), now)
    ).toBeNull();
    expect(resumeMode(null, now)).toBeNull();
  });
});
