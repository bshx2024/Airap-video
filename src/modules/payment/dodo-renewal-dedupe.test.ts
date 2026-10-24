import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PaymentStatus, SubscriptionCycleType } from '@/core/payment/types';

/**
 * Dodo reports a retried renewal charge twice: `payment.succeeded`
 * (retry_attempt > 0, payment_id) and `subscription.renewed` (no payment
 * id). Both must claim one renewal order / one credit grant, in any order.
 * Fake DB: one subscription row, orders keyed by primary key.
 */
const state = vi.hoisted(() => ({
  sub: {} as Record<string, any>,
  orders: [] as Record<string, any>[],
  grants: [] as Record<string, any>[],
  /** When set, order selects return these rows (legacy renewal lookup). */
  orderRows: null as null | Record<string, any>[],
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
        for: () => q,
        then: (resolve: any, reject: any) =>
          Promise.resolve(
            table === schema.subscription
              ? [{ ...state.sub }]
              : table === schema.order && state.orderRows
                ? state.orderRows
                : []
          ).then(resolve, reject),
      };
      return q;
    },
    update: (table: any) => ({
      set: (values: Record<string, any>) => ({
        where: async () => {
          if (table === schema.subscription) Object.assign(state.sub, values);
          if (table === schema.order) {
            // Emulates `transactionId LIKE 'renew_%'` (synthetic id only).
            for (const o of state.orders) {
              if (String(o.transactionId || '').startsWith('renew_')) {
                Object.assign(o, values);
              }
            }
          }
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
          state.orders.push({ ...values });
          return { rowsAffected: 1 };
        },
      }),
    }),
  };
  return { db: () => fake };
});

vi.mock('@/modules/config/service', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  getAllConfigs: async () => ({}),
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

vi.mock('@/modules/notify/service', () => ({
  notifyPaymentSuccess: vi.fn(async () => {}),
}));

const { handleSubscriptionRenewal, renewalOrderIdFor } =
  await import('./service');

const periodStart = new Date('2026-11-10T08:00:00Z');
const periodEnd = new Date('2026-12-10T08:00:00Z');
const subscriptionInfo = {
  currentPeriodStart: periodStart,
  currentPeriodEnd: periodEnd,
};

/** payment.succeeded with retry_attempt > 0 (subscription retrieved). */
const paymentSucceeded = () => ({
  subscriptionId: 'sub_dodo_1',
  paymentStatus: PaymentStatus.SUCCESS,
  paymentResult: {},
  paymentInfo: {
    transactionId: 'pay_retry_1',
    paymentAmount: 990,
    paymentCurrency: 'usd',
    subscriptionCycleType: SubscriptionCycleType.RENEWAL,
  },
  subscriptionInfo: { ...subscriptionInfo },
});

/** subscription.renewed (no payment id). */
const subscriptionRenewed = () => ({
  subscriptionId: 'sub_dodo_1',
  paymentStatus: PaymentStatus.SUCCESS,
  paymentResult: {},
  paymentInfo: {
    paymentAmount: 990,
    paymentCurrency: 'usd',
    subscriptionCycleType: SubscriptionCycleType.RENEWAL,
  },
  subscriptionInfo: { ...subscriptionInfo },
});

beforeEach(() => {
  state.sub = {
    subscriptionNo: 'SUB-D',
    subscriptionId: 'sub_dodo_1',
    userId: 'u1',
    userEmail: 'a@b.c',
    status: 'active',
    paymentProvider: 'dodo',
    productId: 'lite_monthly',
    planName: 'Lite',
    productName: 'Lite',
    amount: 990,
    currency: 'usd',
    interval: 'month',
    creditsAmount: 1800,
    creditsValidDays: 30,
    createdAt: new Date('2026-10-10T08:00:00Z'),
    currentPeriodStart: new Date('2026-10-10T08:00:00Z'),
    currentPeriodEnd: periodStart,
  };
  state.orders = [];
  state.grants = [];
  state.orderRows = null;
});

describe('Dodo retried renewal reported by two webhooks', () => {
  it('payment.succeeded then subscription.renewed: one order, one grant', async () => {
    await handleSubscriptionRenewal(paymentSucceeded(), 'dodo');
    await handleSubscriptionRenewal(subscriptionRenewed(), 'dodo');
    expect(state.orders).toHaveLength(1);
    expect(state.grants).toHaveLength(1);
    expect(state.orders[0].transactionId).toBe('pay_retry_1');
  });

  it('subscription.renewed then payment.succeeded: one grant, real payment id kept', async () => {
    await handleSubscriptionRenewal(subscriptionRenewed(), 'dodo');
    await handleSubscriptionRenewal(paymentSucceeded(), 'dodo');
    expect(state.orders).toHaveLength(1);
    expect(state.grants).toHaveLength(1);
    expect(state.orders[0].transactionId).toBe('pay_retry_1');
  });

  it('subscription.renewed after a payment-id order for this period grants nothing more', async () => {
    state.orderRows = [
      {
        id: 'renew-legacy-payment-id',
        subscriptionNo: 'SUB-D',
        paymentProvider: 'dodo',
        paymentType: 'renew',
        status: 'paid',
        transactionId: 'pay_retry_1',
        createdAt: periodStart,
      },
    ];
    await handleSubscriptionRenewal(subscriptionRenewed(), 'dodo');
    expect(state.orders).toHaveLength(0);
    expect(state.grants).toHaveLength(0);
  });

  it('a first-period event hours after checkout does not grant again', async () => {
    state.sub.createdAt = new Date(periodStart.getTime() - 6 * 60 * 60 * 1000);
    await handleSubscriptionRenewal(subscriptionRenewed(), 'dodo');
    expect(state.orders).toHaveLength(0);
    expect(state.grants).toHaveLength(0);
  });

  it('the next period is still a new renewal', async () => {
    await handleSubscriptionRenewal(subscriptionRenewed(), 'dodo');
    const next = subscriptionRenewed();
    next.subscriptionInfo = {
      currentPeriodStart: periodEnd,
      currentPeriodEnd: new Date('2027-01-10T08:00:00Z'),
    };
    await handleSubscriptionRenewal(next, 'dodo');
    expect(state.grants).toHaveLength(2);
  });

  it('Dodo renewal keys ignore the payment id; Stripe keeps the invoice id', () => {
    const base = { subscriptionNo: 'SUB-D', currentPeriodStart: periodStart };
    expect(
      renewalOrderIdFor({ ...base, provider: 'dodo', transactionId: 'pay_1' })
    ).toBe(renewalOrderIdFor({ ...base, provider: 'dodo' }));
    expect(
      renewalOrderIdFor({ ...base, provider: 'stripe', transactionId: 'in_1' })
    ).not.toBe(renewalOrderIdFor({ ...base, provider: 'stripe' }));
  });
});
