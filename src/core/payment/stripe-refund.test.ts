import { describe, expect, it, vi } from 'vitest';

import { StripeProvider } from './stripe';
import { PaymentEventType } from './types';

/** charge.refunded → the local order's payment id (ported from tinyship). */
function provider(client: Record<string, any>) {
  const p = Object.create(StripeProvider.prototype) as StripeProvider;
  (p as any).client = client;
  return p as any;
}

const charge = (extra: Record<string, any> = {}) => ({
  id: 'ch_1',
  amount: 1000,
  amount_refunded: 1000,
  refunded: true,
  currency: 'usd',
  payment_intent: 'pi_1',
  metadata: {},
  ...extra,
});

describe('Stripe charge.refunded', () => {
  it('is mapped to payment.refunded', () => {
    const p = provider({});
    expect(p.mapStripeEventType('charge.refunded')).toBe(
      PaymentEventType.PAYMENT_REFUNDED
    );
  });

  it('one-time Checkout payment → its Checkout session (cs_) + order_no', async () => {
    const list = vi.fn(async () => ({
      data: [
        {
          id: 'cs_1',
          client_reference_id: 'ORD-1',
          metadata: { order_no: 'ORD-1' },
        },
      ],
    }));
    const p = provider({
      paymentIntents: { retrieve: vi.fn(async () => ({ id: 'pi_1' })) },
      invoicePayments: { list: vi.fn(async () => ({ data: [] })) },
      checkout: { sessions: { list } },
    });
    const s = await p.buildPaymentSessionFromCharge(charge());
    expect(list).toHaveBeenCalledWith({ payment_intent: 'pi_1', limit: 1 });
    expect(s.paymentInfo).toMatchObject({
      transactionId: 'cs_1',
      paymentAmount: 1000,
      paymentCurrency: 'usd',
    });
    expect(s.metadata.order_no).toBe('ORD-1');
    expect(s.paymentResult).toMatchObject({
      refund_id: 'ch_1:1000',
      is_partial: false,
      refunded_total: 1000,
    });
  });

  it('renewal invoice → the invoice id (renewal order) + subscription', async () => {
    const p = provider({
      invoices: {
        retrieve: vi.fn(async () => ({
          id: 'in_2',
          billing_reason: 'subscription_cycle',
          parent: {
            subscription_details: {
              subscription: 'sub_1',
              metadata: { order_no: 'ORD-1' },
            },
          },
        })),
      },
    });
    const s = await p.buildPaymentSessionFromCharge(
      charge({ invoice: 'in_2' })
    );
    expect(s.paymentInfo.transactionId).toBe('in_2');
    expect(s.subscriptionId).toBe('sub_1');
  });

  it('first subscription invoice → no payment id, matched by order_no', async () => {
    const p = provider({
      paymentIntents: {
        retrieve: vi.fn(async () => ({ id: 'pi_1', invoice: null })),
      },
      invoicePayments: {
        list: vi.fn(async () => ({ data: [{ invoice: 'in_1' }] })),
      },
      invoices: {
        retrieve: vi.fn(async () => ({
          id: 'in_1',
          billing_reason: 'subscription_create',
          parent: {
            subscription_details: {
              subscription: 'sub_1',
              metadata: { order_no: 'ORD-1' },
            },
          },
        })),
      },
    });
    const s = await p.buildPaymentSessionFromCharge(charge());
    expect(s.paymentInfo.transactionId).toBeUndefined();
    expect(s.metadata.order_no).toBe('ORD-1');
    expect(s.subscriptionId).toBe('sub_1');
  });

  it('partial refund → running total, flagged partial', async () => {
    const p = provider({
      invoices: {
        retrieve: vi.fn(async () => ({
          id: 'in_2',
          billing_reason: 'subscription_cycle',
        })),
      },
    });
    const s = await p.buildPaymentSessionFromCharge(
      charge({ invoice: 'in_2', amount_refunded: 400, refunded: false })
    );
    expect(s.paymentResult).toMatchObject({
      refund_id: 'ch_1:400',
      is_partial: true,
      refunded_total: 400,
    });
  });
});
