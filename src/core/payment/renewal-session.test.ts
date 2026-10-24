import { describe, expect, it } from 'vitest';

import { DodoProvider } from './dodo';
import { StripeProvider } from './stripe';
import { SubscriptionCycleType } from './types';

/**
 * getRenewalSession: read a renewal back from the provider (SDK clients
 * mocked) as the renewal webhook would report it. Not run against the real
 * Stripe / Dodo APIs.
 */
const after = new Date('2026-11-10T08:00:00Z');
const sec = (iso: string) => Math.floor(Date.parse(iso) / 1000);

function dodo(sub: Record<string, any>, payments: any[]) {
  const p = new DodoProvider({
    apiKey: 'k',
    webhookKey: 'whsec_test',
    environment: 'test_mode',
  });
  const calls: any[] = [];
  (p as any).client = {
    subscriptions: { retrieve: async () => sub },
    payments: {
      list: async (query: any) => {
        calls.push(query);
        return { items: payments };
      },
    },
  };
  return { p, calls };
}

const dodoSub = (extra: Record<string, any> = {}) => ({
  subscription_id: 'sub_d1',
  product_id: 'pdt_pro',
  recurring_pre_tax_amount: 1990,
  currency: 'USD',
  payment_frequency_interval: 'Month',
  payment_frequency_count: 1,
  status: 'active',
  previous_billing_date: '2026-11-10T08:00:00Z',
  next_billing_date: '2026-12-10T08:00:00Z',
  metadata: { order_no: 'ORD-1' },
  ...extra,
});

describe('Dodo getRenewalSession', () => {
  it('renewed and paid → subscription.renewed session + payment id', async () => {
    const { p, calls } = dodo(dodoSub(), [
      {
        payment_id: 'pay_r1',
        total_amount: 1990,
        currency: 'USD',
        created_at: '2026-11-10T08:01:00Z',
      },
    ]);
    const s = await p.getRenewalSession({ subscriptionId: 'sub_d1', after });
    expect(s?.subscriptionId).toBe('sub_d1');
    expect(s?.paymentInfo?.transactionId).toBe('pay_r1');
    expect(s?.paymentInfo?.subscriptionCycleType).toBe(
      SubscriptionCycleType.RENEWAL
    );
    expect(s?.subscriptionInfo?.currentPeriodStart).toEqual(after);
    expect(calls[0]).toMatchObject({
      subscription_id: 'sub_d1',
      status: 'succeeded',
    });
  });

  it('still on the old period → null (no payments lookup)', async () => {
    const { p, calls } = dodo(
      dodoSub({
        previous_billing_date: '2026-10-10T08:00:00Z',
        next_billing_date: '2026-11-10T08:00:00Z',
      }),
      []
    );
    expect(
      await p.getRenewalSession({ subscriptionId: 'sub_d1', after })
    ).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it('two succeeded payments → the newest, not the first row', async () => {
    const { p } = dodo(dodoSub(), [
      {
        payment_id: 'pay_old',
        total_amount: 1990,
        currency: 'USD',
        created_at: '2026-11-10T07:00:00Z',
      },
      {
        payment_id: 'pay_new',
        total_amount: 1990,
        currency: 'USD',
        created_at: '2026-11-10T08:01:00Z',
      },
    ]);
    const s = await p.getRenewalSession({ subscriptionId: 'sub_d1', after });
    expect(s?.paymentInfo?.transactionId).toBe('pay_new');
  });

  it('new period but no succeeded payment → null', async () => {
    const { p } = dodo(dodoSub(), []);
    expect(
      await p.getRenewalSession({ subscriptionId: 'sub_d1', after })
    ).toBeNull();
  });

  it('on hold (renewal charge failing) → null', async () => {
    const { p } = dodo(dodoSub({ status: 'on_hold' }), [
      { payment_id: 'pay_r1', total_amount: 1990, currency: 'USD' },
    ]);
    expect(
      await p.getRenewalSession({ subscriptionId: 'sub_d1', after })
    ).toBeNull();
  });
});

function stripe(invoices: any[], periodStartIso: string) {
  const p = Object.create(StripeProvider.prototype) as StripeProvider;
  const calls: any[] = [];
  (p as any).name = 'stripe';
  (p as any).client = {
    invoices: {
      list: async (query: any) => {
        calls.push(query);
        return { data: invoices };
      },
    },
    subscriptions: {
      retrieve: async (id: string) => ({
        id,
        status: 'active',
        metadata: {},
        items: {
          data: [
            {
              current_period_start: sec(periodStartIso),
              current_period_end: sec('2026-12-10T08:00:00Z'),
              plan: { interval: 'month', interval_count: 1 },
              price: {
                id: 'price_pro',
                product: 'prod_pro',
                unit_amount: 1990,
                currency: 'usd',
              },
            },
          ],
        },
      }),
    },
  };
  return { p, calls };
}

const invoice = (extra: Record<string, any> = {}) => ({
  id: 'in_r1',
  billing_reason: 'subscription_cycle',
  amount_paid: 1990,
  currency: 'usd',
  created: sec('2026-11-10T08:00:00Z'),
  lines: { data: [{ subscription: 'sub_s1' }] },
  ...extra,
});

describe('Stripe getRenewalSession', () => {
  it('paid cycle invoice → same session as invoice.payment_succeeded', async () => {
    const { p, calls } = stripe([invoice()], '2026-11-10T08:00:00Z');
    const s = await p.getRenewalSession({ subscriptionId: 'sub_s1', after });
    expect(s?.paymentInfo?.transactionId).toBe('in_r1');
    expect(s?.paymentInfo?.subscriptionCycleType).toBe(
      SubscriptionCycleType.RENEWAL
    );
    expect(s?.subscriptionId).toBe('sub_s1');
    expect(calls[0]).toMatchObject({ subscription: 'sub_s1', status: 'paid' });
  });

  it('no paid cycle invoice yet (only a proration) → null', async () => {
    const { p } = stripe(
      [invoice({ billing_reason: 'subscription_update' })],
      '2026-11-10T08:00:00Z'
    );
    expect(
      await p.getRenewalSession({ subscriptionId: 'sub_s1', after })
    ).toBeNull();
  });

  it('subscription not on the new period → null', async () => {
    const { p } = stripe([invoice()], '2026-10-10T08:00:00Z');
    expect(
      await p.getRenewalSession({ subscriptionId: 'sub_s1', after })
    ).toBeNull();
  });
});
