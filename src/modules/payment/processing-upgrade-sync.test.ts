import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  resetProcessingUpgradeThrottle,
  syncLapsedRenewal,
  syncProcessingUpgrade,
  syncScheduledPlanChange,
} from './processing-upgrade-sync';

/**
 * syncProcessingUpgrade: a stuck Waffo / Creem / Dodo / Stripe upgrade is checked with the
 * provider and the answer goes through the webhook code paths (mocked).
 */
const state = vi.hoisted(() => ({
  sub: {} as Record<string, any>,
  order: null as Record<string, any> | null,
  waffoStatus: { state: 'none' } as Record<string, any>,
  creemSession: {} as Record<string, any>,
  renewalSession: null as Record<string, any> | null,
  renewalError: null as Error | null,
  calls: [] as string[],
}));

const CLEARED = {
  pendingProductId: null,
  pendingEffectiveAt: null,
  pendingChangeType: null,
  providerScheduleId: null,
};

vi.mock('@/modules/subscriptions/service', () => ({
  findBySubscriptionNo: async () => ({ ...state.sub }),
  updateBySubscriptionNo: async (_no: string, patch: Record<string, any>) => {
    state.calls.push('clear');
    Object.assign(state.sub, patch);
  },
}));

vi.mock('./waffo-plan-change', () => ({
  findWaffoPlanChangeOrderForBooking: async () => state.order,
  findSubscriptionOriginOrderNo: async () => 'ord_origin',
}));

vi.mock('./waffo-plan-change-outcome', () => ({
  applyWaffoPlanChangeOutcome: async (outcome: Record<string, any>) => {
    state.calls.push(`outcome:${outcome.state}`);
    Object.assign(state.sub, CLEARED);
  },
}));

vi.mock('./service', () => ({
  getPaymentManager: async () => ({
    getProvider: (name: string) =>
      name === 'waffo'
        ? {
            name,
            getPlanChangeStatus: async () => {
              state.calls.push('waffo:status');
              return state.waffoStatus;
            },
            getRenewalSession: async (p: { orderRef?: string }) => {
              state.calls.push(`waffo:renewal:${p.orderRef}`);
              return state.renewalSession;
            },
            getSubscription: async () => {
              state.calls.push('waffo:get');
              return state.creemSession;
            },
          }
        : {
            name,
            getSubscription: async () => {
              state.calls.push('creem:get');
              return state.creemSession;
            },
            getRenewalSession: async () => {
              state.calls.push(`${name}:renewal`);
              if (state.renewalError) throw state.renewalError;
              return state.renewalSession;
            },
          },
  }),
  handlePaymentCallback: async (orderNo: string) => {
    state.calls.push(`callback:${orderNo}`);
    Object.assign(state.sub, CLEARED, { status: 'canceled' });
  },
  handleSubscriptionCanceled: async () => {
    state.calls.push('canceled');
    Object.assign(state.sub, { status: 'canceled' });
  },
  handleSubscriptionRenewal: async (session: Record<string, any>) => {
    state.calls.push('renewal');
    Object.assign(state.sub, {
      currentPeriodEnd: session.subscriptionInfo.currentPeriodEnd,
    });
  },
  handleSubscriptionUpdated: async (session: Record<string, any>) => {
    state.calls.push('creem:update');
    if (session.productId === state.sub.pendingProductId) {
      Object.assign(state.sub, CLEARED, { productId: session.productId });
    }
  },
}));

const now = Date.parse('2026-10-19T06:00:00Z');
const booked = (provider: string, extra: Record<string, any> = {}) => ({
  userId: 'u1',
  subscriptionNo: 'sub_1',
  subscriptionId: 'prov_sub_1',
  paymentProvider: provider,
  productId: 'basic_monthly',
  status: 'active',
  pendingProductId: 'pro_monthly',
  pendingChangeType: 'upgrade',
  pendingEffectiveAt: null,
  providerScheduleId: 'waffo_confirmed:ord_2',
  updatedAt: new Date(now - 31 * 60_000),
  ...extra,
});

beforeEach(() => {
  resetProcessingUpgradeThrottle();
  state.calls = [];
  state.order = { orderNo: 'ord_2' };
  state.waffoStatus = { state: 'none' };
  state.creemSession = {};
  state.renewalSession = null;
  state.renewalError = null;
});

describe('syncProcessingUpgrade', () => {
  it('waits 30 minutes unless forced', async () => {
    state.sub = booked('waffo', { updatedAt: new Date(now - 60_000) });
    expect(
      (await syncProcessingUpgrade({ ...state.sub } as any, { now })).state
    ).toBe('idle');
    expect(state.calls).toEqual([]);
    const forced = await syncProcessingUpgrade({ ...state.sub } as any, {
      now,
      force: true,
    });
    expect(forced.state).toBe('pending');
  });

  it('asks at most once a minute per subscription', async () => {
    state.sub = booked('waffo');
    await syncProcessingUpgrade({ ...state.sub } as any, { now });
    const again = await syncProcessingUpgrade({ ...state.sub } as any, {
      now: now + 30_000,
      force: true,
    });
    expect(again.state).toBe('throttled');
    expect(state.calls.filter((c) => c === 'waffo:status')).toHaveLength(1);
    const later = await syncProcessingUpgrade({ ...state.sub } as any, {
      now: now + 61_000,
      force: true,
    });
    expect(later.state).toBe('pending');
  });

  it('Waffo applied → fulfilled through the payment callback', async () => {
    state.sub = booked('waffo');
    state.waffoStatus = { state: 'applied' };
    const res = await syncProcessingUpgrade({ ...state.sub } as any, { now });
    expect(res.state).toBe('applied');
    expect(state.calls).toContain('callback:ord_2');
  });

  it('Waffo failed → booking dropped like plan_change_failed', async () => {
    state.sub = booked('waffo');
    state.waffoStatus = { state: 'failed', providerOrderId: 'ord_2_prov' };
    const res = await syncProcessingUpgrade({ ...state.sub } as any, { now });
    expect(res.state).toBe('failed');
    expect(state.calls).toContain('outcome:failed');
    expect(state.sub.pendingProductId).toBeNull();
  });

  it('Waffo order not traceable → unavailable, nothing changed', async () => {
    state.sub = booked('waffo');
    state.order = null;
    const res = await syncProcessingUpgrade({ ...state.sub } as any, { now });
    expect(res).toEqual({ state: 'unavailable', detail: 'order_not_found' });
    expect(state.sub.pendingProductId).toBe('pro_monthly');
  });

  it('Creem shows the new product → applied via subscription.update', async () => {
    state.sub = booked('creem', {
      pendingEffectiveAt: new Date(now + 3_600_000),
    });
    state.creemSession = { productId: 'pro_monthly' };
    const res = await syncProcessingUpgrade({ ...state.sub } as any, { now });
    expect(res.state).toBe('applied');
    expect(state.calls).toEqual(['creem:get', 'creem:update']);
  });

  it('Creem still on the old product → pending', async () => {
    state.sub = booked('creem', {
      pendingEffectiveAt: new Date(now + 3_600_000),
    });
    state.creemSession = { productId: 'basic_monthly' };
    const res = await syncProcessingUpgrade({ ...state.sub } as any, { now });
    expect(res.state).toBe('pending');
  });

  it('Dodo prorated charge paid → applied via subscription.plan_changed', async () => {
    state.sub = booked('dodo', {
      providerScheduleId: null,
      pendingEffectiveAt: new Date(now + 3_600_000),
      updatedAt: new Date(now - 60_000),
    });
    state.creemSession = { productId: 'pro_monthly' };
    const res = await syncProcessingUpgrade({ ...state.sub } as any, {
      now,
      force: true,
    });
    expect(res.state).toBe('applied');
    expect(state.calls).toEqual(['creem:get', 'creem:update']);
  });

  it('Stripe prorated invoice paid → applied via subscription.updated', async () => {
    state.sub = booked('stripe', {
      providerScheduleId: null,
      pendingEffectiveAt: new Date(now + 3_600_000),
    });
    state.creemSession = {
      productId: 'pro_monthly',
      subscriptionResult: { pending_update: null },
    };
    const res = await syncProcessingUpgrade({ ...state.sub } as any, {
      now,
      force: true,
    });
    expect(res.state).toBe('applied');
    expect(state.calls).toEqual(['creem:get', 'creem:update']);
  });

  it('Stripe still holding a pending_update → pending, booking kept', async () => {
    state.sub = booked('stripe', {
      providerScheduleId: null,
      pendingEffectiveAt: new Date(now + 3_600_000),
    });
    state.creemSession = {
      productId: 'basic_monthly',
      subscriptionResult: { pending_update: { expires_at: 1 } },
    };
    const res = await syncProcessingUpgrade({ ...state.sub } as any, {
      now,
      force: true,
    });
    expect(res.state).toBe('pending');
    expect(state.sub.pendingProductId).toBe('pro_monthly');
  });

  it('Stripe dropped the update (no pending_update, old price) → failed', async () => {
    state.sub = booked('stripe', {
      providerScheduleId: null,
      pendingEffectiveAt: new Date(now + 3_600_000),
    });
    state.creemSession = {
      productId: 'basic_monthly',
      subscriptionResult: { pending_update: null },
    };
    const res = await syncProcessingUpgrade({ ...state.sub } as any, {
      now,
      force: true,
    });
    expect(res).toEqual({ state: 'failed', detail: 'no_pending_update' });
    expect(state.sub.pendingProductId).toBeNull();
  });

  it('a provider without a status lookup is not queried', async () => {
    state.sub = booked('paypal', {
      pendingEffectiveAt: new Date(now + 3_600_000),
    });
    const res = await syncProcessingUpgrade({ ...state.sub } as any, {
      now,
      force: true,
    });
    expect(res.state).toBe('unsupported');
    expect(state.calls).toEqual([]);
  });
});

describe('syncScheduledPlanChange (Waffo period-end downgrade, webhook lost)', () => {
  const effectiveAt = new Date(now - 60_000);
  const downgrade = (extra: Record<string, any> = {}) =>
    booked('waffo', {
      productId: 'pro_monthly',
      pendingProductId: 'lite_monthly',
      pendingChangeType: 'downgrade',
      pendingEffectiveAt: effectiveAt,
      currentPeriodEnd: effectiveAt,
      providerScheduleId: 'ORD_new_1',
      ...extra,
    });

  it('before the effective time: no provider call', async () => {
    state.sub = downgrade({ pendingEffectiveAt: new Date(now + 60_000) });
    const res = await syncScheduledPlanChange({ ...state.sub } as any, { now });
    expect(res.state).toBe('idle');
    expect(state.calls).toEqual([]);
  });

  it('past the effective time, Waffo applied → fulfilled like plan_changed', async () => {
    state.sub = downgrade();
    state.waffoStatus = { state: 'applied', providerOrderId: 'ORD_new_1' };
    const res = await syncScheduledPlanChange({ ...state.sub } as any, { now });
    expect(res.state).toBe('applied');
    expect(state.calls).toEqual(['waffo:status', 'callback:ord_2']);
    expect(state.sub.pendingProductId).toBeNull();
  });

  it('Waffo not switched yet (scheduled) → nothing changes, notice stays', async () => {
    state.sub = downgrade();
    state.waffoStatus = { state: 'scheduled', providerOrderId: 'ORD_new_1' };
    const res = await syncScheduledPlanChange({ ...state.sub } as any, { now });
    expect(res.state).toBe('pending');
    expect(state.calls).toEqual(['waffo:status']);
    expect(state.sub.pendingProductId).toBe('lite_monthly');
    expect(state.sub.productId).toBe('pro_monthly');
  });

  it('falls back to the period end when no effective time was stored', async () => {
    state.sub = downgrade({ pendingEffectiveAt: null });
    await syncScheduledPlanChange({ ...state.sub } as any, { now });
    expect(state.calls).toEqual(['waffo:status']);
  });

  it('billing loads ask at most once a minute; force (renewal) skips it', async () => {
    state.sub = downgrade();
    await syncScheduledPlanChange({ ...state.sub } as any, { now });
    const again = await syncScheduledPlanChange({ ...state.sub } as any, {
      now: now + 10_000,
    });
    expect(again.state).toBe('throttled');
    await syncScheduledPlanChange({ ...state.sub } as any, {
      now: now + 10_000,
      force: true,
    });
    expect(state.calls.filter((c) => c === 'waffo:status')).toHaveLength(2);
  });

  it('plan-change order not traceable → unavailable, booking kept', async () => {
    state.sub = downgrade();
    state.order = null;
    const res = await syncScheduledPlanChange({ ...state.sub } as any, { now });
    expect(res.state).toBe('unavailable');
    expect(state.sub.pendingProductId).toBe('lite_monthly');
  });

  it('Stripe / Dodo / Creem bookings are not queried here', async () => {
    for (const provider of ['stripe', 'dodo', 'creem']) {
      state.sub = downgrade({ paymentProvider: provider });
      const res = await syncScheduledPlanChange({ ...state.sub } as any, {
        now,
        force: true,
      });
      expect(res.state).toBe('idle');
    }
    expect(state.calls).toEqual([]);
  });
});

describe('syncLapsedRenewal (Stripe / Dodo renewal webhook lost)', () => {
  const ended = new Date(now - 2 * 60 * 60_000);
  const nextEnd = new Date(now + 28 * 86_400_000);
  const lapsed = (provider: string, extra: Record<string, any> = {}) => ({
    userId: 'u1',
    subscriptionNo: 'sub_1',
    subscriptionId: 'prov_sub_1',
    paymentProvider: provider,
    productId: 'pro_monthly',
    status: 'active',
    currentPeriodEnd: ended,
    ...extra,
  });
  const renewed = {
    subscriptionId: 'prov_sub_1',
    subscriptionInfo: { currentPeriodStart: ended, currentPeriodEnd: nextEnd },
  };

  it('within the grace after period end: no provider call', async () => {
    state.sub = lapsed('stripe', { currentPeriodEnd: new Date(now - 60_000) });
    const res = await syncLapsedRenewal({ ...state.sub } as any, { now });
    expect(res.state).toBe('idle');
    expect(state.calls).toEqual([]);
  });

  it('an ending subscription (pending_cancel) is not expected to renew', async () => {
    state.sub = lapsed('dodo', { status: 'pending_cancel' });
    const res = await syncLapsedRenewal({ ...state.sub } as any, { now });
    expect(res.state).toBe('idle');
    expect(state.calls).toEqual([]);
  });

  it('provider has not renewed yet → pending, nothing recorded', async () => {
    state.sub = lapsed('stripe');
    const res = await syncLapsedRenewal({ ...state.sub } as any, { now });
    expect(res).toEqual({ state: 'pending', detail: 'not_renewed' });
    expect(state.calls).toEqual(['stripe:renewal', 'creem:get']);
  });

  it('paid renewal found → replayed through handleSubscriptionRenewal', async () => {
    for (const provider of ['stripe', 'dodo']) {
      resetProcessingUpgradeThrottle();
      state.calls = [];
      state.sub = lapsed(provider);
      state.renewalSession = renewed;
      const res = await syncLapsedRenewal({ ...state.sub } as any, { now });
      expect(res.state).toBe('applied');
      expect(state.calls).toEqual([`${provider}:renewal`, 'renewal']);
    }
  });

  it('asks at most once a minute per subscription; force skips it', async () => {
    state.sub = lapsed('dodo');
    await syncLapsedRenewal({ ...state.sub } as any, { now });
    expect(
      (await syncLapsedRenewal({ ...state.sub } as any, { now: now + 5_000 }))
        .state
    ).toBe('throttled');
    await syncLapsedRenewal({ ...state.sub } as any, {
      now: now + 5_000,
      force: true,
    });
    expect(state.calls.filter((c) => c === 'dodo:renewal')).toHaveLength(2);
  });

  it('provider error → unavailable, never throws', async () => {
    state.sub = lapsed('stripe');
    state.renewalError = new Error('stripe down');
    const res = await syncLapsedRenewal({ ...state.sub } as any, { now });
    expect(res.state).toBe('unavailable');
  });

  it('canceled at the provider → the cancel handler, no renewal', async () => {
    state.sub = lapsed('dodo');
    state.creemSession = { subscriptionInfo: { status: 'expired' } };
    const res = await syncLapsedRenewal({ ...state.sub } as any, { now });
    expect(res).toEqual({ state: 'applied', detail: 'ended' });
    expect(state.calls).toEqual(['dodo:renewal', 'creem:get', 'canceled']);
  });

  it('Waffo: asks for the renewal by the order that started it', async () => {
    state.sub = lapsed('waffo');
    const res = await syncLapsedRenewal({ ...state.sub } as any, { now });
    expect(res).toEqual({ state: 'pending', detail: 'not_renewed' });
    expect(state.calls).toEqual(['waffo:renewal:ord_origin', 'waffo:get']);
  });

  it('Waffo with a booked change: an ended origin order is not a cancel', async () => {
    state.sub = lapsed('waffo', {
      pendingProductId: 'lite_monthly',
      pendingChangeType: 'downgrade',
    });
    state.creemSession = { subscriptionInfo: { status: 'canceled' } };
    const res = await syncLapsedRenewal({ ...state.sub } as any, { now });
    expect(res.state).toBe('pending');
    expect(state.calls).toEqual(['waffo:renewal:ord_origin']);
    expect(state.sub.status).toBe('active');
  });

  it('PayPal is not asked here', async () => {
    state.sub = lapsed('paypal');
    const res = await syncLapsedRenewal({ ...state.sub } as any, { now });
    expect(res.state).toBe('idle');
    expect(state.calls).toEqual([]);
  });
});
