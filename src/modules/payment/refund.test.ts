import { describe, expect, it } from 'vitest';

import {
  planRefund,
  recordedRefunds,
  shouldPreserveRefundCancel,
} from './refund';

const paid = {
  status: 'paid',
  amount: 1000,
  currency: 'usd',
  transactionId: 'pay_1',
  paymentResult: null as unknown,
};
const now = new Date('2026-10-19T12:00:00Z');

describe('planRefund', () => {
  it('full refund (amount ≥ order amount) → full', () => {
    const plan = planRefund({
      order: paid,
      refund: { id: 'r1', amount: 1000, currency: 'USD' },
      now,
    });
    expect(plan.action).toBe('full');
  });

  it('no usable amount (or another currency) → full, like before', () => {
    expect(
      planRefund({ order: paid, refund: { id: 'r1', amount: null } }).action
    ).toBe('full');
    expect(
      planRefund({
        order: paid,
        refund: { id: 'r1', amount: 300, currency: 'eur' },
      }).action
    ).toBe('full');
  });

  it('partial refund keeps the order: recorded once', () => {
    const plan = planRefund({
      order: paid,
      refund: { id: 'r1', amount: 300, currency: 'usd' },
      now,
    });
    expect(plan).toEqual({
      action: 'partial',
      refundedTotal: 300,
      refunds: [
        { id: 'r1', amount: 300, currency: 'usd', at: now.toISOString() },
      ],
    });
  });

  it('provider-flagged partial (Dodo is_partial) stays partial without an amount', () => {
    const plan = planRefund({
      order: paid,
      refund: { id: 'r1', amount: null, isPartial: true },
    });
    expect(plan.action).toBe('partial');
  });

  it('partials adding up to the order amount → full', () => {
    const order = {
      ...paid,
      paymentResult: JSON.stringify({
        refunds: [{ id: 'r1', amount: 600, currency: 'usd', at: 'x' }],
      }),
    };
    expect(
      planRefund({ order, refund: { id: 'r2', amount: 300 } }).action
    ).toBe('partial');
    expect(
      planRefund({ order, refund: { id: 'r2', amount: 400 } }).action
    ).toBe('full');
  });

  it('a running total (Stripe amount_refunded) is not summed twice', () => {
    const order = {
      ...paid,
      paymentResult: JSON.stringify({
        refunds: [{ id: 'ch:400', amount: 400, currency: 'usd', at: 'x' }],
      }),
    };
    const plan = planRefund({
      order,
      refund: {
        id: 'ch:800',
        amount: 800,
        refundedTotal: 800,
        isPartial: true,
      },
    });
    expect(plan).toMatchObject({ action: 'partial', refundedTotal: 800 });
  });

  it('replay of the same refund → duplicate; refunded order → skip', () => {
    const order = {
      ...paid,
      paymentResult: { refunds: [{ id: 'r1', amount: 300 }] },
    };
    expect(planRefund({ order, refund: { id: 'r1', amount: 300 } })).toEqual({
      action: 'skip',
      reason: 'duplicate',
    });
    expect(
      planRefund({
        order: { ...paid, status: 'refunded' },
        refund: { id: 'r1', amount: 1000 },
      })
    ).toEqual({ action: 'skip', reason: 'already_refunded' });
    expect(
      planRefund({
        order: { ...paid, status: 'created' },
        refund: { id: 'r1', amount: 1000 },
      })
    ).toEqual({ action: 'skip', reason: 'not_paid' });
  });

  it('order found by reference but paid by another payment → other_payment', () => {
    expect(
      planRefund({
        order: paid,
        refund: { id: 'r1', amount: 500, transactionId: 'pay_proration' },
        matchedByReference: true,
      })
    ).toEqual({ action: 'skip', reason: 'other_payment' });
    // matched by the payment itself, or no payment id on either side: fine
    expect(
      planRefund({
        order: paid,
        refund: { id: 'r1', amount: 1000, transactionId: 'pay_1' },
        matchedByReference: true,
      }).action
    ).toBe('full');
    expect(
      planRefund({
        order: paid,
        refund: { id: 'r1', amount: 1000 },
        matchedByReference: true,
      }).action
    ).toBe('full');
  });

  it('recordedRefunds tolerates junk', () => {
    expect(recordedRefunds('not json')).toEqual([]);
    expect(recordedRefunds(null)).toEqual([]);
    expect(recordedRefunds({ refunds: [{ id: 'a' }, null, 1] })).toEqual([
      { id: 'a' },
    ]);
  });
});

describe('shouldPreserveRefundCancel', () => {
  const ended = { status: 'canceled', canceledReasonType: 'refund' };
  it('keeps a refund-ended subscription ended against live provider updates', () => {
    for (const s of ['active', 'trialing', 'paused', 'pending_cancel']) {
      expect(shouldPreserveRefundCancel(ended, s)).toBe(true);
    }
    expect(shouldPreserveRefundCancel(ended, 'canceled')).toBe(false);
    expect(
      shouldPreserveRefundCancel(
        { status: 'canceled', canceledReasonType: 'user_request' },
        'active'
      )
    ).toBe(false);
  });
});
