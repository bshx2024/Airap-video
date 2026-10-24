import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PaymentStatus } from '@/core/payment/types';
import { getPricingProduct } from '@/config/pricing';

import {
  isBillingCycleReset,
  proratedCycleResetCredits,
  proratedSameCycleCredits,
} from './plan-change';

/**
 * Plan change credits: a billing-cycle restart grants the NEW plan's credits
 * prorated like the charge (once), a same-cycle change only the difference, and a
 * renewal for a period already covered by the restart grant grants nothing.
 */
const state = vi.hoisted(() => ({
  sub: {} as Record<string, any>,
  grants: [] as Record<string, any>[],
  renewGrants: [] as Record<string, any>[],
  orders: [] as Record<string, any>[],
  creditUpdates: [] as Record<string, any>[],
  creditRows: [] as Record<string, any>[],
  configs: {} as Record<string, string>,
}));

vi.mock('@/core/db', async () => {
  const schema = await import('@/config/db/schema');
  const { SQLiteSyncDialect } = await import('drizzle-orm/sqlite-core');
  const dialect = new SQLiteSyncDialect();
  // Credit rows matching a query: a row matches when its orderNo is one of
  // the query's bound params (or the row has no orderNo filter key).
  const creditRowsFor = (cond: any) => {
    let params: unknown[] = [];
    try {
      params = cond ? dialect.sqlToQuery(cond).params : [];
    } catch {
      params = [];
    }
    return state.creditRows.filter((row) => {
      if (!row.orderNo) return true;
      return params.some((param) => {
        if (typeof param !== 'string') return false;
        if (param.endsWith('%'))
          return row.orderNo.startsWith(param.slice(0, -1));
        return param === row.orderNo;
      });
    });
  };
  const fake: any = {
    transaction: async (fn: any) => fn(fake),
    select: () => {
      let table: any;
      let cond: any;
      const q: any = {
        from: (t: any) => {
          table = t;
          return q;
        },
        where: (c: any) => {
          cond = c;
          return q;
        },
        limit: () => q,
        for: () => q,
        then: (resolve: any, reject: any) =>
          Promise.resolve(
            table === schema.subscription
              ? [{ ...state.sub }]
              : table === schema.credit
                ? creditRowsFor(cond)
                : []
          ).then(resolve, reject),
      };
      return q;
    },
    update: (table: any) => ({
      set: (values: Record<string, any>) => ({
        where: async () => {
          if (table === schema.subscription) Object.assign(state.sub, values);
          if (table === schema.credit) state.creditUpdates.push(values);
          return { rowsAffected: 1 };
        },
      }),
    }),
    insert: (table: any) => ({
      values: (values: Record<string, any>) => {
        const run = async () => {
          if (table === schema.credit) state.renewGrants.push(values);
          else if (table === schema.order) state.orders.push(values);
          return { rowsAffected: 1 };
        };
        return {
          onConflictDoNothing: run,
          then: (resolve: any, reject: any) => run().then(resolve, reject),
        };
      },
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
  updateBySubscriptionNo: async (_no: string, values: any) =>
    Object.assign(state.sub, values),
}));

vi.mock('./order-credits', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  grantOrderCreditsOnce: async (_tx: any, params: any) => {
    if (state.grants.some((g) => g.orderNo === params.orderNo)) return false;
    state.grants.push(params);
    return true;
  },
}));

const {
  applySubscriptionPlan,
  cycleResetGrantOrderNo,
  handleSubscriptionRenewal,
} = await import('./service');

const PRO = getPricingProduct('pro_monthly')!.credits!;
const ULTRA = getPricingProduct('ultra_monthly')!.credits!;

/** Renewal grants, whichever way this repo's renewal handler writes them. */
const renewalGrants = () => [
  ...state.renewGrants,
  ...state.grants.filter((g) => g.transactionScene === 'renewal'),
];

const oldStart = new Date('2026-10-10T08:00:00Z');
const oldEnd = new Date('2026-11-10T08:00:00Z');
const resetStart = new Date('2026-10-19T02:00:00Z');
const resetEnd = new Date('2026-11-19T02:00:00Z');

beforeEach(() => {
  state.sub = {
    subscriptionNo: 'SUB-1',
    subscriptionId: 'sub_dodo_1',
    userId: 'u1',
    userEmail: 'a@b.c',
    status: 'active',
    paymentProvider: 'dodo',
    productId: 'pro_monthly',
    amount: 1999,
    currency: 'usd',
    creditsAmount: PRO,
    creditsValidDays: 30,
    currentPeriodStart: oldStart,
    currentPeriodEnd: oldEnd,
    pendingProductId: null,
  };
  state.grants = [];
  state.renewGrants = [];
  state.orders = [];
  state.creditUpdates = [];
  state.creditRows = [];
  state.configs = {
    dodo_product_ids_mapping: JSON.stringify({
      pro_monthly: 'pdt_pro',
      ultra_monthly: 'pdt_ultra',
    }),
  };
});

describe('isBillingCycleReset', () => {
  it('new period starting mid old period is a reset', () => {
    expect(
      isBillingCycleReset({
        previousPeriodStart: oldStart,
        previousPeriodEnd: oldEnd,
        periodStart: resetStart,
      })
    ).toBe(true);
  });
  it('natural renewal (starts at old end) is not', () => {
    expect(
      isBillingCycleReset({
        previousPeriodStart: oldStart,
        previousPeriodEnd: oldEnd,
        periodStart: new Date(oldEnd.getTime() + 60_000),
      })
    ).toBe(false);
  });
  it('unchanged period (same-cycle proration) is not', () => {
    expect(
      isBillingCycleReset({
        previousPeriodStart: oldStart,
        previousPeriodEnd: oldEnd,
        periodStart: oldStart,
      })
    ).toBe(false);
  });
  it('missing dates are not', () => {
    expect(isBillingCycleReset({ periodStart: resetStart })).toBe(false);
    expect(
      isBillingCycleReset({ previousPeriodEnd: oldEnd, periodStart: null })
    ).toBe(false);
  });
});

describe('proratedCycleResetCredits', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const start = new Date('2026-10-01T00:00:00Z');
  const end = new Date(start.getTime() + 30 * DAY);
  const at = (days: number) => new Date(start.getTime() + days * DAY);
  const prorate = (newCredits: number, oldCredits: number, day: number) =>
    proratedCycleResetCredits({
      newCredits,
      oldCredits,
      previousPeriodStart: start,
      previousPeriodEnd: end,
      periodStart: at(day),
    });

  it('Lite 450 → Pro 1000 on day 2 of 30: 1000 − 450 × 28/30 = 580', () => {
    expect(prorate(1000, 450, 2)).toBe(580);
  });
  it('right after subscribing: only the difference', () => {
    expect(prorate(1000, 450, 0)).toBe(550);
  });
  it('late in the cycle: almost the full new grant', () => {
    expect(prorate(1000, 450, 29)).toBe(985);
  });
  it('old grant outweighs the new one (downgrade): 0, never negative', () => {
    expect(prorate(450, 1000, 1)).toBe(0);
  });
  it('unknown old period start: the difference', () => {
    expect(
      proratedCycleResetCredits({
        newCredits: 1000,
        oldCredits: 450,
        previousPeriodEnd: end,
        periodStart: at(2),
      })
    ).toBe(550);
  });
});

describe('proratedSameCycleCredits', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const start = new Date('2026-10-01T00:00:00Z');
  const end = new Date(start.getTime() + 30 * DAY);
  const at = (days: number) => new Date(start.getTime() + days * DAY);
  const prorate = (day: number) =>
    proratedSameCycleCredits({
      newCredits: 1000,
      oldCredits: 450,
      periodStart: start,
      periodEnd: end,
      at: at(day),
    });

  it('Lite 450 → Pro 1000 on day 2 of 30: 550 × 28/30 = 513', () => {
    expect(prorate(2)).toBe(513);
  });
  it('day 29 of 30: 550 × 1/30 = 18', () => {
    expect(prorate(29)).toBe(18);
  });
  it('no higher grant (same or lower credits): 0', () => {
    expect(
      proratedSameCycleCredits({
        newCredits: 450,
        oldCredits: 1000,
        periodStart: start,
        periodEnd: end,
        at: at(2),
      })
    ).toBe(0);
  });
  it('unknown period start or stale period: the full difference', () => {
    expect(
      proratedSameCycleCredits({
        newCredits: 1000,
        oldCredits: 450,
        periodEnd: end,
        at: at(2),
      })
    ).toBe(550);
    expect(prorate(31)).toBe(550);
  });
});

describe('applySubscriptionPlan credits', () => {
  // Same-cycle grants are prorated from "now": pin it inside the old period.
  const changedAt = new Date('2026-10-19T02:00:00Z');
  const sameCycleShare =
    (oldEnd.getTime() - changedAt.getTime()) /
    (oldEnd.getTime() - oldStart.getTime());
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(changedAt);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const unusedShare =
    (oldEnd.getTime() - resetStart.getTime()) /
    (oldEnd.getTime() - oldStart.getTime());

  it('cycle restart: prorated new-plan credits once, existing balance kept', async () => {
    await applySubscriptionPlan({
      subscriptionNo: 'SUB-1',
      productId: 'ultra_monthly',
      currentPeriodStart: resetStart,
      currentPeriodEnd: resetEnd,
      previousPeriodStart: oldStart,
      previousPeriodEnd: oldEnd,
    });
    expect(state.grants).toHaveLength(1);
    expect(state.grants[0]).toMatchObject({
      orderNo: cycleResetGrantOrderNo('SUB-1', resetStart),
      credits: Math.round(ULTRA - PRO * unusedShare),
      expiresAt: resetEnd,
    });
    expect(state.sub).toMatchObject({
      productId: 'ultra_monthly',
      currentPeriodStart: resetStart,
      currentPeriodEnd: resetEnd,
    });
    // Only the expiry cap; remaining credits are never reduced.
    expect(state.creditUpdates).toEqual([{ expiresAt: resetEnd }]);

    // Webhook replay / sync+webhook: plan already applied → nothing more.
    await applySubscriptionPlan({
      subscriptionNo: 'SUB-1',
      productId: 'ultra_monthly',
      currentPeriodStart: resetStart,
      currentPeriodEnd: resetEnd,
      previousPeriodStart: oldStart,
      previousPeriodEnd: oldEnd,
    });
    expect(state.grants).toHaveLength(1);
  });

  it('same cycle (no reset): difference × time left, old credits untouched', async () => {
    await applySubscriptionPlan({
      subscriptionNo: 'SUB-1',
      productId: 'ultra_monthly',
      currentPeriodStart: oldStart,
      currentPeriodEnd: oldEnd,
      previousPeriodStart: oldStart,
      previousPeriodEnd: oldEnd,
    });
    expect(state.grants).toHaveLength(1);
    expect(state.grants[0].orderNo).toMatch(/^UPG/);
    expect(state.grants[0].credits).toBe(
      Math.round((ULTRA - PRO) * sameCycleShare)
    );
    expect(state.creditUpdates).toEqual([]);
  });

  it('no period reported: prorated over the stored period', async () => {
    await applySubscriptionPlan({
      subscriptionNo: 'SUB-1',
      productId: 'ultra_monthly',
    });
    expect(state.grants[0].credits).toBe(
      Math.round((ULTRA - PRO) * sameCycleShare)
    );
  });

  it('no period known at all: the full difference', async () => {
    state.sub.currentPeriodStart = null;
    state.sub.currentPeriodEnd = null;
    await applySubscriptionPlan({
      subscriptionNo: 'SUB-1',
      productId: 'ultra_monthly',
    });
    expect(state.grants[0].credits).toBe(ULTRA - PRO);
  });

  it('immediate downgrade that restarts the cycle: clamped to 0', async () => {
    state.sub.productId = 'ultra_monthly';
    state.sub.creditsAmount = ULTRA;
    await applySubscriptionPlan({
      subscriptionNo: 'SUB-1',
      productId: 'pro_monthly',
      currentPeriodStart: resetStart,
      currentPeriodEnd: resetEnd,
      previousPeriodStart: oldStart,
      previousPeriodEnd: oldEnd,
    });
    expect(state.sub.productId).toBe('pro_monthly');
    expect(state.grants.map((g) => g.credits)).toEqual([
      Math.max(0, Math.round(PRO - ULTRA * unusedShare)),
    ]);
  });

  it('booked period-end change landing at renewal: no reset grant', async () => {
    state.sub.productId = 'ultra_monthly';
    state.sub.pendingProductId = 'pro_monthly';
    await applySubscriptionPlan({
      subscriptionNo: 'SUB-1',
      productId: 'pro_monthly',
      currentPeriodStart: oldEnd,
      currentPeriodEnd: new Date('2026-12-10T08:00:00Z'),
      previousPeriodStart: oldStart,
      previousPeriodEnd: oldEnd,
    });
    expect(state.grants).toHaveLength(0);
  });

  it('booked processing upgrade + cycle restart: one new-cycle grant, old expiry capped, no renewal re-grant', async () => {
    // Stripe/Dodo upgrade still waiting on its payment: booked as an upgrade.
    Object.assign(state.sub, {
      pendingProductId: 'ultra_monthly',
      pendingChangeType: 'upgrade',
      pendingEffectiveAt: null,
    });
    await applySubscriptionPlan({
      subscriptionNo: 'SUB-1',
      productId: 'ultra_monthly',
      currentPeriodStart: resetStart,
      currentPeriodEnd: resetEnd,
      previousPeriodStart: oldStart,
      previousPeriodEnd: oldEnd,
    });
    expect(state.grants).toHaveLength(1);
    expect(state.grants[0]).toMatchObject({
      orderNo: cycleResetGrantOrderNo('SUB-1', resetStart),
      credits: Math.round(ULTRA - PRO * unusedShare),
      expiresAt: resetEnd,
    });
    expect(state.creditUpdates).toEqual([{ expiresAt: resetEnd }]);
    expect(state.sub).toMatchObject({
      productId: 'ultra_monthly',
      pendingProductId: null,
      pendingChangeType: null,
    });

    // The provider also reports the cycle-restart charge as a renewal.
    state.creditRows = [
      {
        id: 'reset-grant',
        orderNo: cycleResetGrantOrderNo('SUB-1', resetStart),
      },
    ];
    await handleSubscriptionRenewal(
      {
        subscriptionId: 'sub_dodo_1',
        paymentStatus: PaymentStatus.SUCCESS,
        paymentResult: {},
        paymentInfo: {
          transactionId: 'pay_change_1',
          paymentAmount: 3999,
          paymentCurrency: 'usd',
        },
        subscriptionInfo: {
          productId: 'pdt_ultra',
          currentPeriodStart: resetStart,
          currentPeriodEnd: resetEnd,
        },
      },
      'dodo'
    );
    expect([
      ...state.renewGrants,
      ...state.grants.filter((g) => g.transactionScene === 'renewal'),
    ]).toHaveLength(0);
    expect(state.grants).toHaveLength(1);
  });
});

describe('renewal after a cycle-restart grant', () => {
  function renewal() {
    return {
      subscriptionId: 'sub_dodo_1',
      paymentStatus: PaymentStatus.SUCCESS,
      paymentResult: {},
      paymentInfo: {
        transactionId: 'pay_change_1',
        paymentAmount: 3999,
        paymentCurrency: 'usd',
      },
      subscriptionInfo: {
        productId: 'pdt_ultra',
        currentPeriodStart: resetStart,
        currentPeriodEnd: resetEnd,
      },
    };
  }

  it('same period already granted by the plan change: no second grant', async () => {
    Object.assign(state.sub, {
      productId: 'ultra_monthly',
      creditsAmount: ULTRA,
      currentPeriodStart: resetStart,
      currentPeriodEnd: resetEnd,
    });
    state.creditRows = [
      {
        id: 'reset-grant',
        orderNo: cycleResetGrantOrderNo('SUB-1', resetStart),
      },
    ];
    await handleSubscriptionRenewal(renewal(), 'dodo');
    expect(renewalGrants()).toHaveLength(0);
    expect(state.orders).toHaveLength(1);
  });

  it('normal renewal still grants', async () => {
    Object.assign(state.sub, {
      productId: 'ultra_monthly',
      creditsAmount: ULTRA,
    });
    await handleSubscriptionRenewal(renewal(), 'dodo');
    expect(renewalGrants()).toHaveLength(1);
    expect(renewalGrants()[0].credits).toBe(ULTRA);
  });

  it('same-cycle upgrade payment does not grant a full period', async () => {
    await handleSubscriptionRenewal(
      {
        subscriptionId: 'sub_dodo_1',
        paymentStatus: PaymentStatus.SUCCESS,
        paymentResult: {},
        paymentInfo: {
          transactionId: 'pay_proration',
          paymentAmount: 500,
          paymentCurrency: 'usd',
        },
        subscriptionInfo: {
          productId: 'pdt_ultra',
          currentPeriodStart: oldStart,
          currentPeriodEnd: oldEnd,
        },
      },
      'dodo'
    );
    expect(renewalGrants()).toHaveLength(0);
    expect(state.orders).toHaveLength(0);
  });

  it('Creem paid after the upgrade grant does not grant a full period', async () => {
    Object.assign(state.sub, {
      productId: 'ultra_monthly',
      creditsAmount: ULTRA,
    });
    state.creditRows = [{ id: 'upg', orderNo: 'UPGabc' }];
    state.configs = {
      creem_product_ids_mapping: JSON.stringify({
        ultra_monthly: 'prod_ultra',
      }),
    };
    await handleSubscriptionRenewal(
      {
        subscriptionId: 'sub_dodo_1',
        paymentStatus: PaymentStatus.SUCCESS,
        paymentResult: {},
        paymentInfo: {
          transactionId: 'tran_proration',
          paymentAmount: 500,
          paymentCurrency: 'usd',
        },
        subscriptionInfo: {
          productId: 'prod_ultra',
          currentPeriodStart: oldStart,
          currentPeriodEnd: oldEnd,
        },
      },
      'creem'
    );
    expect(renewalGrants()).toHaveLength(0);
    expect(state.orders).toHaveLength(0);
  });
});
