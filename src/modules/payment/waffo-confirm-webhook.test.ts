import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * recordConfirmedWaffoPlanChange: the canceling webhook (customer confirmed
 * on Waffo) is what books the downgrade.
 */
const state = vi.hoisted(() => ({
  sub: {} as Record<string, any>,
  orders: [] as Record<string, any>[],
}));

vi.mock('./waffo-plan-change', () => ({
  listRecentWaffoPlanChangeOrders: async () =>
    state.orders.map((o) => ({ ...o })),
  markWaffoPlanChangeOrdersSuperseded: async (rows: any[]) => {
    for (const r of rows) {
      const o = state.orders.find((x) => x.id === r.id);
      if (o && o.status === 'created') o.status = 'canceled';
    }
  },
}));

vi.mock('@/modules/subscriptions/service', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  updateBySubscriptionNo: async (_no: string, values: any) => {
    Object.assign(state.sub, values);
    return { ...state.sub };
  },
}));

const { recordConfirmedWaffoPlanChange } = await import('./service');

const periodEnd = new Date('2026-11-11T00:00:00Z');
const marker = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    planChange: {
      fromSubscriptionNo: 'SUB-W',
      timing: 'period_end',
      ...extra,
    },
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
    pendingChangeType: null,
  };
  state.orders = [];
});

describe('recordConfirmedWaffoPlanChange', () => {
  it('books the confirmed target (pending_* written only now)', async () => {
    state.orders = [
      {
        id: 'o1',
        orderNo: 'ORD-1',
        productId: 'lite_monthly',
        status: 'created',
        createdAt: new Date(Date.now() - 60_000),
        checkoutInfo: marker(),
      },
    ];
    await recordConfirmedWaffoPlanChange(
      { ...state.sub },
      { status: 'pending_cancel', canceledEndAt: periodEnd }
    );
    expect(state.sub).toMatchObject({
      pendingProductId: 'lite_monthly',
      pendingEffectiveAt: periodEnd,
      pendingChangeType: 'downgrade',
      providerScheduleId: 'ORD-1',
    });
    // the confirmed order stays live so its activation webhook fulfills it
    expect(state.orders[0].status).toBe('created');
  });

  it('supersedes other unconfirmed attempts', async () => {
    state.orders = [
      {
        id: 'old',
        orderNo: 'ORD-old',
        productId: 'lite_yearly',
        status: 'created',
        createdAt: new Date(Date.now() - 120_000),
        checkoutInfo: marker(),
      },
      {
        id: 'new',
        orderNo: 'ORD-new',
        productId: 'lite_monthly',
        status: 'created',
        createdAt: new Date(Date.now() - 60_000),
        checkoutInfo: marker(),
      },
    ];
    await recordConfirmedWaffoPlanChange(
      { ...state.sub },
      { status: 'pending_cancel', canceledEndAt: periodEnd }
    );
    expect(state.sub.pendingProductId).toBe('lite_monthly');
    expect(state.orders.find((o) => o.id === 'old')?.status).toBe('canceled');
    expect(state.orders.find((o) => o.id === 'new')?.status).toBe('created');
  });

  it('ignores stale sessions and user cancels', async () => {
    state.orders = [
      {
        id: 'stale',
        orderNo: 'ORD-stale',
        productId: 'lite_monthly',
        status: 'created',
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        checkoutInfo: marker(),
      },
    ];
    await recordConfirmedWaffoPlanChange(
      { ...state.sub },
      { status: 'pending_cancel', canceledEndAt: periodEnd }
    );
    expect(state.sub.pendingProductId).toBeNull();

    state.orders[0].createdAt = new Date();
    await recordConfirmedWaffoPlanChange(
      {
        ...state.sub,
        status: 'pending_cancel',
        canceledReasonType: 'user_request',
      },
      { status: 'pending_cancel', canceledEndAt: periodEnd }
    );
    expect(state.sub.pendingProductId).toBeNull();
  });
});
