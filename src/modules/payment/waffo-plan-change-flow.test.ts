import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Waffo downgrade flow in plan-change-service: opening the confirm page
 * books nothing, reopening supersedes, discard, legacy self-heal, and no
 * undo once confirmed.
 */
const state = vi.hoisted(() => ({
  sub: {} as Record<string, any>,
  orders: [] as Record<string, any>[],
  seq: 0,
  sessions: 0,
  configLoads: 0,
  managerArgs: [] as unknown[],
}));

vi.mock('@/core/db', async () => {
  const schema = await import('@/config/db/schema');
  const fake: any = {
    insert: (table: any) => ({
      values: async (values: Record<string, any>) => {
        if (table === schema.order) {
          state.orders.push({
            ...values,
            createdAt: new Date(Date.now() + state.seq++),
          });
        }
        return { rowsAffected: 1 };
      },
    }),
  };
  return { db: () => fake };
});

vi.mock('./waffo-plan-change', () => ({
  listRecentWaffoPlanChangeOrders: async () =>
    state.orders.map((o) => ({ ...o })),
  findOrderByOrderNo: async (orderNo: string) => {
    const o = state.orders.find((x) => x.orderNo === orderNo);
    return o ? { ...o } : null;
  },
  updateWaffoPlanChangeMarker: async (
    row: any,
    patch: any,
    status?: string
  ) => {
    const o = state.orders.find((x) => x.id === row.id)!;
    const info = JSON.parse(o.checkoutInfo);
    info.planChange = { ...info.planChange, ...patch };
    o.checkoutInfo = JSON.stringify(info);
    if (status) o.status = status;
  },
  markWaffoPlanChangeOrdersSuperseded: async (rows: any[]) => {
    for (const r of rows) {
      const o = state.orders.find((x) => x.id === r.id);
      if (!o || o.status !== 'created') continue;
      const info = JSON.parse(o.checkoutInfo);
      info.planChange.superseded = true;
      o.status = 'canceled';
      o.checkoutInfo = JSON.stringify(info);
    }
  },
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

vi.mock('@/modules/config/service', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  getAllConfigs: async () => (
    state.configLoads++,
    {
      app_url: 'https://app.example.com',
      waffo_product_ids_mapping: JSON.stringify({
        lite_monthly: 'PROD_lite_m',
        lite_yearly: 'PROD_lite_y',
        pro_monthly: 'PROD_pro_m',
        pro_yearly: 'PROD_pro_y',
      }),
    }
  ),
}));

const provider = {
  name: 'waffo',
  changeSubscriptionPlan: vi.fn(async () => {
    state.sessions++;
    return {
      status: 'confirm_required',
      confirmUrl: `https://checkout.waffo.test/s/${state.sessions}#token=secret`,
      sessionId: `cs_${state.sessions}`,
    };
  }),
  cancelScheduledPlanChange: vi.fn(),
  getPlanChangeStatus: vi.fn(
    async (_p: { orderNo: string }): Promise<any> => ({ state: 'none' })
  ),
};

vi.mock('./service', () => ({
  getPaymentManager: async (preloaded?: unknown) => {
    state.managerArgs.push(preloaded);
    return { getProvider: () => provider };
  },
  applySubscriptionPlan: vi.fn(),
}));

// Booked period-end change past its effective time: billing asks Waffo.
const scheduledSync = vi.hoisted(() =>
  vi.fn(async (_sub: any): Promise<{ state: string }> => ({ state: 'idle' }))
);
const lapsedSync = vi.hoisted(() =>
  vi.fn(async (_sub: any): Promise<{ state: string }> => ({ state: 'idle' }))
);
vi.mock('./processing-upgrade-sync', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  syncScheduledPlanChange: scheduledSync,
  syncLapsedRenewal: lapsedSync,
}));

const {
  cancelUserPlanChange,
  changeUserSubscriptionPlan,
  discardAwaitingPlanChange,
  clearLocalPendingChange,
  getCurrentSubscriptionView,
  PLAN_CHANGE_ERRORS,
  PlanChangeError,
  syncAwaitingPlanChange,
} = await import('./plan-change-service');

const periodEnd = new Date('2026-11-11T00:00:00Z');

beforeEach(() => {
  state.sub = {
    subscriptionNo: 'SUB-W',
    subscriptionId: 'WAFFO-ORDER-1',
    userId: 'u1',
    userEmail: 'a@b.c',
    status: 'active',
    paymentProvider: 'waffo',
    productId: 'pro_monthly',
    currency: 'usd',
    currentPeriodEnd: periodEnd,
    pendingProductId: null,
    pendingEffectiveAt: null,
    pendingChangeType: null,
    providerScheduleId: null,
  };
  state.orders = [];
  state.sessions = 0;
  state.configLoads = 0;
  state.managerArgs = [];
  provider.changeSubscriptionPlan.mockClear();
  scheduledSync.mockReset();
  scheduledSync.mockImplementation(async () => ({ state: 'idle' }));
  lapsedSync.mockReset();
  lapsedSync.mockImplementation(async () => ({ state: 'idle' }));
});

const downgrade = (productId = 'lite_monthly') =>
  changeUserSubscriptionPlan({ userId: 'u1', productId, locale: 'zh' });

describe('Waffo downgrade awaiting confirmation', () => {
  it('opening the confirm page books nothing, only a created order', async () => {
    const outcome = await downgrade();
    expect(outcome).toMatchObject({ mode: 'confirm', timing: 'period_end' });
    expect(state.sub.pendingProductId).toBeNull();
    expect(state.sub.pendingChangeType).toBeNull();
    expect(state.orders).toHaveLength(1);
    expect(state.orders[0]).toMatchObject({
      status: 'created',
      productId: 'lite_monthly',
    });
    // token is not persisted
    expect(state.orders[0].checkoutUrl).not.toContain('token');

    const view = await getCurrentSubscriptionView('u1');
    expect(view?.awaiting_confirmation).toMatchObject({
      product_id: 'lite_monthly',
      timing: 'period_end',
    });
  });

  it('clicking again (same or other plan) is not blocked and supersedes the old session', async () => {
    await downgrade('lite_monthly');
    const again = await downgrade('lite_monthly');
    expect(again.mode).toBe('confirm');
    const other = await downgrade('lite_yearly');
    expect(other.mode).toBe('confirm');

    expect(state.orders.map((o) => o.status)).toEqual([
      'canceled',
      'canceled',
      'created',
    ]);
    expect(JSON.parse(state.orders[0].checkoutInfo).planChange.superseded).toBe(
      true
    );
    const view = await getCurrentSubscriptionView('u1');
    expect(view?.awaiting_confirmation?.product_id).toBe('lite_yearly');
  });

  it('discard supersedes the unconfirmed order without a provider call', async () => {
    await downgrade();
    provider.changeSubscriptionPlan.mockClear();
    await discardAwaitingPlanChange({ userId: 'u1' });
    expect(provider.changeSubscriptionPlan).not.toHaveBeenCalled();
    expect(state.orders[0].status).toBe('canceled');
    const view = await getCurrentSubscriptionView('u1');
    expect(view?.awaiting_confirmation).toBeNull();
  });

  it('heals a booking written before confirmation by older builds', async () => {
    await downgrade();
    Object.assign(state.sub, {
      pendingProductId: 'lite_monthly',
      pendingEffectiveAt: periodEnd,
      pendingChangeType: 'downgrade',
      providerScheduleId: state.orders[0].orderNo,
    });
    const view = await getCurrentSubscriptionView('u1');
    expect(state.sub.pendingProductId).toBeNull();
    expect(view?.awaiting_confirmation?.product_id).toBe('lite_monthly');
    // and re-clicking works
    expect((await downgrade('lite_yearly')).mode).toBe('confirm');
  });
});

describe('Waffo downgrade confirmed', () => {
  beforeEach(() => {
    Object.assign(state.sub, {
      status: 'pending_cancel',
      pendingProductId: 'lite_monthly',
      pendingEffectiveAt: periodEnd,
      pendingChangeType: 'downgrade',
    });
  });

  it('cannot be undone', async () => {
    await expect(cancelUserPlanChange({ userId: 'u1' })).rejects.toThrow(
      PLAN_CHANGE_ERRORS.notUndoable
    );
    expect(state.sub.pendingProductId).toBe('lite_monthly');
  });

  it('no awaiting state is shown', async () => {
    state.orders.push({
      id: 'x',
      orderNo: 'ORD-x',
      productId: 'lite_monthly',
      status: 'created',
      createdAt: new Date(),
      checkoutInfo: JSON.stringify({
        planChange: { fromSubscriptionNo: 'SUB-W', timing: 'period_end' },
      }),
    });
    const view = await getCurrentSubscriptionView('u1');
    expect(view?.awaiting_confirmation).toBeNull();
    expect(view?.pendingProductId).toBe('lite_monthly');
  });
});

describe('plan change request cost', () => {
  it('loads configs once and reuses them for the payment manager', async () => {
    await downgrade();
    expect(state.configLoads).toBe(1);
    expect(state.managerArgs).toHaveLength(1);
    expect(state.managerArgs[0]).toMatchObject({
      app_url: 'https://app.example.com',
    });
    expect(provider.changeSubscriptionPlan).toHaveBeenCalledTimes(1);
  });

  it('keeps the previous attempt when Waffo fails to create a session', async () => {
    await downgrade();
    provider.changeSubscriptionPlan.mockImplementationOnce(async () => {
      throw new Error('Waffo did not respond within 15s. Please try again.');
    });
    await expect(downgrade('lite_yearly')).rejects.toThrow(/did not respond/);
    expect(state.orders).toHaveLength(1);
    expect(state.orders[0].status).toBe('created');
    const view = await getCurrentSubscriptionView('u1');
    expect(view?.awaiting_confirmation?.product_id).toBe('lite_monthly');
  });
});

describe('reconcile with Waffo (webhook missing or late)', () => {
  // the per-user throttle is per isolate: use a fresh user per test
  const asUser = (userId: string) => {
    state.sub.userId = userId;
    return (productId = 'lite_monthly') =>
      changeUserSubscriptionPlan({ userId, productId, locale: 'zh' });
  };

  it('books the change once Waffo reports it confirmed', async () => {
    await asUser('sync-1')();
    const orderNo = state.orders[0].orderNo;
    provider.getPlanChangeStatus.mockImplementationOnce(async (p) => {
      expect(p.orderNo).toBe(orderNo);
      return { state: 'scheduled', providerOrderId: 'ORD_newWaffo' };
    });
    const { view, sync } = await syncAwaitingPlanChange('sync-1');
    expect(sync).toBe('confirmed');
    expect(view).toMatchObject({
      pendingProductId: 'lite_monthly',
      pendingChangeType: 'downgrade',
      providerScheduleId: 'ORD_newWaffo',
      awaiting_confirmation: null,
    });
    expect(state.sub.pendingEffectiveAt).toEqual(periodEnd);
    // confirmed booking is not "healed" away as a legacy one
    expect((await getCurrentSubscriptionView('sync-1'))?.pendingProductId).toBe(
      'lite_monthly'
    );
  });

  it('origin canceling without the new order id still books (and sticks)', async () => {
    await asUser('sync-5')();
    const orderNo = state.orders[0].orderNo;
    provider.getPlanChangeStatus.mockImplementationOnce(async (p: any) => {
      expect(p.originOrderId).toBe('WAFFO-ORDER-1');
      return { state: 'scheduled', originStatus: 'canceling' };
    });
    const { sync, report } = await syncAwaitingPlanChange('sync-5');
    expect(sync).toBe('confirmed');
    expect(report[0]).toMatchObject({ orderNo, originStatus: 'canceling' });
    expect(state.sub).toMatchObject({
      pendingProductId: 'lite_monthly',
      providerScheduleId: `waffo_confirmed:${orderNo}`,
    });
    expect((await getCurrentSubscriptionView('sync-5'))?.pendingProductId).toBe(
      'lite_monthly'
    );
  });

  it('keeps awaiting while Waffo has nothing yet', async () => {
    await asUser('sync-2')();
    const { view, sync } = await syncAwaitingPlanChange('sync-2');
    expect(sync).toBe('pending');
    expect(view?.awaiting_confirmation).toMatchObject({
      product_id: 'lite_monthly',
    });
    expect(state.sub.pendingProductId).toBeNull();
  });

  it('reports unavailable when Waffo errors, without booking', async () => {
    await asUser('sync-3')();
    provider.getPlanChangeStatus.mockRejectedValueOnce(new Error('timeout'));
    const { sync } = await syncAwaitingPlanChange('sync-3');
    expect(sync).toBe('unavailable');
    expect(state.sub.pendingProductId).toBeNull();
  });

  it('idle without an awaiting change (no provider call)', async () => {
    state.sub.userId = 'sync-4';
    provider.getPlanChangeStatus.mockClear();
    const { sync } = await syncAwaitingPlanChange('sync-4');
    expect(sync).toBe('idle');
    expect(provider.getPlanChangeStatus).not.toHaveBeenCalled();
  });
});

describe('heal confirmed-but-unbooked immediate upgrade', () => {
  it('books pending upgrade from a confirmed open order', async () => {
    state.sub.productId = 'lite_monthly';
    state.orders.push({
      id: 'upg',
      orderNo: 'ORD-upg',
      productId: 'pro_monthly',
      status: 'created',
      createdAt: new Date(),
      checkoutInfo: JSON.stringify({
        planChange: {
          fromSubscriptionNo: 'SUB-W',
          timing: 'immediate',
          confirmedOrderId: 'ORD_newPro',
          confirmedAt: new Date().toISOString(),
        },
      }),
    });
    const view = await getCurrentSubscriptionView('u1');
    expect(view).toMatchObject({
      pendingProductId: 'pro_monthly',
      pendingChangeType: 'upgrade',
      providerScheduleId: 'ORD_newPro',
      awaiting_confirmation: null,
    });
    // Applies when the new order activates: no made-up period-end date.
    expect(view?.pendingEffectiveAt).toBeNull();
  });

  it('clears a change that was booked again after the customer canceled', async () => {
    state.sub.status = 'pending_cancel';
    state.sub.canceledReasonType = 'user_request';
    state.sub.pendingProductId = 'lite_monthly';
    state.sub.pendingChangeType = 'downgrade';
    state.sub.providerScheduleId = 'ORD_newLite';
    state.orders.push({
      id: 'stuck',
      orderNo: 'ORD-stuck',
      productId: 'lite_monthly',
      status: 'created',
      createdAt: new Date(),
      checkoutInfo: JSON.stringify({
        planChange: {
          fromSubscriptionNo: 'SUB-W',
          timing: 'period_end',
          confirmedOrderId: 'ORD_newLite',
          confirmedAt: new Date().toISOString(),
        },
      }),
    });
    const view = await getCurrentSubscriptionView('u1');
    expect(view?.pendingProductId).toBeNull();
    expect(view?.pendingChangeType).toBeNull();
    expect(state.orders[0].status).toBe('canceled');
    expect(JSON.parse(state.orders[0].checkoutInfo).planChange.failed).toBe(
      true
    );
  });

  it('does not book a cleared Waffo upgrade back on the next billing load', async () => {
    state.sub.pendingProductId = 'pro_monthly';
    state.sub.pendingChangeType = 'upgrade';
    state.sub.providerScheduleId = 'ORD_newPro';
    state.orders.push({
      id: 'upg',
      orderNo: 'ORD-upg',
      productId: 'pro_monthly',
      status: 'created',
      createdAt: new Date(),
      checkoutInfo: JSON.stringify({
        planChange: {
          fromSubscriptionNo: 'SUB-W',
          timing: 'immediate',
          confirmedOrderId: 'ORD_newPro',
          confirmedAt: new Date().toISOString(),
        },
      }),
    });
    await clearLocalPendingChange(
      state.sub as { userId: string; subscriptionNo: string }
    );
    const view = await getCurrentSubscriptionView('u1');
    expect(view?.pendingProductId).toBeNull();
    expect(view?.pendingChangeType).toBeNull();
    expect(state.orders[0].status).toBe('canceled');
    expect(JSON.parse(state.orders[0].checkoutInfo).planChange.failed).toBe(
      true
    );
  });

  it('does not rebook a change the customer already canceled', async () => {
    state.sub.status = 'pending_cancel';
    state.sub.canceledReasonType = 'user_request';
    state.orders.push({
      id: 'dropped',
      orderNo: 'ORD-dropped',
      productId: 'lite_monthly',
      status: 'created',
      createdAt: new Date(),
      checkoutInfo: JSON.stringify({
        planChange: {
          fromSubscriptionNo: 'SUB-W',
          timing: 'period_end',
          confirmedOrderId: 'ORD_newLite',
          confirmedAt: new Date().toISOString(),
        },
      }),
    });
    const view = await getCurrentSubscriptionView('u1');
    expect(view?.pendingProductId).toBeNull();
    expect(view?.pendingChangeType).toBeNull();
  });
});

describe('intent by tier + interval (Waffo)', () => {
  const liteYearly = () =>
    Object.assign(state.sub, {
      productId: 'lite_yearly',
      amount: 10680,
      currentPeriodEnd: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000),
    });
  const lastTiming = () =>
    (provider.changeSubscriptionPlan.mock.calls.at(-1) as any)?.[0]?.timing;

  it('Lite yearly → Pro monthly asks for a choice (no silent deferral, no provider call)', async () => {
    liteYearly();
    const error = await changeUserSubscriptionPlan({
      userId: 'u1',
      productId: 'pro_monthly',
    }).catch((e) => e);
    expect(error).toBeInstanceOf(PlanChangeError);
    expect(error.code).toBe('plan_change_choice_required');
    expect(error.message).toBe(PLAN_CHANGE_ERRORS.choiceRequired);
    expect(error.data).toMatchObject({
      intent: 'upgrade_to_monthly',
      suggested_product_id: 'pro_yearly',
      period_end_supported: true,
      effective_at: state.sub.currentPeriodEnd.toISOString(),
    });
    expect(provider.changeSubscriptionPlan).not.toHaveBeenCalled();
    expect(state.orders).toHaveLength(0);
  });

  it('Lite yearly → Pro monthly, chosen "at period end": next_period confirm page', async () => {
    liteYearly();
    const outcome = await changeUserSubscriptionPlan({
      userId: 'u1',
      productId: 'pro_monthly',
      acceptPeriodEnd: true,
    });
    expect(outcome).toMatchObject({
      mode: 'confirm',
      timing: 'period_end',
      intent: 'upgrade_to_monthly',
      effective_at: state.sub.currentPeriodEnd.toISOString(),
    });
    expect(lastTiming()).toBe('period_end');
  });

  it('Lite yearly → Pro yearly is an immediate upgrade', async () => {
    liteYearly();
    const outcome = await changeUserSubscriptionPlan({
      userId: 'u1',
      productId: 'pro_yearly',
    });
    expect(outcome).toMatchObject({
      mode: 'confirm',
      timing: 'immediate',
      intent: 'upgrade',
    });
    expect(lastTiming()).toBe('immediate');
  });

  it('Pro monthly → Lite yearly is booked for period end (no full-year charge now)', async () => {
    Object.assign(state.sub, { productId: 'pro_monthly', amount: 1990 });
    const outcome = await changeUserSubscriptionPlan({
      userId: 'u1',
      productId: 'lite_yearly',
    });
    expect(outcome).toMatchObject({
      mode: 'confirm',
      timing: 'period_end',
      intent: 'downgrade_to_yearly',
    });
    expect(lastTiming()).toBe('period_end');
  });

  it('blocks a change during a trial (Waffo 409)', async () => {
    Object.assign(state.sub, { status: 'trialing', productId: 'lite_monthly' });
    await expect(
      changeUserSubscriptionPlan({ userId: 'u1', productId: 'pro_monthly' })
    ).rejects.toMatchObject({ code: 'plan_change_trial' });
    expect(provider.changeSubscriptionPlan).not.toHaveBeenCalled();
  });

  it('blocks an immediate change within 24h of renewal (Waffo 400)', async () => {
    Object.assign(state.sub, {
      productId: 'pro_monthly',
      amount: 1990,
      currentPeriodEnd: new Date(Date.now() + 2 * 60 * 60 * 1000),
    });
    await expect(
      changeUserSubscriptionPlan({ userId: 'u1', productId: 'pro_yearly' })
    ).rejects.toMatchObject({ code: 'plan_change_too_close_to_renewal' });
    // a period-end change only needs 1h
    const outcome = await changeUserSubscriptionPlan({
      userId: 'u1',
      productId: 'lite_monthly',
    });
    expect(outcome).toMatchObject({ mode: 'confirm', timing: 'period_end' });
  });
});

describe('Waffo change confirmed on Waffo but webhook missed (origin canceling)', () => {
  const setup = (userId: string) =>
    Object.assign(state.sub, {
      userId,
      productId: 'lite_yearly',
      amount: 10680,
      currentPeriodEnd: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000),
    });

  it('records the confirmed booking and reports it instead of opening a link Waffo rejects', async () => {
    setup('recon-1');
    // earlier attempt: monthly at period end, opened on Waffo (and confirmed there)
    await changeUserSubscriptionPlan({
      userId: 'recon-1',
      productId: 'pro_monthly',
      acceptPeriodEnd: true,
    });
    provider.changeSubscriptionPlan.mockClear();
    provider.getPlanChangeStatus.mockImplementationOnce(async () => ({
      state: 'scheduled',
      providerOrderId: 'ORD_confirmedOnWaffo',
      originStatus: 'canceling',
    }));
    const error = await changeUserSubscriptionPlan({
      userId: 'recon-1',
      productId: 'pro_yearly',
    }).catch((e) => e);
    expect(error).toBeInstanceOf(PlanChangeError);
    expect(error.code).toBe('plan_change_pending');
    expect(error.message).toBe(PLAN_CHANGE_ERRORS.pendingLocked);
    expect(provider.changeSubscriptionPlan).not.toHaveBeenCalled();
    expect(state.sub).toMatchObject({
      pendingProductId: 'pro_monthly',
      pendingChangeType: 'downgrade',
      providerScheduleId: 'ORD_confirmedOnWaffo',
    });
  });

  it('maps Waffo 409 "Only an active subscription can change plan" to a friendly error', async () => {
    setup('recon-2');
    provider.changeSubscriptionPlan.mockImplementationOnce(async () => {
      throw Object.assign(
        new Error('Only an active subscription can change plan'),
        { status: 409 }
      );
    });
    await expect(
      changeUserSubscriptionPlan({ userId: 'recon-2', productId: 'pro_yearly' })
    ).rejects.toMatchObject({
      code: 'subscription_not_active',
      message: PLAN_CHANGE_ERRORS.notActive,
    });
    expect(state.orders).toHaveLength(0);
  });
});

describe('stored plan-change order never keeps the Waffo customer token', () => {
  it('strips token fields from the stored session response', async () => {
    provider.changeSubscriptionPlan.mockImplementationOnce(async () => ({
      status: 'confirm_required',
      confirmUrl: 'https://checkout.waffo.test/s/9#token=secret',
      sessionId: 'cs_9',
      raw: {
        sessionId: 'cs_9',
        checkoutUrl: 'https://checkout.waffo.test/s/9#token=secret',
        token: 'secret',
      },
    }));
    await downgrade();
    const stored = state.orders.at(-1)!;
    expect(stored.checkoutResult).not.toContain('secret');
    expect(stored.checkoutInfo).not.toContain('secret');
    expect(stored.checkoutUrl).not.toContain('secret');
  });
});

describe('billing load after a booked downgrade took effect (webhook lost)', () => {
  const past = new Date(Date.now() - 60_000);
  beforeEach(() => {
    Object.assign(state.sub, {
      currentPeriodEnd: past,
      pendingProductId: 'lite_monthly',
      pendingEffectiveAt: past,
      pendingChangeType: 'downgrade',
      providerScheduleId: 'ORD_lite',
    });
  });

  it('asks Waffo and shows the new plan once it was applied', async () => {
    scheduledSync.mockImplementation(async () => {
      Object.assign(state.sub, {
        subscriptionNo: 'SUB-LITE',
        productId: 'lite_monthly',
        currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
        pendingProductId: null,
        pendingEffectiveAt: null,
        pendingChangeType: null,
        providerScheduleId: null,
      });
      return { state: 'applied' };
    });
    const view = await getCurrentSubscriptionView('u1');
    expect(scheduledSync).toHaveBeenCalledTimes(1);
    expect(scheduledSync.mock.calls[0][0]).toMatchObject({
      subscriptionNo: 'SUB-W',
    });
    expect(view?.productId).toBe('lite_monthly');
    expect(view?.pendingProductId).toBeNull();
  });

  it('keeps the scheduled notice while Waffo has not switched', async () => {
    scheduledSync.mockImplementation(async () => ({ state: 'pending' }));
    const view = await getCurrentSubscriptionView('u1');
    expect(view?.productId).toBe('pro_monthly');
    expect(view?.pendingProductId).toBe('lite_monthly');
  });

  it('does not ask before the effective time', async () => {
    const later = new Date(Date.now() + 86_400_000);
    Object.assign(state.sub, {
      currentPeriodEnd: later,
      pendingEffectiveAt: later,
    });
    await getCurrentSubscriptionView('u1');
    expect(scheduledSync).not.toHaveBeenCalled();
  });
});

describe('billing load for a Stripe / Dodo renewal whose webhook was lost', () => {
  const ended = new Date(Date.now() - 2 * 60 * 60_000);
  beforeEach(() => {
    Object.assign(state.sub, {
      paymentProvider: 'stripe',
      subscriptionId: 'sub_stripe_1',
      currentPeriodEnd: ended,
    });
  });

  it('replays the renewal and shows the renewed period', async () => {
    const renewedEnd = new Date(Date.now() + 28 * 86_400_000);
    lapsedSync.mockImplementation(async () => {
      state.sub.currentPeriodEnd = renewedEnd;
      return { state: 'applied' };
    });
    const view = await getCurrentSubscriptionView('u1');
    expect(lapsedSync).toHaveBeenCalledTimes(1);
    expect(view?.currentPeriodEnd).toEqual(renewedEnd);
  });

  it('provider unreachable: the page still loads the stored subscription', async () => {
    lapsedSync.mockImplementation(async () => ({ state: 'unavailable' }));
    const view = await getCurrentSubscriptionView('u1');
    expect(view?.subscriptionNo).toBe('SUB-W');
    expect(view?.currentPeriodEnd).toEqual(ended);
  });

  it('does not ask within the grace after the period end', async () => {
    state.sub.currentPeriodEnd = new Date(Date.now() - 10 * 60_000);
    await getCurrentSubscriptionView('u1');
    expect(lapsedSync).not.toHaveBeenCalled();
  });
});
