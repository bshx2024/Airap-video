import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * resumeUserSubscription: in-app 「恢复订阅」 for Stripe / Dodo / Creem /
 * Waffo — ownership, provider resume call, local cancel cleared at once,
 * idempotent.
 */
const state = vi.hoisted(() => ({
  sub: null as Record<string, any> | null,
  updates: [] as Record<string, any>[],
  resumes: [] as Record<string, any>[],
  resumeResult: { subscriptionInfo: { status: 'active' } } as Record<
    string,
    any
  >,
  resumeError: null as (Error & Record<string, any>) | null,
}));

vi.mock('@/core/db', () => ({ db: () => ({}) }));
vi.mock('@/modules/config/service', () => ({
  getAllConfigs: async () => ({
    waffo_product_ids_mapping: JSON.stringify({
      pro_monthly: 'PROD_pro_monthly',
    }),
  }),
}));
vi.mock('@/modules/notify/service', () => ({
  notifyPaymentSuccess: async () => {},
}));
vi.mock('@/modules/subscriptions/service', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  findBySubscriptionNo: async () => (state.sub ? { ...state.sub } : null),
  findByProviderSubscriptionId: async () =>
    state.sub ? { ...state.sub } : null,
  updateBySubscriptionNo: async (_no: string, patch: Record<string, any>) => {
    state.updates.push(patch);
    if (state.sub) Object.assign(state.sub, patch);
    return state.sub ? { ...state.sub } : null;
  },
}));
vi.mock('@/core/payment', async (importOriginal) => {
  const actual = await importOriginal<any>();
  class PaymentManager {
    addProvider() {}
    getProvider(name: string) {
      return {
        name,
        resumeSubscription: async (params: Record<string, any>) => {
          state.resumes.push({ name, ...params });
          if (state.resumeError) throw state.resumeError;
          return state.resumeResult;
        },
      };
    }
  }
  return { ...actual, PaymentManager };
});

const { resumeUserSubscription, handleSubscriptionUpdated } =
  await import('./service');

const periodEnd = new Date(Date.now() + 10 * 86_400_000);
const canceling = (
  paymentProvider: string,
  extra: Record<string, any> = {}
) => ({
  userId: 'u1',
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
  ...extra,
});

beforeEach(() => {
  state.sub = null;
  state.updates = [];
  state.resumes = [];
  state.resumeResult = { subscriptionInfo: { status: 'active' } };
  state.resumeError = null;
});

describe('resumeUserSubscription', () => {
  for (const provider of ['stripe', 'dodo', 'creem']) {
    it(`${provider}: resumes at the provider and clears the local cancel now`, async () => {
      state.sub = canceling(provider);
      const res = await resumeUserSubscription({
        userId: 'u1',
        subscriptionNo: 'SUB-1',
      });
      expect(state.resumes).toEqual([
        { name: provider, subscriptionId: 'prov_sub_1' },
      ]);
      expect(res).toMatchObject({
        status: 'active',
        canceledAt: null,
        canceledEndAt: null,
        canceledReason: '',
        canceledReasonType: '',
      });
    });
  }

  it('waffo: resumes with session token inputs and clears the local cancel now', async () => {
    state.sub = canceling('waffo');
    const res = await resumeUserSubscription({
      userId: 'u1',
      subscriptionNo: 'SUB-1',
    });
    expect(state.resumes).toEqual([
      {
        name: 'waffo',
        subscriptionId: 'prov_sub_1',
        buyerIdentity: 'u1',
        productId: 'PROD_pro_monthly',
      },
    ]);
    expect(res).toMatchObject({
      status: 'active',
      canceledAt: null,
      canceledEndAt: null,
      canceledReason: '',
      canceledReasonType: '',
    });
  });

  it('someone else’s subscription → Forbidden, nothing called', async () => {
    state.sub = canceling('stripe', { userId: 'other' });
    await expect(
      resumeUserSubscription({ userId: 'u1', subscriptionNo: 'SUB-1' })
    ).rejects.toThrow('Forbidden');
    expect(state.resumes).toEqual([]);
  });

  it('unknown subscription → not found', async () => {
    await expect(
      resumeUserSubscription({ userId: 'u1', subscriptionNo: 'SUB-X' })
    ).rejects.toThrow('Subscription not found');
  });

  it('double resume is idempotent: the second call does not hit the provider', async () => {
    state.sub = canceling('dodo');
    await resumeUserSubscription({ userId: 'u1', subscriptionNo: 'SUB-1' });
    const again = await resumeUserSubscription({
      userId: 'u1',
      subscriptionNo: 'SUB-1',
    });
    expect(state.resumes).toHaveLength(1);
    expect(again.status).toBe('active');
  });

  it('a provider that is still canceling does not clear the local cancel', async () => {
    state.sub = canceling('dodo');
    state.resumeResult = {
      subscriptionInfo: { status: 'pending_cancel' },
    };
    await expect(
      resumeUserSubscription({ userId: 'u1', subscriptionNo: 'SUB-1' })
    ).rejects.toThrow('Resume failed');
    expect(state.updates).toEqual([]);
    expect(state.sub.status).toBe('pending_cancel');
  });

  it('a plan ended by a plan change, or already past its end, is refused', async () => {
    state.sub = canceling('stripe', { canceledReasonType: 'plan_change' });
    await expect(
      resumeUserSubscription({ userId: 'u1', subscriptionNo: 'SUB-1' })
    ).rejects.toThrow('This subscription cannot be resumed.');
    state.sub = canceling('stripe', {
      canceledEndAt: new Date(Date.now() - 1000),
      currentPeriodEnd: new Date(Date.now() - 1000),
    });
    await expect(
      resumeUserSubscription({ userId: 'u1', subscriptionNo: 'SUB-1' })
    ).rejects.toThrow('This subscription cannot be resumed.');
    expect(state.resumes).toEqual([]);
  });

  it('a later provider update webhook does not bring the cancel back', async () => {
    state.sub = canceling('stripe');
    await resumeUserSubscription({ userId: 'u1', subscriptionNo: 'SUB-1' });
    await handleSubscriptionUpdated(
      {
        subscriptionId: 'prov_sub_1',
        subscriptionInfo: {
          subscriptionId: 'prov_sub_1',
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd,
        },
      },
      'stripe'
    );
    expect(state.sub).toMatchObject({
      status: 'active',
      canceledEndAt: null,
      canceledReasonType: '',
    });
  });

  it('waffo refusing for good → localized "cannot resume", cancel kept', async () => {
    state.sub = canceling('waffo');
    state.resumeError = Object.assign(
      new Error(
        'Waffo reactivate-order failed (400): [{"message":"Only canceling subscriptions can be reactivated"}]'
      ),
      { notReactivatable: true }
    );
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      resumeUserSubscription({ userId: 'u1', subscriptionNo: 'SUB-1' })
    ).rejects.toThrow('This subscription cannot be resumed.');
    expect(spy.mock.calls.flat().join(' ')).toContain(
      'Only canceling subscriptions can be reactivated'
    );
    spy.mockRestore();
    expect(state.updates).toEqual([]);
  });

  it('other waffo failures propagate unchanged', async () => {
    state.sub = canceling('waffo');
    state.resumeError = new Error('Waffo reactivate-order failed (401): x');
    await expect(
      resumeUserSubscription({ userId: 'u1', subscriptionNo: 'SUB-1' })
    ).rejects.toThrow('reactivate-order failed (401)');
    expect(state.updates).toEqual([]);
  });
});
