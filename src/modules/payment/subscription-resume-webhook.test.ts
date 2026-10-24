import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Resume in the provider portal → the subscription update webhook lifts the
 * local billing cancel (tinyship: waffo handleSubscriptionUncanceled,
 * stripe cancel_at_period_end, dodo cancel_at_next_billing_date, creem
 * active after scheduled_cancel). Portal cancels land as pending_cancel.
 */
const state = vi.hoisted(() => ({
  sub: null as Record<string, any> | null,
  updates: [] as Record<string, any>[],
}));

vi.mock('@/core/db', () => {
  const q: any = {
    from: () => q,
    where: () => q,
    orderBy: () => q,
    limit: async () => [],
  };
  return {
    db: () => ({
      select: () => q,
      update: () => ({ set: () => ({ where: async () => ({}) }) }),
      transaction: async (fn: any) => fn({}),
    }),
  };
});
vi.mock('@/modules/config/service', () => ({
  getAllConfigs: async () => ({}),
}));
vi.mock('@/modules/notify/service', () => ({
  notifyPaymentSuccess: async () => {},
}));
vi.mock('@/modules/subscriptions/service', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  findByProviderSubscriptionId: async () =>
    state.sub ? { ...state.sub } : null,
  findBySubscriptionNo: async () => (state.sub ? { ...state.sub } : null),
  updateBySubscriptionNo: async (_no: string, patch: Record<string, any>) => {
    state.updates.push(patch);
    if (state.sub) Object.assign(state.sub, patch);
    return state.sub;
  },
}));

const { handleSubscriptionUpdated } = await import('./service');

const periodEnd = new Date(Date.now() + 10 * 86_400_000);
const canceled = (paymentProvider: string) => ({
  subscriptionNo: 'SUB-1',
  subscriptionId: 'prov_sub_1',
  paymentProvider,
  productId: 'pro_monthly',
  status: 'pending_cancel',
  currentPeriodEnd: periodEnd,
  canceledAt: new Date(),
  canceledEndAt: periodEnd,
  canceledReason: 'Canceled by user',
  canceledReasonType: 'user_request',
});
const update = (status: string, extra: Record<string, any> = {}) => ({
  subscriptionId: 'prov_sub_1',
  subscriptionInfo: {
    subscriptionId: 'prov_sub_1',
    status,
    currentPeriodStart: new Date(),
    currentPeriodEnd: periodEnd,
    ...extra,
  },
});

beforeEach(() => {
  state.sub = null;
  state.updates = [];
});

describe('portal resume → webhook sync', () => {
  for (const provider of ['stripe', 'dodo', 'creem']) {
    it(`${provider}: live status after a billing cancel clears it`, async () => {
      state.sub = canceled(provider);
      await handleSubscriptionUpdated(update('active'), provider);
      expect(state.sub).toMatchObject({
        status: 'active',
        canceledAt: null,
        canceledEndAt: null,
        canceledReasonType: '',
      });
    });
  }

  it('waffo: subscription.uncanceled (resumed) clears the cancel', async () => {
    state.sub = canceled('waffo');
    await handleSubscriptionUpdated(
      update('active', { resumed: true }),
      'waffo'
    );
    expect(state.sub).toMatchObject({
      status: 'active',
      canceledEndAt: null,
      canceledReasonType: '',
    });
  });

  it('waffo: a stale live update without resume keeps the cancel', async () => {
    state.sub = canceled('waffo');
    await handleSubscriptionUpdated(update('active'), 'waffo');
    expect(state.updates).toEqual([]);
    expect(state.sub?.status).toBe('pending_cancel');
  });

  it('portal cancel (Stripe cancel_at_period_end) lands as pending_cancel', async () => {
    state.sub = {
      ...canceled('stripe'),
      status: 'active',
      canceledReasonType: '',
    };
    await handleSubscriptionUpdated(
      update('pending_cancel', { canceledEndAt: periodEnd }),
      'stripe'
    );
    expect(state.sub).toMatchObject({
      status: 'pending_cancel',
      canceledEndAt: periodEnd,
    });
  });
});
