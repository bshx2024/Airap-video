import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PaymentStatus } from '@/core/payment/types';

/**
 * handleSubscriptionRenewal with a booked end-of-period downgrade:
 * webhook order (subscription.updated before/after payment) and duplicate
 * deliveries. Fake DB: one subscription row, orders keyed by primary key.
 */
const state = vi.hoisted(() => ({
  sub: {} as Record<string, any>,
  orders: [] as Record<string, any>[],
  grants: [] as Record<string, any>[],
  configs: {} as Record<string, string>,
  syncState: 'pending' as string,
  syncCalls: [] as Record<string, any>[],
}));

// Waffo: a renewal covered by a booked period-end change asks Waffo first.
vi.mock('./processing-upgrade-sync', () => ({
  syncScheduledPlanChange: async (sub: any, opts: any) => {
    state.syncCalls.push({ subscriptionNo: sub.subscriptionNo, ...opts });
    if (state.syncState === 'failed') {
      Object.assign(state.sub, {
        pendingProductId: null,
        pendingEffectiveAt: null,
        pendingChangeType: null,
        providerScheduleId: null,
      });
    }
    if (state.syncState === 'applied') {
      Object.assign(state.sub, {
        status: 'pending_cancel',
        canceledReasonType: 'plan_change',
        pendingProductId: null,
        pendingEffectiveAt: null,
        pendingChangeType: null,
      });
    }
    return state.syncState === 'untraceable'
      ? { state: 'unavailable', detail: 'order_not_found' }
      : { state: state.syncState };
  },
}));

vi.mock('@/core/db', async () => {
  const schema = await import('@/config/db/schema');
  const fake: any = {
    transaction: async (fn: any) => fn(fake),
    select: () => {
      let table: any;
      const q: any = {
        from: (t: any) => {
          table = t;
          return q;
        },
        where: () => q,
        limit: () => q,
        // `.limit(1).for('update')` and plain `.limit(1)` both resolve rows.
        for: () => q,
        then: (resolve: any, reject: any) =>
          Promise.resolve(
            table === schema.subscription ? [{ ...state.sub }] : []
          ).then(resolve, reject),
      };
      return q;
    },
    update: (table: any) => ({
      set: (values: Record<string, any>) => ({
        where: async () => {
          if (table === schema.subscription) Object.assign(state.sub, values);
          return { rowsAffected: 1 };
        },
      }),
    }),
    insert: (table: any) => ({
      values: (values: Record<string, any>) => ({
        onConflictDoNothing: async () => {
          if (table !== schema.order) return { rowsAffected: 0 };
          if (state.orders.some((o) => o.id === values.id)) {
            return { rowsAffected: 0 };
          }
          state.orders.push(values);
          return { rowsAffected: 1 };
        },
      }),
    }),
  };
  return { db: () => fake };
});

vi.mock('@/modules/config/service', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  getAllConfigs: async () => state.configs,
}));

vi.mock('@/modules/subscriptions/service', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  findByProviderSubscriptionId: async () => ({ ...state.sub }),
}));

vi.mock('./order-credits', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  grantOrderCreditsOnce: async (_tx: any, params: any) => {
    state.grants.push(params);
    return true;
  },
}));

const { handleSubscriptionRenewal } = await import('./service');

const periodEnd = new Date('2026-11-10T08:00:00Z');
const nextEnd = new Date('2026-12-10T08:00:00Z');

function renewal(opts: { productId?: string; transactionId?: string } = {}) {
  return {
    subscriptionId: 'sub_dodo_1',
    paymentStatus: PaymentStatus.SUCCESS,
    paymentResult: {},
    paymentInfo: {
      transactionId: opts.transactionId ?? 'pay_1',
      paymentAmount: 1999,
      paymentCurrency: 'usd',
    },
    subscriptionInfo: {
      productId: opts.productId,
      currentPeriodStart: periodEnd,
      currentPeriodEnd: nextEnd,
    },
  };
}

beforeEach(() => {
  state.sub = {
    subscriptionNo: 'SUB-1',
    subscriptionId: 'sub_dodo_1',
    userId: 'u1',
    userEmail: 'a@b.c',
    status: 'active',
    paymentProvider: 'dodo',
    productId: 'ultra_monthly',
    planName: 'Ultra',
    productName: 'Ultra',
    amount: 3999,
    currency: 'usd',
    interval: 'month',
    creditsAmount: 7200,
    creditsValidDays: 30,
    currentPeriodStart: new Date('2026-10-10T08:00:00Z'),
    currentPeriodEnd: periodEnd,
    pendingProductId: 'pro_monthly',
    pendingEffectiveAt: periodEnd,
    pendingChangeType: 'downgrade',
    providerScheduleId: null,
  };
  state.orders = [];
  state.grants = [];
  state.syncState = 'pending';
  state.syncCalls = [];
  state.configs = {
    dodo_product_ids_mapping: JSON.stringify({
      pro_monthly: 'pdt_pro',
      ultra_monthly: 'pdt_ultra',
    }),
  };
});

describe('handleSubscriptionRenewal applies a booked downgrade', () => {
  it('payment webhook first (no plan reported): bills and grants the lower plan', async () => {
    await handleSubscriptionRenewal(renewal(), 'dodo');
    expect(state.orders).toHaveLength(1);
    expect(state.orders[0]).toMatchObject({
      productId: 'pro_monthly',
      creditsAmount: 3600,
    });
    expect(state.grants).toHaveLength(1);
    expect(state.grants[0].credits).toBe(3600);
    expect(state.sub).toMatchObject({
      productId: 'pro_monthly',
      creditsAmount: 3600,
      currentPeriodEnd: nextEnd,
      pendingProductId: null,
      pendingChangeType: null,
    });
  });

  it('provider reports the new plan: same result', async () => {
    await handleSubscriptionRenewal(renewal({ productId: 'pdt_pro' }), 'dodo');
    expect(state.orders[0].productId).toBe('pro_monthly');
    expect(state.grants[0].credits).toBe(3600);
    expect(state.sub.pendingProductId).toBeNull();
  });

  it('subscription.updated applied the plan first: renewal bills it, no double switch', async () => {
    Object.assign(state.sub, {
      productId: 'pro_monthly',
      creditsAmount: 3600,
      amount: 1999,
      pendingProductId: null,
      pendingEffectiveAt: null,
      pendingChangeType: null,
    });
    await handleSubscriptionRenewal(renewal({ productId: 'pdt_pro' }), 'dodo');
    expect(state.orders[0].productId).toBe('pro_monthly');
    expect(state.grants).toHaveLength(1);
    expect(state.grants[0].credits).toBe(3600);
  });

  it('duplicate delivery records one order and one grant', async () => {
    await handleSubscriptionRenewal(renewal(), 'dodo');
    await handleSubscriptionRenewal(renewal(), 'dodo');
    expect(state.orders).toHaveLength(1);
    expect(state.grants).toHaveLength(1);
    expect(state.sub.productId).toBe('pro_monthly');
  });

  it('provider still bills the old plan: keep it and drop the stale booking', async () => {
    await handleSubscriptionRenewal(
      renewal({ productId: 'pdt_ultra' }),
      'dodo'
    );
    expect(state.orders[0].productId).toBe('ultra_monthly');
    expect(state.grants[0].credits).toBe(7200);
    expect(state.sub.productId).toBe('ultra_monthly');
    expect(state.sub.pendingProductId).toBeNull();
  });

  it('earlier period renewal keeps the current plan and the booking', async () => {
    const early = renewal();
    early.subscriptionInfo.currentPeriodStart = new Date(
      '2026-10-10T08:00:00Z'
    );
    early.subscriptionInfo.currentPeriodEnd = periodEnd;
    await handleSubscriptionRenewal(early, 'dodo');
    expect(state.orders[0].productId).toBe('ultra_monthly');
    expect(state.sub.pendingProductId).toBe('pro_monthly');
  });

  it('skips credit grant when the sub was replaced (plan_change cancel)', async () => {
    Object.assign(state.sub, {
      status: 'canceled',
      canceledReasonType: 'plan_change',
      pendingProductId: null,
      pendingEffectiveAt: null,
      pendingChangeType: null,
    });
    await handleSubscriptionRenewal(renewal(), 'dodo');
    expect(state.orders).toHaveLength(0);
    expect(state.grants).toHaveLength(0);
  });

  it('skips credit grant for pending_cancel plan_change (provider cancel failed)', async () => {
    Object.assign(state.sub, {
      status: 'pending_cancel',
      canceledReasonType: 'plan_change',
      pendingProductId: null,
      pendingEffectiveAt: null,
      pendingChangeType: null,
    });
    await handleSubscriptionRenewal(renewal(), 'dodo');
    expect(state.orders).toHaveLength(0);
    expect(state.grants).toHaveLength(0);
  });
});

describe('Waffo renewal of a sub whose period-end change is due', () => {
  beforeEach(() => {
    Object.assign(state.sub, {
      paymentProvider: 'waffo',
      subscriptionId: 'ORD_pro',
      productId: 'pro_monthly',
      creditsAmount: 3600,
      pendingProductId: 'lite_monthly',
      pendingEffectiveAt: periodEnd,
      pendingChangeType: 'downgrade',
      providerScheduleId: 'ORD_lite',
    });
    state.configs = {};
  });

  it('change applied at Waffo → handled as the change, no old-plan grant', async () => {
    state.syncState = 'applied';
    await handleSubscriptionRenewal(renewal(), 'waffo');
    expect(state.syncCalls).toEqual([{ subscriptionNo: 'SUB-1', force: true }]);
    expect(state.orders).toHaveLength(0);
    expect(state.grants).toHaveLength(0);
  });

  it('Waffo has not switched yet → ignored, no old-plan grant', async () => {
    state.syncState = 'pending';
    await handleSubscriptionRenewal(renewal(), 'waffo');
    expect(state.orders).toHaveLength(0);
    expect(state.grants).toHaveLength(0);
    expect(state.sub.pendingProductId).toBe('lite_monthly');
  });

  it('Waffo unreachable → throws so the webhook is retried, no grant', async () => {
    state.syncState = 'unavailable';
    await expect(handleSubscriptionRenewal(renewal(), 'waffo')).rejects.toThrow(
      /scheduled plan change/
    );
    expect(state.grants).toHaveLength(0);
  });

  it('booking not traceable locally → ignored without a retry loop', async () => {
    state.syncState = 'untraceable';
    await handleSubscriptionRenewal(renewal(), 'waffo');
    expect(state.grants).toHaveLength(0);
  });

  it('change failed at Waffo → the old plan renews normally', async () => {
    state.syncState = 'failed';
    await handleSubscriptionRenewal(renewal(), 'waffo');
    expect(state.grants).toHaveLength(1);
    expect(state.grants[0].credits).toBe(3600);
  });

  it('an earlier period renewal is not affected', async () => {
    state.sub.pendingEffectiveAt = nextEnd;
    state.sub.currentPeriodEnd = nextEnd;
    await handleSubscriptionRenewal(renewal(), 'waffo');
    expect(state.syncCalls).toHaveLength(0);
    expect(state.grants).toHaveLength(1);
  });
});
