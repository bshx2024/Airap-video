import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * applyWaffoPlanChangeOutcome: shared by the plan_change_* webhooks and the
 * billing-page reconciliation. Must book once, be idempotent, survive a
 * missing order number, and drop a booking when Waffo reports failure.
 */
const state = vi.hoisted(() => ({
  sub: {} as Record<string, any>,
  orders: [] as Record<string, any>[],
}));

vi.mock('./waffo-plan-change', () => ({
  listRecentWaffoPlanChangeOrders: async () =>
    state.orders.map((o) => ({ ...o })),
  findOrderByOrderNo: async (orderNo: string) => {
    const o = state.orders.find((x) => x.orderNo === orderNo);
    return o ? { ...o } : null;
  },
  updateWaffoPlanChangeMarker: async (
    row: any,
    patch: Record<string, unknown>,
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
      if (o && o.status === 'created') o.status = 'canceled';
    }
  },
}));

vi.mock('@/modules/subscriptions/service', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  findBySubscriptionNo: async () => ({ ...state.sub }),
  updateBySubscriptionNo: async (_no: string, values: any) => {
    Object.assign(state.sub, values);
    return { ...state.sub };
  },
}));

const { applyWaffoPlanChangeOutcome } =
  await import('./waffo-plan-change-outcome');

const periodEnd = new Date('2026-11-11T00:00:00Z');
const effective = new Date('2026-11-11T00:00:01Z');
const marker = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    planChange: { fromSubscriptionNo: 'SUB-W', timing: 'period_end', ...extra },
  });
const order = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  orderNo: `ORD${id}`,
  userId: 'u1',
  productId: 'lite_monthly',
  status: 'created',
  createdAt: new Date(Date.now() - 60_000),
  checkoutInfo: marker(),
  ...extra,
});

beforeEach(() => {
  state.sub = {
    subscriptionNo: 'SUB-W',
    userId: 'u1',
    status: 'active',
    paymentProvider: 'waffo',
    productId: 'pro_monthly',
    currentPeriodEnd: periodEnd,
    pendingProductId: null,
    pendingEffectiveAt: null,
    pendingChangeType: null,
    providerScheduleId: null,
  };
  state.orders = [];
});

describe('applyWaffoPlanChangeOutcome', () => {
  it('books the scheduled downgrade with Waffo’s new order id', async () => {
    state.orders = [order('a')];
    const result = await applyWaffoPlanChangeOutcome({
      state: 'scheduled',
      providerOrderId: 'ORD_newOrder1',
      orderNo: 'ORDa',
      effectiveAt: effective,
    });
    expect(result).toBe('booked');
    expect(state.sub).toMatchObject({
      pendingProductId: 'lite_monthly',
      pendingEffectiveAt: effective,
      pendingChangeType: 'downgrade',
      providerScheduleId: 'ORD_newOrder1',
      status: 'active', // Waffo sends no canceling for the origin
    });
    const m = JSON.parse(state.orders[0].checkoutInfo).planChange;
    expect(m.confirmedOrderId).toBe('ORD_newOrder1');
    // stays open so the activation at the switch fulfils it
    expect(state.orders[0].status).toBe('created');
  });

  it('is idempotent (webhook + reconciliation, redelivery)', async () => {
    state.orders = [order('a')];
    const args = {
      state: 'scheduled' as const,
      providerOrderId: 'ORD_newOrder1',
      orderNo: 'ORDa',
    };
    await applyWaffoPlanChangeOutcome(args);
    expect(state.sub.pendingEffectiveAt).toEqual(periodEnd);
    expect(
      await applyWaffoPlanChangeOutcome({ ...args, effectiveAt: effective })
    ).toBe('already_booked');
    expect(state.sub.pendingEffectiveAt).toEqual(effective);
  });

  it('finds the attempt by buyer identity when the order number is missing', async () => {
    state.orders = [order('a')];
    const result = await applyWaffoPlanChangeOutcome({
      state: 'scheduled',
      providerOrderId: 'ORD_newOrder1',
      userId: 'u1',
    });
    expect(result).toBe('booked');
    expect(state.sub.pendingProductId).toBe('lite_monthly');
  });

  it('supersedes the other open attempts', async () => {
    state.orders = [
      order('new'),
      order('old', {
        productId: 'lite_yearly',
        createdAt: new Date(Date.now() - 120_000),
      }),
    ];
    await applyWaffoPlanChangeOutcome({
      state: 'scheduled',
      providerOrderId: 'ORD_x',
      orderNo: 'ORDnew',
    });
    expect(state.orders.find((o) => o.id === 'old')!.status).toBe('canceled');
    expect(state.orders.find((o) => o.id === 'new')!.status).toBe('created');
  });

  it('does not book after the user cancelled the subscription', async () => {
    state.orders = [order('a')];
    state.sub.status = 'pending_cancel';
    state.sub.canceledReasonType = 'user_request';
    expect(
      await applyWaffoPlanChangeOutcome({
        state: 'scheduled',
        providerOrderId: 'ORD_x',
        orderNo: 'ORDa',
      })
    ).toBe('ignored');
    expect(state.sub.pendingProductId).toBeNull();
  });

  it('immediate change: marks confirmed and books pending upgrade', async () => {
    state.orders = [
      order('a', {
        productId: 'pro_monthly',
        checkoutInfo: marker({ timing: 'immediate' }),
      }),
    ];
    state.sub.productId = 'lite_monthly';
    await applyWaffoPlanChangeOutcome({
      state: 'scheduled',
      providerOrderId: 'ORD_x',
      orderNo: 'ORDa',
    });
    expect(state.sub).toMatchObject({
      pendingProductId: 'pro_monthly',
      pendingChangeType: 'upgrade',
      providerScheduleId: 'ORD_x',
      // Applies when the new order activates: no made-up period-end date.
      pendingEffectiveAt: null,
    });
    expect(
      JSON.parse(state.orders[0].checkoutInfo).planChange.confirmedOrderId
    ).toBe('ORD_x');
  });

  it('failed: drops the booking from that change and closes the attempt', async () => {
    state.orders = [order('a')];
    await applyWaffoPlanChangeOutcome({
      state: 'scheduled',
      providerOrderId: 'ORD_x',
      orderNo: 'ORDa',
    });
    expect(
      await applyWaffoPlanChangeOutcome({
        state: 'failed',
        providerOrderId: 'ORD_x',
        orderNo: 'ORDa',
      })
    ).toBe('failed_recorded');
    expect(state.sub.pendingProductId).toBeNull();
    expect(state.orders[0].status).toBe('canceled');
  });

  it('ignores orders that are not plan changes or belong to someone else', async () => {
    state.orders = [order('a', { checkoutInfo: '{}' })];
    expect(
      await applyWaffoPlanChangeOutcome({
        state: 'scheduled',
        providerOrderId: 'ORD_x',
        orderNo: 'ORDa',
      })
    ).toBe('not_found');
    state.orders = [order('b', { userId: 'u2' })];
    expect(
      await applyWaffoPlanChangeOutcome({
        state: 'scheduled',
        providerOrderId: 'ORD_x',
        orderNo: 'ORDb',
      })
    ).toBe('not_found');
  });

  it('a superseded link the customer confirmed anyway is reopened and booked', async () => {
    state.orders = [
      order('old', {
        status: 'canceled',
        checkoutInfo: marker({ superseded: true }),
      }),
    ];
    const result = await applyWaffoPlanChangeOutcome({
      state: 'scheduled',
      providerOrderId: 'ORD_newOrder9',
      orderNo: 'ORDold',
      effectiveAt: effective,
    });
    expect(result).toBe('booked');
    const o = state.orders[0];
    expect(o.status).toBe('created');
    const m = JSON.parse(o.checkoutInfo).planChange;
    expect(m.superseded).toBe(false);
    expect(m.confirmedOrderId).toBe('ORD_newOrder9');
    expect(state.sub.pendingProductId).toBe('lite_monthly');
    expect(state.sub.providerScheduleId).toBe('ORD_newOrder9');
  });

  it('a failed (not superseded) order is not reopened', async () => {
    state.orders = [
      order('f', {
        status: 'canceled',
        checkoutInfo: marker({ failed: true }),
      }),
    ];
    await applyWaffoPlanChangeOutcome({
      state: 'scheduled',
      providerOrderId: 'ORD_x',
      orderNo: 'ORDf',
    });
    expect(state.orders[0].status).toBe('canceled');
  });
});
