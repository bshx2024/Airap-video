import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PaymentStatus, SubscriptionCycleType } from '@/core/payment/types';

/**
 * Billing replays a lost Stripe / Dodo renewal through the real
 * handleSubscriptionRenewal with the webhook's own dedupe key, so the
 * reconcile, concurrent loads and a late webhook record one renewal and
 * one grant. Provider APIs are mocked. Fake DB: one subscription row,
 * orders keyed by primary key (the claim), no row locks.
 */
const state = vi.hoisted(() => ({
  sub: {} as Record<string, any>,
  orders: [] as Record<string, any>[],
  grants: [] as Record<string, any>[],
  renewal: null as Record<string, any> | null,
  current: null as Record<string, any> | null,
  renewalParams: [] as Record<string, any>[],
  renewalError: null as Error | null,
  currentError: null as Error | null,
  providerCalls: 0,
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
        limit: () => q,
        for: () => q,
        then: (resolve: any, reject: any) =>
          tick()
            .then(() =>
              table === schema.subscription ? [{ ...state.sub }] : []
            )
            .then(resolve, reject),
      };
      return q;
    },
    update: (table: any) => ({
      set: (values: Record<string, any>) => ({
        where: () => {
          const run: any = (async () => {
            await tick();
            if (table === schema.subscription) {
              Object.assign(state.sub, values);
            }
            return { rowsAffected: 1 };
          })();
          run.returning = async () => {
            await run;
            return [{ ...state.sub }];
          };
          return run;
        },
      }),
    }),
    insert: (table: any) => ({
      values: (values: Record<string, any>) => ({
        onConflictDoNothing: async () => {
          await tick();
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
  findBySubscriptionNo: async () => ({ ...state.sub }),
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

vi.mock('./waffo-plan-change', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  findSubscriptionOriginOrderNo: async () => 'ORD-LOCAL-1',
}));

vi.mock('./service', async (importOriginal) => {
  const real = await importOriginal<any>();
  return {
    ...real,
    getPaymentManager: async () => ({
      getProvider: (name: string) => ({
        name,
        // Creem has no renewal lookup, only getSubscription.
        ...(name === 'creem'
          ? {}
          : {
              getRenewalSession: async (params: Record<string, any>) => {
                state.providerCalls++;
                state.renewalParams.push(params);
                if (state.renewalError) throw state.renewalError;
                return state.renewal ? structuredClone(state.renewal) : null;
              },
            }),
        getSubscription: async () => {
          state.providerCalls++;
          if (state.currentError) throw state.currentError;
          return structuredClone(
            state.current || {
              subscriptionId: 'sub_prov_1',
              subscriptionInfo: { status: 'active' },
            }
          );
        },
      }),
    }),
  };
});

const { syncLapsedRenewal, resetProcessingUpgradeThrottle } =
  await import('./processing-upgrade-sync');
const { handleSubscriptionCanceled, handleSubscriptionRenewal } =
  await import('./service');

const periodEnd = new Date('2026-11-10T08:00:00Z');
const nextEnd = new Date('2026-12-10T08:00:00Z');
const now = periodEnd.getTime() + 3 * 60 * 60_000;

/** What invoice.payment_succeeded (Stripe) carries for the renewal. */
const stripeRenewal = () => ({
  provider: 'stripe',
  subscriptionId: 'sub_prov_1',
  paymentStatus: PaymentStatus.SUCCESS,
  paymentResult: { id: 'in_renew_1' },
  paymentInfo: {
    transactionId: 'in_renew_1',
    invoiceId: 'in_renew_1',
    paymentAmount: 1990,
    paymentCurrency: 'usd',
    subscriptionCycleType: SubscriptionCycleType.RENEWAL,
  },
  subscriptionInfo: {
    currentPeriodStart: periodEnd,
    currentPeriodEnd: nextEnd,
  },
});

/** Dodo: the reconcile session (payment id from payments.list)… */
const dodoReconciled = () => ({
  ...stripeRenewal(),
  provider: 'dodo',
  paymentResult: {},
  paymentInfo: {
    transactionId: 'pay_renew_1',
    paymentAmount: 1990,
    paymentCurrency: 'usd',
    subscriptionCycleType: SubscriptionCycleType.RENEWAL,
  },
});
/** …and the late `subscription.renewed` webhook (no payment id). */
const dodoRenewedWebhook = () => ({
  ...dodoReconciled(),
  paymentInfo: {
    paymentAmount: 1990,
    paymentCurrency: 'usd',
    subscriptionCycleType: SubscriptionCycleType.RENEWAL,
  },
});

function setSub(provider: string, extra: Record<string, any> = {}) {
  state.sub = {
    subscriptionNo: 'SUB-1',
    subscriptionId: 'sub_prov_1',
    userId: 'u1',
    userEmail: 'a@b.c',
    status: 'active',
    paymentProvider: provider,
    productId: 'pro_monthly',
    planName: 'Pro',
    productName: 'Pro',
    amount: 1990,
    currency: 'usd',
    interval: 'month',
    creditsAmount: 3600,
    creditsValidDays: 30,
    createdAt: new Date('2026-10-10T08:00:00Z'),
    currentPeriodStart: new Date('2026-10-10T08:00:00Z'),
    currentPeriodEnd: periodEnd,
    ...extra,
  };
}

beforeEach(() => {
  resetProcessingUpgradeThrottle();
  state.orders = [];
  state.grants = [];
  state.renewal = null;
  state.current = null;
  state.currentError = null;
  state.renewalParams = [];
  state.renewalError = null;
  state.providerCalls = 0;
});

describe('reconcile a lost renewal webhook', () => {
  it('Stripe: renewal applied once, keyed by the invoice id', async () => {
    setSub('stripe');
    state.renewal = stripeRenewal();
    const res = await syncLapsedRenewal({ ...state.sub } as any, { now });
    expect(res.state).toBe('applied');
    expect(state.orders).toHaveLength(1);
    expect(state.orders[0].transactionId).toBe('in_renew_1');
    expect(state.grants).toHaveLength(1);
    expect(state.grants[0].credits).toBe(3600);
    expect(state.sub.currentPeriodEnd).toEqual(nextEnd);
  });

  it('not renewed at the provider yet: nothing recorded', async () => {
    setSub('stripe');
    const res = await syncLapsedRenewal({ ...state.sub } as any, { now });
    expect(res.state).toBe('pending');
    expect(state.orders).toHaveLength(0);
    expect(state.grants).toHaveLength(0);
    expect(state.sub.currentPeriodEnd).toEqual(periodEnd);
  });

  it('Stripe: the late invoice.payment_succeeded grants nothing more', async () => {
    setSub('stripe');
    state.renewal = stripeRenewal();
    await syncLapsedRenewal({ ...state.sub } as any, { now });
    await handleSubscriptionRenewal(stripeRenewal(), 'stripe');
    expect(state.orders).toHaveLength(1);
    expect(state.grants).toHaveLength(1);
  });

  it('Dodo: the late subscription.renewed (no payment id) grants nothing more', async () => {
    setSub('dodo');
    state.renewal = dodoReconciled();
    await syncLapsedRenewal({ ...state.sub } as any, { now });
    await handleSubscriptionRenewal(dodoRenewedWebhook(), 'dodo');
    expect(state.orders).toHaveLength(1);
    expect(state.grants).toHaveLength(1);
  });

  it('concurrent page loads and the webhook record one renewal', async () => {
    setSub('stripe');
    state.renewal = stripeRenewal();
    await Promise.all([
      syncLapsedRenewal({ ...state.sub } as any, { now, force: true }),
      syncLapsedRenewal({ ...state.sub } as any, { now, force: true }),
      handleSubscriptionRenewal(stripeRenewal(), 'stripe'),
    ]);
    expect(state.orders).toHaveLength(1);
    expect(state.grants).toHaveLength(1);
  });

  it('Dodo: a booked downgrade applies on the replayed renewal', async () => {
    setSub('dodo', {
      pendingProductId: 'lite_monthly',
      pendingEffectiveAt: periodEnd,
      pendingChangeType: 'downgrade',
    });
    state.renewal = dodoReconciled();
    await syncLapsedRenewal({ ...state.sub } as any, { now });
    expect(state.sub.productId).toBe('lite_monthly');
    expect(state.sub.pendingProductId).toBeNull();
    expect(state.grants).toHaveLength(1);
    expect(state.grants[0].credits).toBe(1800);
  });
});

/** What getSubscription / the cancel webhook report for an ended subscription. */
const endedAtProvider = (status: string, extra: Record<string, any> = {}) => ({
  provider: 'stripe',
  subscriptionId: 'sub_prov_1',
  subscriptionInfo: {
    subscriptionId: 'sub_prov_1',
    productId: 'price_other',
    status,
    currentPeriodStart: new Date('2026-10-10T08:00:00Z'),
    currentPeriodEnd: periodEnd,
    canceledAt: new Date('2026-11-10T09:00:00Z'),
    canceledReason: 'payment_failed',
    ...extra,
  },
});

describe('reconcile a lost cancel / expire webhook', () => {
  it('Stripe canceled at the provider: local ends once, no credits', async () => {
    setSub('stripe');
    state.current = endedAtProvider('canceled');
    const res = await syncLapsedRenewal({ ...state.sub } as any, { now });
    expect(res).toEqual({ state: 'applied', detail: 'ended' });
    expect(state.sub.status).toBe('canceled');
    expect(state.sub.canceledEndAt).toEqual(new Date('2026-11-10T09:00:00Z'));
    expect(state.sub.productId).toBe('pro_monthly');
    expect(state.orders).toHaveLength(0);
    expect(state.grants).toHaveLength(0);

    const calls = state.providerCalls;
    const again = await syncLapsedRenewal({ ...state.sub } as any, {
      now,
      force: true,
    });
    expect(again.state).toBe('idle');
    expect(state.providerCalls).toBe(calls);
  });

  it('the late cancel webhook changes nothing more', async () => {
    setSub('stripe');
    state.current = endedAtProvider('canceled');
    await syncLapsedRenewal({ ...state.sub } as any, { now });
    const after = { ...state.sub };
    await handleSubscriptionCanceled(endedAtProvider('canceled'), 'stripe');
    expect(state.sub.status).toBe('canceled');
    expect(state.sub.canceledAt).toEqual(after.canceledAt);
    expect(state.orders).toHaveLength(0);
    expect(state.grants).toHaveLength(0);
  });

  it('cancel webhook landed first: the reconcile does not ask', async () => {
    setSub('stripe');
    await handleSubscriptionCanceled(endedAtProvider('canceled'), 'stripe');
    const res = await syncLapsedRenewal({ ...state.sub } as any, { now });
    expect(res.state).toBe('idle');
    expect(state.providerCalls).toBe(0);
  });

  it('Dodo expired / failed and Creem canceled end the same way', async () => {
    for (const [provider, status] of [
      ['dodo', 'expired'],
      ['creem', 'canceled'],
    ]) {
      resetProcessingUpgradeThrottle();
      state.providerCalls = 0;
      setSub(provider);
      state.current = {
        ...endedAtProvider(status, { canceledAt: undefined }),
        provider,
      };
      const res = await syncLapsedRenewal({ ...state.sub } as any, { now });
      expect(res).toEqual({ state: 'applied', detail: 'ended' });
      expect(state.sub.status).toBe('canceled');
      // No end time reported: ended as of the reconcile.
      expect(state.sub.canceledEndAt).toEqual(new Date(now));
      expect(state.providerCalls).toBe(provider === 'creem' ? 1 : 2);
    }
    expect(state.grants).toHaveLength(0);
  });

  it('unpaid at the provider: status only, plan and credits untouched', async () => {
    setSub('stripe');
    state.current = endedAtProvider('paused', {
      canceledAt: undefined,
      canceledReason: undefined,
    });
    const res = await syncLapsedRenewal({ ...state.sub } as any, { now });
    expect(res).toEqual({ state: 'applied', detail: 'unpaid' });
    expect(state.sub.status).toBe('paused');
    expect(state.sub.productId).toBe('pro_monthly');
    expect(state.orders).toHaveLength(0);
    expect(state.grants).toHaveLength(0);
  });

  it('still live at the provider: nothing changes', async () => {
    setSub('dodo');
    const res = await syncLapsedRenewal({ ...state.sub } as any, { now });
    expect(res).toEqual({ state: 'pending', detail: 'not_renewed' });
    expect(state.sub.status).toBe('active');
  });

  it('provider error: unavailable, local row untouched', async () => {
    setSub('stripe');
    state.currentError = new Error('stripe down');
    const res = await syncLapsedRenewal({ ...state.sub } as any, { now });
    expect(res.state).toBe('unavailable');
    expect(state.sub.status).toBe('active');
  });
});

/**
 * What Waffo `subscription.payment_succeeded` carries for a renewal
 * (buildSubscriptionPaymentSession): transaction id = Waffo payment id.
 * getRenewalSession returns the same id from the order's payments.
 */
const waffoRenewal = () => ({
  provider: 'waffo',
  subscriptionId: 'sub_prov_1',
  paymentStatus: PaymentStatus.SUCCESS,
  paymentResult: { id: 'ORD-LOCAL-1', orderNo: 'ORD-LOCAL-1' },
  paymentInfo: {
    transactionId: 'PAY_renew_1',
    invoiceId: 'PAY_renew_1',
    paymentAmount: 1990,
    paymentCurrency: 'usd',
    subscriptionCycleType: SubscriptionCycleType.RENEWAL,
  },
  subscriptionInfo: {
    currentPeriodStart: periodEnd,
    currentPeriodEnd: nextEnd,
  },
});

describe('reconcile a lost Waffo renewal webhook', () => {
  it('renewal applied once, keyed by the Waffo payment id', async () => {
    setSub('waffo');
    state.renewal = waffoRenewal();
    const res = await syncLapsedRenewal({ ...state.sub } as any, { now });
    expect(res.state).toBe('applied');
    expect(state.renewalParams[0]).toMatchObject({
      subscriptionId: 'sub_prov_1',
      orderRef: 'ORD-LOCAL-1',
    });
    expect(state.orders).toHaveLength(1);
    expect(state.orders[0].transactionId).toBe('PAY_renew_1');
    expect(state.grants).toHaveLength(1);
    expect(state.sub.currentPeriodEnd).toEqual(nextEnd);
  });

  it('the late payment_succeeded webhook grants nothing more', async () => {
    setSub('waffo');
    state.renewal = waffoRenewal();
    await syncLapsedRenewal({ ...state.sub } as any, { now });
    await handleSubscriptionRenewal(waffoRenewal(), 'waffo');
    expect(state.orders).toHaveLength(1);
    expect(state.grants).toHaveLength(1);
  });

  it('webhook and reconcile at once record one renewal', async () => {
    setSub('waffo');
    state.renewal = waffoRenewal();
    await Promise.all([
      syncLapsedRenewal({ ...state.sub } as any, { now, force: true }),
      handleSubscriptionRenewal(waffoRenewal(), 'waffo'),
    ]);
    expect(state.orders).toHaveLength(1);
    expect(state.grants).toHaveLength(1);
  });

  it('Waffo error: unavailable, nothing recorded', async () => {
    setSub('waffo');
    state.renewalError = new Error('waffo down');
    const res = await syncLapsedRenewal({ ...state.sub } as any, { now });
    expect(res.state).toBe('unavailable');
    expect(state.orders).toHaveLength(0);
    expect(state.sub.currentPeriodEnd).toEqual(periodEnd);
  });

  it('Waffo ended the order (webhook lost): local ends, no credits', async () => {
    setSub('waffo');
    state.current = {
      ...endedAtProvider('canceled'),
      provider: 'waffo',
    };
    const res = await syncLapsedRenewal({ ...state.sub } as any, { now });
    expect(res).toEqual({ state: 'applied', detail: 'ended' });
    expect(state.sub.status).toBe('canceled');
    expect(state.grants).toHaveLength(0);
  });
});
