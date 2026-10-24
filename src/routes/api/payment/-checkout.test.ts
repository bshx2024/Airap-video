import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Route } from './checkout';

/**
 * /api/payment/checkout while the current plan is canceled at period end:
 * no other subscription plan can be paid for (upgrade, interval switch,
 * downgrade); credit packs and an ended subscription still check out.
 */
const state = vi.hoisted(() => ({
  sub: null as Record<string, any> | null,
  checkouts: [] as string[],
}));

vi.mock('@/core/auth', () => ({
  getAuth: () => ({
    api: {
      getSession: async () => ({
        user: { id: 'u1', email: 'u1@example.com', name: 'U1' },
      }),
    },
  }),
}));
vi.mock('@/lib/rate-limit', () => ({
  enforceMinIntervalRateLimit: () => null,
}));
vi.mock('@/modules/config/service', () => ({
  getAllConfigs: async () => ({}),
}));
vi.mock('@/modules/subscriptions/service', () => ({
  getCurrentSubscription: async () => state.sub,
  SubscriptionStatus: { PENDING_CANCEL: 'pending_cancel', ACTIVE: 'active' },
}));
vi.mock('@/modules/payment/plan-change-service', () => ({
  healUnconfirmedWaffoBooking: async (sub: unknown) => sub,
  pendingErrorFor: () => 'A plan change is already scheduled. Undo it first.',
  PLAN_CHANGE_ERRORS: {
    choiceRequired: 'choice required',
    endingSoon: 'ending soon',
    useChange: 'use change',
    subscriptionEnding: 'subscription ending',
  },
}));
vi.mock('@/modules/payment/service', () => ({
  resolveCheckoutProviderName: async () => 'stripe',
  createCheckout: async (params: any) => {
    state.checkouts.push(params.paymentOrder.productId);
    return { checkoutInfo: { checkoutUrl: 'https://pay.example/c' } };
  },
}));

const post = (Route.options as any).server.handlers.POST as (ctx: {
  request: Request;
}) => Promise<Response>;

async function checkout(productId: string) {
  const res = await post({
    request: new Request('http://localhost/api/payment/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        payment_provider: 'stripe',
        locale: 'zh',
      }),
    }),
  });
  return (await res.json()) as { code: number; message: string; data?: any };
}

const periodEnd = new Date(Date.now() + 30 * 86_400_000);
const canceling = (productId: string, extra: Record<string, any> = {}) => ({
  subscriptionNo: 'sub_1',
  userId: 'u1',
  paymentProvider: 'stripe',
  productId,
  status: 'pending_cancel',
  canceledEndAt: periodEnd,
  currentPeriodEnd: periodEnd,
  pendingProductId: null,
  pendingChangeType: null,
  ...extra,
});

beforeEach(() => {
  state.sub = null;
  state.checkouts = [];
});

describe('checkout while the current plan is canceling', () => {
  it('rejects an upgrade (higher tier)', async () => {
    state.sub = canceling('pro_monthly');
    const res = await checkout('ultra_monthly');
    expect(res.code).toBe(-1);
    expect(res.message).toBe('subscription ending');
    expect(res.data).toMatchObject({
      code: 'subscription_ending',
      ends_at: periodEnd.toISOString(),
    });
    expect(state.checkouts).toEqual([]);
  });

  it('rejects a same-tier monthly → yearly switch', async () => {
    state.sub = canceling('ultra_monthly');
    const res = await checkout('ultra_yearly');
    expect(res.data?.code).toBe('subscription_ending');
    expect(state.checkouts).toEqual([]);
  });

  it('rejects a lower-tier yearly → higher-tier monthly', async () => {
    state.sub = canceling('pro_yearly');
    expect((await checkout('ultra_monthly')).data?.code).toBe(
      'subscription_ending'
    );
  });

  it('keeps the downgrade code for a downgrade', async () => {
    state.sub = canceling('ultra_monthly');
    const res = await checkout('pro_yearly');
    expect(res.data?.code).toBe('downgrade_after_period_end');
    expect(state.checkouts).toEqual([]);
  });

  it('a booked change on the ending plan reports the pending change', async () => {
    state.sub = canceling('pro_monthly', {
      paymentProvider: 'waffo',
      pendingProductId: 'ultra_monthly',
      pendingChangeType: 'upgrade',
    });
    expect((await checkout('ultra_yearly')).data?.code).toBe(
      'plan_change_pending'
    );
  });

  it('credit packs still check out', async () => {
    state.sub = canceling('ultra_monthly');
    const res = await checkout('credits_pro');
    expect(res.code).toBe(0);
    expect(state.checkouts).toEqual(['credits_pro']);
  });
});

describe('checkout after the canceled plan ended', () => {
  it('a canceled plan past its end no longer blocks', async () => {
    const past = new Date(Date.now() - 60_000);
    state.sub = canceling('ultra_monthly', {
      canceledEndAt: past,
      currentPeriodEnd: past,
    });
    const res = await checkout('ultra_yearly');
    expect(res.code).toBe(0);
    expect(state.checkouts).toEqual(['ultra_yearly']);
  });

  it('no current subscription subscribes normally', async () => {
    state.sub = null;
    expect((await checkout('ultra_yearly')).code).toBe(0);
    expect((await checkout('pro_monthly')).code).toBe(0);
    expect(state.checkouts).toEqual(['ultra_yearly', 'pro_monthly']);
  });

  it('an active plan can still upgrade through checkout', async () => {
    state.sub = {
      ...canceling('pro_monthly'),
      status: 'active',
      canceledEndAt: null,
    };
    expect((await checkout('ultra_monthly')).code).toBe(0);
  });
});
