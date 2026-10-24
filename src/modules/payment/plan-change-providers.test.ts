import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Rule matrix through plan-change-service for the in-place providers
 * (Stripe, Dodo, Creem): which timing reaches the provider, what gets
 * booked locally, and how unsupported branches degrade.
 */
const state = vi.hoisted(() => ({
  sub: {} as Record<string, any>,
  provider: 'stripe',
  applied: [] as any[],
}));

vi.mock('@/core/db', () => ({ db: () => ({}) }));

vi.mock('./waffo-plan-change', () => ({
  listRecentWaffoPlanChangeOrders: async () => [],
  markWaffoPlanChangeOrdersSuperseded: async () => {},
}));

vi.mock('@/modules/subscriptions/service', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  getCurrentSubscription: async () => ({ ...state.sub }),
  findBySubscriptionNo: async () => ({ ...state.sub }),
  updateBySubscriptionNo: async (_no: string, values: any) => {
    Object.assign(state.sub, values);
    return { ...state.sub };
  },
}));

const ids = [
  'lite_monthly',
  'pro_monthly',
  'ultra_monthly',
  'lite_yearly',
  'pro_yearly',
  'ultra_yearly',
];
const mapping = (prefix: string) =>
  JSON.stringify(Object.fromEntries(ids.map((id) => [id, `${prefix}${id}`])));

vi.mock('@/modules/config/service', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  getAllConfigs: async () => ({
    app_url: 'https://app.example.com',
    stripe_price_ids_mapping: mapping('price_'),
    dodo_product_ids_mapping: mapping('pdt_'),
    creem_product_ids_mapping: mapping('prod_'),
  }),
}));

const periodEnd = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000);

const provider = {
  get name() {
    return state.provider;
  },
  changeSubscriptionPlan: vi.fn(async (p: any) =>
    p.timing === 'immediate'
      ? { status: 'applied', subscriptionInfo: {} }
      : { status: 'scheduled', scheduleId: 'sched_1', effectiveAt: periodEnd }
  ),
  cancelSubscription: vi.fn(async () => ({
    subscriptionInfo: {
      status: 'pending_cancel',
      canceledAt: new Date(),
      canceledEndAt: periodEnd,
    },
  })),
};

vi.mock('./service', () => ({
  getPaymentManager: async () => ({ getProvider: () => provider }),
  applySubscriptionPlan: vi.fn(async (p: any) => state.applied.push(p)),
}));

const { changeUserSubscriptionPlan, PlanChangeError } =
  await import('./plan-change-service');

function onPlan(providerName: string, productId: string, extra = {}) {
  state.provider = providerName;
  state.sub = {
    subscriptionNo: 'SUB-1',
    subscriptionId: 'prov_sub_1',
    userId: 'u1',
    status: 'active',
    paymentProvider: providerName,
    productId,
    currency: 'usd',
    currentPeriodEnd: periodEnd,
    pendingProductId: null,
    pendingEffectiveAt: null,
    pendingChangeType: null,
    providerScheduleId: null,
    ...extra,
  };
}

const change = (productId: string, acceptPeriodEnd?: boolean) =>
  changeUserSubscriptionPlan({ userId: 'u1', productId, acceptPeriodEnd });
const sentTiming = () =>
  (provider.changeSubscriptionPlan.mock.calls.at(-1) as any)?.[0]?.timing;

beforeEach(() => {
  provider.changeSubscriptionPlan.mockClear();
  provider.cancelSubscription.mockClear();
  state.applied = [];
});

describe.each(['stripe', 'dodo'])('%s (native schedule)', (name) => {
  const matrix: Array<[string, string, 'immediate' | 'period_end', string]> = [
    ['lite_monthly', 'pro_monthly', 'immediate', 'upgrade'],
    ['pro_monthly', 'lite_monthly', 'period_end', 'downgrade'],
    ['pro_monthly', 'pro_yearly', 'immediate', 'interval_upgrade'],
    ['lite_monthly', 'pro_yearly', 'immediate', 'upgrade'],
    ['pro_yearly', 'pro_monthly', 'period_end', 'interval_downgrade'],
    ['pro_yearly', 'lite_monthly', 'period_end', 'downgrade'],
    ['pro_monthly', 'lite_yearly', 'period_end', 'downgrade_to_yearly'],
  ];

  it.each(matrix)('%s → %s sends %s', async (from, to, timing, intent) => {
    onPlan(name, from);
    const outcome = await change(to);
    expect(sentTiming()).toBe(timing);
    expect(
      (provider.changeSubscriptionPlan.mock.calls.at(-1) as any)[0]
    ).toMatchObject({
      subscriptionId: 'prov_sub_1',
      productId: expect.stringContaining(to),
    });
    if (timing === 'immediate') {
      expect(outcome).toMatchObject({ mode: 'applied', intent });
      expect(state.applied.at(-1)).toMatchObject({ productId: to });
      expect(state.sub.pendingProductId).toBeNull();
    } else {
      expect(outcome).toMatchObject({
        mode: 'scheduled',
        kind: 'switch',
        intent,
      });
      expect(state.applied).toHaveLength(0);
      expect(state.sub).toMatchObject({
        pendingProductId: to,
        pendingChangeType: 'downgrade',
        providerScheduleId: 'sched_1',
      });
    }
  });

  it('Lite yearly → Pro monthly: choice first, then yearly now or monthly at period end', async () => {
    onPlan(name, 'lite_yearly');
    await expect(change('pro_monthly')).rejects.toMatchObject({
      code: 'plan_change_choice_required',
      data: { suggested_product_id: 'pro_yearly', period_end_supported: true },
    });
    expect(provider.changeSubscriptionPlan).not.toHaveBeenCalled();

    const later = await change('pro_monthly', true);
    expect(sentTiming()).toBe('period_end');
    expect(later).toMatchObject({
      mode: 'scheduled',
      intent: 'upgrade_to_monthly',
    });
    expect(state.sub.pendingProductId).toBe('pro_monthly');

    onPlan(name, 'lite_yearly');
    const now = await change('pro_yearly');
    expect(sentTiming()).toBe('immediate');
    expect(now).toMatchObject({ mode: 'applied', intent: 'upgrade' });
  });

  it('books the new plan while the upgrade payment is still confirming', async () => {
    onPlan(name, 'lite_monthly');
    provider.changeSubscriptionPlan.mockResolvedValueOnce({
      status: 'processing',
    } as any);
    const outcome = await change('pro_monthly');
    expect(outcome).toMatchObject({ mode: 'processing', intent: 'upgrade' });
    expect(state.applied).toHaveLength(0);
    expect(state.sub).toMatchObject({
      productId: 'lite_monthly',
      pendingProductId: 'pro_monthly',
      pendingChangeType: 'upgrade',
    });
    // Not a period-end date: the deadline after which an unpaid upgrade is
    // dropped (Stripe discards a pending update within 23 h).
    const left = new Date(state.sub.pendingEffectiveAt).getTime() - Date.now();
    expect(left).toBeGreaterThan(23 * 3600_000);
    expect(left).toBeLessThanOrEqual(24 * 3600_000);
  });

  it('a booked processing upgrade blocks for 24 h, then clears (fake clock)', async () => {
    vi.useFakeTimers({
      toFake: ['Date'],
      now: new Date('2026-10-19T08:00:00Z'),
    });
    try {
      onPlan(name, 'lite_monthly');
      provider.changeSubscriptionPlan.mockResolvedValueOnce({
        status: 'processing',
      } as any);
      await change('pro_monthly');
      vi.setSystemTime(new Date('2026-10-20T07:59:00Z'));
      await expect(change('ultra_monthly')).rejects.toMatchObject({
        code: 'plan_change_pending',
      });
      vi.setSystemTime(new Date('2026-10-20T08:01:00Z'));
      expect(await change('pro_monthly')).toMatchObject({ mode: 'applied' });
      expect(provider.changeSubscriptionPlan).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a failed earlier upgrade (Dodo 409) books nothing and asks to retry', async () => {
    onPlan(name, 'lite_monthly');
    provider.changeSubscriptionPlan.mockResolvedValueOnce({
      status: 'failed',
    } as any);
    await expect(change('pro_monthly')).rejects.toMatchObject({
      code: 'plan_change_previous_incomplete',
    });
    expect(state.applied).toHaveLength(0);
    expect(state.sub).toMatchObject({
      productId: 'lite_monthly',
      pendingProductId: null,
    });
  });

  it('an existing booking blocks another change', async () => {
    onPlan(name, 'pro_monthly', {
      pendingProductId: 'lite_monthly',
      pendingChangeType: 'downgrade',
      pendingEffectiveAt: periodEnd,
    });
    await expect(change('ultra_monthly')).rejects.toMatchObject({
      code: 'plan_change_pending',
    });
    expect(provider.changeSubscriptionPlan).not.toHaveBeenCalled();
  });

  it('an upgrade still unpaid past its deadline is dropped and no longer blocks', async () => {
    onPlan(name, 'lite_monthly', {
      pendingProductId: 'pro_monthly',
      pendingChangeType: 'upgrade',
      pendingEffectiveAt: new Date(Date.now() - 60_000),
    });
    const outcome = await change('pro_monthly');
    expect(outcome).toMatchObject({ mode: 'applied', intent: 'upgrade' });
    expect(provider.changeSubscriptionPlan).toHaveBeenCalledTimes(1);
  });

  it('an upgrade still within its deadline keeps blocking', async () => {
    onPlan(name, 'lite_monthly', {
      pendingProductId: 'pro_monthly',
      pendingChangeType: 'upgrade',
      pendingEffectiveAt: new Date(Date.now() + 3600_000),
    });
    await expect(change('ultra_monthly')).rejects.toMatchObject({
      code: 'plan_change_pending',
    });
    expect(provider.changeSubscriptionPlan).not.toHaveBeenCalled();
  });

  it('a canceling plan: no upgrade or switch, downgrade waits', async () => {
    onPlan(name, 'pro_monthly', {
      status: 'pending_cancel',
      canceledEndAt: periodEnd,
    });
    await expect(change('ultra_monthly')).rejects.toMatchObject({
      code: 'subscription_ending',
    });
    await expect(change('pro_yearly')).rejects.toMatchObject({
      code: 'subscription_ending',
    });
    await expect(change('lite_monthly')).rejects.toMatchObject({
      code: 'downgrade_after_period_end',
    });
    expect(provider.changeSubscriptionPlan).not.toHaveBeenCalled();
  });

  it('no change during a trial', async () => {
    onPlan(name, 'lite_monthly', { status: 'trialing' });
    await expect(change('pro_monthly')).rejects.toBeInstanceOf(PlanChangeError);
    await expect(change('pro_monthly')).rejects.toMatchObject({
      code: 'plan_change_trial',
    });
    expect(provider.changeSubscriptionPlan).not.toHaveBeenCalled();
  });
});

describe('creem (no scheduled switch)', () => {
  it('upgrades apply now through /upgrade', async () => {
    onPlan('creem', 'lite_monthly');
    expect(await change('pro_yearly')).toMatchObject({ mode: 'applied' });
    expect(sentTiming()).toBe('immediate');
  });

  it('period-end branches become a scheduled cancel + resubscribe prompt', async () => {
    for (const [from, to] of [
      ['pro_monthly', 'lite_monthly'],
      ['pro_yearly', 'pro_monthly'],
      ['pro_monthly', 'lite_yearly'],
    ]) {
      onPlan('creem', from);
      const outcome = await change(to);
      expect(outcome).toMatchObject({ mode: 'scheduled', kind: 'resubscribe' });
      expect(provider.changeSubscriptionPlan).not.toHaveBeenCalled();
      expect(state.sub).toMatchObject({
        status: 'pending_cancel',
        pendingProductId: to,
        pendingChangeType: 'resubscribe',
      });
    }
    onPlan('creem', 'lite_yearly');
    expect(await change('pro_monthly', true)).toMatchObject({
      mode: 'scheduled',
      kind: 'resubscribe',
      intent: 'upgrade_to_monthly',
    });
  });
});

describe('checkout-only providers (PayPal etc.)', () => {
  it('upgrades fall back to checkout; period-end branches are refused', async () => {
    onPlan('paypal', 'lite_monthly');
    expect(await change('pro_monthly')).toEqual({ mode: 'checkout' });
    onPlan('paypal', 'pro_monthly');
    await expect(change('lite_monthly')).rejects.toMatchObject({
      code: 'unsupported',
    });
    onPlan('paypal', 'lite_yearly');
    await expect(change('pro_monthly')).rejects.toMatchObject({
      code: 'plan_change_choice_required',
      data: { period_end_supported: false },
    });
  });
});
