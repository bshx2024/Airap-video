import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PaymentStatus } from '@/core/payment/types';

/**
 * A Waffo period-end downgrade past its effective time without
 * `subscription.plan_changed`: billing reconciles through the real
 * handleCheckoutSuccess (the code path that webhook takes), so the Lite
 * order's credits are granted once across the reconcile, concurrent page
 * loads and a late webhook. Fake DB without row locks, like D1.
 */
const state = vi.hoisted(() => ({
  orders: [] as Record<string, any>[],
  credits: [] as Record<string, any>[],
  sub: {} as Record<string, any>,
  waffoStatus: { state: 'applied' } as Record<string, any>,
  statusCalls: 0,
}));

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

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
        orderBy: () => q,
        for: () => q,
        limit: async () => {
          await tick();
          if (table === schema.order) {
            return state.orders.map((row) => ({ ...row }));
          }
          if (table === schema.credit) {
            return state.credits.filter((c) => c.transactionType === 'grant');
          }
          return [];
        },
      };
      return q;
    },
    update: (table: any) => ({
      set: (values: Record<string, any>) => ({
        where: async () => {
          await tick();
          if (table !== schema.order) return { rowsAffected: 0 };
          const row = state.orders[0];
          if (values.status === 'paid') {
            if (!['created', 'pending'].includes(row.status)) {
              return { rowsAffected: 0 };
            }
          }
          Object.assign(row, values);
          return { rowsAffected: 1 };
        },
      }),
    }),
    insert: (table: any) => ({
      values: (values: Record<string, any>) => ({
        onConflictDoNothing: async () => {
          await tick();
          if (table !== schema.credit) return { rowsAffected: 0 };
          if (
            state.credits.some((c) => c.transactionNo === values.transactionNo)
          ) {
            return { rowsAffected: 0 };
          }
          state.credits.push(values);
          return { rowsAffected: 1 };
        },
      }),
    }),
  };
  return { db: () => fake };
});

vi.mock('@/modules/notify/service', () => ({
  notifyPaymentSuccess: vi.fn(async () => {}),
}));

// The old subscription as billing sees it. Once the Lite order is paid,
// fulfillment has replaced it (cancelReplacedSubscriptions clears pending).
vi.mock('@/modules/subscriptions/service', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  findBySubscriptionNo: async () =>
    state.orders[0]?.status === 'paid'
      ? {
          ...state.sub,
          status: 'pending_cancel',
          canceledReasonType: 'plan_change',
          pendingProductId: null,
          pendingChangeType: null,
          pendingEffectiveAt: null,
          providerScheduleId: null,
        }
      : { ...state.sub },
  updateBySubscriptionNo: async () => ({ ...state.sub }),
}));

vi.mock('./waffo-plan-change', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  findWaffoPlanChangeOrderForBooking: async () => ({ ...state.orders[0] }),
}));

/** What Waffo returns for the activated Lite order / sends as plan_changed. */
const waffoSession = () => ({
  paymentStatus: PaymentStatus.SUCCESS,
  paymentResult: { id: 'ORDlite1', orderNo: 'ORDlite1' },
  paymentInfo: {
    paymentAmount: 990,
    paymentCurrency: 'usd',
    transactionId: 'PAY_lite_1',
  },
});

vi.mock('./service', async (importOriginal) => {
  const real = await importOriginal<any>();
  return {
    ...real,
    getPaymentManager: async () => ({
      getProvider: () => ({
        name: 'waffo',
        getPlanChangeStatus: async () => {
          state.statusCalls++;
          return state.waffoStatus;
        },
      }),
    }),
    // handlePaymentCallback fetches this session from Waffo, then runs
    // handleCheckoutSuccess — same as the plan_changed webhook.
    handlePaymentCallback: async () =>
      real.handleCheckoutSuccess(waffoSession(), 'waffo'),
  };
});

const { syncScheduledPlanChange, resetProcessingUpgradeThrottle } =
  await import('./processing-upgrade-sync');
const { handleCheckoutSuccess } = await import('./service');

const effectiveAt = new Date('2026-11-19T23:53:52Z');
const now = effectiveAt.getTime() + 5 * 60_000;

beforeEach(() => {
  resetProcessingUpgradeThrottle();
  state.statusCalls = 0;
  state.waffoStatus = { state: 'applied', providerOrderId: 'ORD_lite' };
  state.credits = [];
  state.orders = [
    {
      id: 'o-lite',
      orderNo: 'ORDlite1',
      status: 'created',
      amount: 990,
      currency: 'usd',
      productId: 'lite_monthly',
      paymentType: 'subscription',
      paymentProvider: 'waffo',
      creditsAmount: 1800,
      creditsValidDays: 30,
      userId: 'u1',
      userEmail: 'a@b.c',
      subscriptionNo: null,
      deletedAt: null,
      checkoutInfo: JSON.stringify({
        planChange: {
          fromSubscriptionNo: 'SUB-PRO',
          timing: 'period_end',
          confirmedOrderId: 'ORD_lite',
        },
      }),
    },
  ];
  state.sub = {
    userId: 'u1',
    subscriptionNo: 'SUB-PRO',
    subscriptionId: 'ORD_pro',
    paymentProvider: 'waffo',
    status: 'active',
    productId: 'pro_monthly',
    currentPeriodEnd: effectiveAt,
    pendingProductId: 'lite_monthly',
    pendingChangeType: 'downgrade',
    pendingEffectiveAt: effectiveAt,
    providerScheduleId: 'ORD_lite',
  };
});

describe('reconcile a lost Waffo plan_changed', () => {
  it('past the effective time: applies once and grants the Lite credits once', async () => {
    const res = await syncScheduledPlanChange({ ...state.sub } as any, { now });
    expect(res.state).toBe('applied');
    expect(state.orders[0].status).toBe('paid');
    expect(state.credits).toHaveLength(1);
    expect(state.credits[0]).toMatchObject({
      orderNo: 'ORDlite1',
      transactionNo: 'grant_ORDlite1',
      credits: 1800,
    });
  });

  it('Waffo has not switched yet: nothing is fulfilled', async () => {
    state.waffoStatus = { state: 'scheduled', providerOrderId: 'ORD_lite' };
    const res = await syncScheduledPlanChange({ ...state.sub } as any, { now });
    expect(res.state).toBe('pending');
    expect(state.orders[0].status).toBe('created');
    expect(state.credits).toHaveLength(0);
  });

  it('a late plan_changed webhook after the reconcile grants nothing more', async () => {
    await syncScheduledPlanChange({ ...state.sub } as any, { now });
    await handleCheckoutSuccess(waffoSession(), 'waffo');
    await handleCheckoutSuccess(waffoSession(), 'waffo');
    expect(state.credits).toHaveLength(1);
  });

  it('concurrent page loads and the webhook together grant once', async () => {
    await Promise.all([
      syncScheduledPlanChange({ ...state.sub } as any, { now, force: true }),
      syncScheduledPlanChange({ ...state.sub } as any, { now, force: true }),
      handleCheckoutSuccess(waffoSession(), 'waffo'),
    ]);
    expect(state.orders[0].status).toBe('paid');
    expect(state.credits).toHaveLength(1);
  });
});
