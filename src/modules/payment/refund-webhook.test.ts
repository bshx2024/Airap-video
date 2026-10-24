import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * handlePaymentRefunded against a fake DB without row locks (like D1):
 * reads are snapshots, the conditional UPDATEs are emulated by intent so
 * replayed / concurrent webhooks interleave the way they would on D1.
 */
const state = vi.hoisted(() => ({
  orders: [] as Record<string, any>[],
  sub: null as Record<string, any> | null,
  /** order rows returned for each order SELECT (by call), else all */
  orderSelect: null as null | ((call: number) => Record<string, any>[]),
  orderSelects: 0,
  reclaims: [] as string[],
  subUpdates: [] as Record<string, any>[],
  cancels: [] as Record<string, any>[],
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
        orderBy: () => q,
        for: () => q,
        limit: async () => {
          await tick();
          if (table !== schema.order) return [];
          const call = state.orderSelects++;
          const rows = state.orderSelect
            ? state.orderSelect(call)
            : state.orders;
          return rows.map((row) => ({ ...row }));
        },
      };
      return q;
    },
    update: (table: any) => ({
      set: (values: Record<string, any>) => ({
        where: async () => {
          await tick();
          const row = state.orders[0];
          if (table !== schema.order || !row) return { rowsAffected: 0 };
          // both the refund claim and the partial record require `paid`
          if (row.status !== 'paid') return { rowsAffected: 0 };
          Object.assign(row, values);
          return { rowsAffected: 1 };
        },
      }),
    }),
  };
  return { db: () => fake };
});

vi.mock('@/modules/config/service', () => ({
  getAllConfigs: async () => ({}),
}));
vi.mock('@/modules/notify/service', () => ({
  notifyPaymentSuccess: async () => {},
}));

vi.mock('@/modules/credits/service', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  reclaimCreditsForOrder: async (orderNo: string) => {
    await tick();
    state.reclaims.push(orderNo);
    return 70;
  },
}));

vi.mock('@/modules/subscriptions/service', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  findBySubscriptionNo: async () => (state.sub ? { ...state.sub } : null),
  findByProviderSubscriptionId: async () =>
    state.sub ? { ...state.sub } : null,
  updateBySubscriptionNo: async (_no: string, patch: Record<string, any>) => {
    state.subUpdates.push(patch);
    if (state.sub) Object.assign(state.sub, patch);
    return state.sub;
  },
}));

vi.mock('@/core/payment', async (importOriginal) => {
  const actual = await importOriginal<any>();
  class PaymentManager {
    addProvider() {}
    getProvider(name: string) {
      return {
        name,
        cancelSubscription: async (params: Record<string, any>) => {
          state.cancels.push({ name, ...params });
          return {};
        },
      };
    }
  }
  return { ...actual, PaymentManager };
});

const { handlePaymentRefunded, handleSubscriptionUpdated } =
  await import('./service');

const baseOrder = {
  id: 'o1',
  orderNo: 'ORD-1',
  status: 'paid',
  amount: 1000,
  currency: 'usd',
  paymentType: 'subscription',
  paymentProvider: 'dodo',
  transactionId: 'pay_1',
  paymentResult: null,
  subscriptionNo: 'SUB-1',
  deletedAt: null,
};

const activeSub = {
  subscriptionNo: 'SUB-1',
  subscriptionId: 'sub_dodo_1',
  paymentProvider: 'dodo',
  productId: 'pro_monthly',
  status: 'active',
  canceledReasonType: '',
};

const refund = (extra: Record<string, any> = {}) => ({
  provider: 'dodo',
  paymentInfo: {
    transactionId: 'pay_1',
    paymentAmount: 1000,
    paymentCurrency: 'usd',
  },
  paymentResult: { refund_id: 'rf_1', payment_id: 'pay_1', is_partial: false },
  ...extra,
});

beforeEach(() => {
  state.orders = [{ ...baseOrder }];
  state.sub = { ...activeSub };
  state.orderSelect = null;
  state.orderSelects = 0;
  state.reclaims = [];
  state.subUpdates = [];
  state.cancels = [];
});

describe('handlePaymentRefunded', () => {
  it('full refund: order refunded, credits reclaimed, current subscription ended + canceled at the provider', async () => {
    await handlePaymentRefunded(refund(), 'dodo');
    expect(state.orders[0].status).toBe('refunded');
    expect(JSON.parse(state.orders[0].paymentResult).refunds).toHaveLength(1);
    expect(state.reclaims).toEqual(['ORD-1']);
    expect(state.sub).toMatchObject({
      status: 'canceled',
      canceledReasonType: 'refund',
      pendingProductId: null,
    });
    expect(state.cancels).toEqual([
      { name: 'dodo', subscriptionId: 'sub_dodo_1', immediate: true },
    ]);
  });

  it('replayed webhook: nothing happens the second time', async () => {
    await handlePaymentRefunded(refund(), 'dodo');
    await handlePaymentRefunded(refund(), 'dodo');
    expect(state.reclaims).toEqual(['ORD-1']);
    expect(state.cancels).toHaveLength(1);
    expect(state.subUpdates).toHaveLength(1);
  });

  it('concurrent webhooks: one claim wins, credits reclaimed once', async () => {
    await Promise.all([
      handlePaymentRefunded(refund(), 'dodo'),
      handlePaymentRefunded(refund(), 'dodo'),
      handlePaymentRefunded(refund(), 'dodo'),
    ]);
    expect(state.orders[0].status).toBe('refunded');
    expect(state.reclaims).toEqual(['ORD-1']);
    expect(state.cancels).toHaveLength(1);
  });

  it('partial refund: order stays paid, credits and plan kept, recorded once', async () => {
    const partial = refund({
      paymentInfo: {
        transactionId: 'pay_1',
        paymentAmount: 300,
        paymentCurrency: 'usd',
      },
      paymentResult: { refund_id: 'rf_p1', is_partial: true },
    });
    await handlePaymentRefunded(partial, 'dodo');
    await handlePaymentRefunded(partial, 'dodo'); // replay
    expect(state.orders[0].status).toBe('paid');
    expect(JSON.parse(state.orders[0].paymentResult).refunds).toEqual([
      expect.objectContaining({ id: 'rf_p1', amount: 300 }),
    ]);
    expect(state.reclaims).toEqual([]);
    expect(state.sub?.status).toBe('active');
    expect(state.cancels).toEqual([]);
  });

  it('partials adding up to the paid amount become a full refund', async () => {
    const part = (id: string, amount: number) =>
      refund({
        paymentInfo: {
          transactionId: 'pay_1',
          paymentAmount: amount,
          paymentCurrency: 'usd',
        },
        paymentResult: { refund_id: id },
      });
    await handlePaymentRefunded(part('rf_a', 600), 'dodo');
    expect(state.orders[0].status).toBe('paid');
    await handlePaymentRefunded(part('rf_b', 400), 'dodo');
    expect(state.orders[0].status).toBe('refunded');
    expect(state.reclaims).toEqual(['ORD-1']);
    expect(state.sub?.status).toBe('canceled');
  });

  it("an older period's refund reclaims that order only; the subscription keeps running", async () => {
    const newer = { ...baseOrder, id: 'o2', orderNo: 'ORD-2' };
    // byTxn → the refunded order; latest paid order of the sub → a newer one
    state.orderSelect = (call) => (call === 0 ? state.orders : [newer]);
    await handlePaymentRefunded(refund(), 'dodo');
    expect(state.orders[0].status).toBe('refunded');
    expect(state.reclaims).toEqual(['ORD-1']);
    expect(state.sub?.status).toBe('active');
    expect(state.cancels).toEqual([]);
  });

  it('a refund for a payment we hold no order for does not hit the first order', async () => {
    // no order with this payment id; the reference lookup finds the checkout
    // order, which was paid by another payment (Dodo prorated plan change)
    state.orderSelect = (call) => (call === 0 ? [] : state.orders);
    await handlePaymentRefunded(
      refund({
        paymentInfo: {
          transactionId: 'pay_proration',
          paymentAmount: 500,
          paymentCurrency: 'usd',
        },
        metadata: { order_no: 'ORD-1' },
      }),
      'dodo'
    );
    expect(state.orders[0].status).toBe('paid');
    expect(state.reclaims).toEqual([]);
    expect(state.sub?.status).toBe('active');
  });

  it('a refund-ended subscription is not revived by a later provider update', async () => {
    await handlePaymentRefunded(refund(), 'dodo');
    const before = state.subUpdates.length;
    await handleSubscriptionUpdated(
      {
        subscriptionId: 'sub_dodo_1',
        subscriptionInfo: { status: 'pending_cancel' },
      },
      'dodo'
    );
    expect(state.subUpdates).toHaveLength(before);
    expect(state.sub?.status).toBe('canceled');
  });
});
