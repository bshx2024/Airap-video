import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * cancelUserSubscription must write a future canceledEndAt even when the
 * local currentPeriodEnd was wrongly set to the same second as start
 * (Waffo null-period fallback bug).
 */
const state = vi.hoisted(() => ({
  sub: null as Record<string, any> | null,
  updates: [] as Record<string, any>[],
  cancelResult: {
    subscriptionInfo: { status: 'pending_cancel', canceledAt: new Date() },
  } as Record<string, any>,
}));

vi.mock('@/core/db', () => ({ db: () => ({}) }));
vi.mock('@/modules/config/service', () => ({
  getAllConfigs: async () => ({}),
}));
vi.mock('@/modules/notify/service', () => ({
  notifyPaymentSuccess: async () => {},
}));
vi.mock('@/modules/subscriptions/service', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  findBySubscriptionNo: async () => (state.sub ? { ...state.sub } : null),
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
        cancelSubscription: async () => state.cancelResult,
      };
    }
  }
  return { ...actual, PaymentManager };
});

const { cancelUserSubscription } = await import('./service');

beforeEach(() => {
  state.sub = null;
  state.updates = [];
  state.cancelResult = {
    subscriptionInfo: { status: 'pending_cancel', canceledAt: new Date() },
  };
});

describe('cancelUserSubscription period end', () => {
  it('infers yearly canceledEndAt when currentPeriodEnd equals start', async () => {
    const start = new Date('2026-10-19T16:10:59.122Z');
    state.sub = {
      userId: 'u1',
      subscriptionNo: '87895842620678901',
      subscriptionId: 'ORD_x',
      paymentProvider: 'stripe',
      productId: 'lite_yearly',
      status: 'active',
      interval: 'year',
      intervalCount: 1,
      currentPeriodStart: start,
      currentPeriodEnd: start,
      pendingChangeType: null,
      providerScheduleId: null,
    };

    const res = await cancelUserSubscription({
      userId: 'u1',
      subscriptionNo: '87895842620678901',
    });

    expect(state.updates[0].status).toBe('pending_cancel');
    expect(new Date(state.updates[0].canceledEndAt).toISOString()).toBe(
      '2027-10-19T16:10:59.122Z'
    );
    expect(new Date(state.updates[0].currentPeriodEnd).toISOString()).toBe(
      '2027-10-19T16:10:59.122Z'
    );
    expect(res.status).toBe('pending_cancel');
  });
});
