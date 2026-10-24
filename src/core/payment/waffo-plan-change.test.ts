import { generateKeyPairSync } from 'crypto';
import { describe, expect, it, vi } from 'vitest';

import { PaymentEventType } from './types';
import { WAFFO_PLAN_CHANGE_EVENTS, WaffoProvider } from './waffo';

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

function provider(query?: (p: any) => Promise<any>) {
  const p = new WaffoProvider({
    merchantId: 'MER_2D5F8G3H1K4M6N9P0a1b2c',
    privateKey,
  });
  if (query) (p as any).client.graphql = { query: vi.fn(query) };
  return p;
}

const data = (extra: Record<string, unknown> = {}) => ({
  orderId: 'ORD_newOrder1',
  orderStatus: 'pending',
  buyerEmail: 'a@b.c',
  merchantProvidedBuyerIdentity: 'u1',
  orderMerchantExternalId: 'ORDlocal1',
  currency: 'USD',
  amount: '9.90',
  taxAmount: '0',
  productName: 'Lite',
  billingPeriod: 'monthly',
  planChange: {
    direction: 'downgrade',
    effectiveDate: '2026-11-11T00:00:01.000Z',
  },
  ...extra,
});

describe('Waffo plan-change webhooks', () => {
  const build = (eventType: string, d = data()) =>
    (provider() as any).buildPlanChangeEvent({
      eventType,
      eventId: 'ORD_newOrder1',
      data: d,
    });

  it('plan_change_scheduled → PLAN_CHANGE scheduled with the new order id', () => {
    const event = build(WAFFO_PLAN_CHANGE_EVENTS.scheduled);
    expect(event.eventType).toBe(PaymentEventType.PLAN_CHANGE);
    expect(event.paymentSession.planChange).toEqual({
      state: 'scheduled',
      providerOrderId: 'ORD_newOrder1',
      merchantOrderNo: 'ORDlocal1',
      buyerIdentity: 'u1',
      effectiveAt: new Date('2026-11-11T00:00:01.000Z'),
    });
  });

  it('works without orderMerchantExternalId (no throw)', () => {
    const d = data();
    delete (d as any).orderMerchantExternalId;
    const event = build(WAFFO_PLAN_CHANGE_EVENTS.scheduled, d);
    expect(event.paymentSession.planChange.merchantOrderNo).toBeUndefined();
    expect(event.paymentSession.planChange.buyerIdentity).toBe('u1');
  });

  it('plan_change_failed → PLAN_CHANGE failed', () => {
    const event = build(
      WAFFO_PLAN_CHANGE_EVENTS.failed,
      data({ orderStatus: 'canceled', planChange: { effectiveDate: null } })
    );
    expect(event.paymentSession.planChange.state).toBe('failed');
  });

  it('plan_changed → checkout fulfilment of our order number', () => {
    const event = build(
      WAFFO_PLAN_CHANGE_EVENTS.changed,
      data({
        orderStatus: 'active',
        currentPeriodStart: '2026-11-11',
        currentPeriodEnd: '2026-12-11',
      })
    );
    expect(event.eventType).toBe(PaymentEventType.CHECKOUT_SUCCESS);
    expect(event.paymentSession.paymentResult.orderNo).toBe('ORDlocal1');
    expect(event.paymentSession.subscriptionId).toBe('ORD_newOrder1');
  });

  it('leaves other events to the generic handler', () => {
    expect(build('subscription.activated')).toBeUndefined();
  });
});

describe('getPlanChangeStatus (reconciliation)', () => {
  const answer = (payments: any[], order?: any) => async (p: any) =>
    p.query.includes('payments')
      ? { data: { payments } }
      : { data: { subscriptionOrder: order } };

  it('none while nothing was confirmed', async () => {
    const p = provider(answer([]));
    expect(await p.getPlanChangeStatus({ orderNo: 'ORDlocal1' })).toMatchObject(
      {
        state: 'none',
      }
    );
  });

  it('scheduled: confirmed card check + new order pending', async () => {
    const p = provider(
      answer([{ id: 'PAY_1', orderId: 'ORD_new', status: 'succeeded' }], {
        id: 'ORD_new',
        status: 'pending',
      })
    );
    expect(await p.getPlanChangeStatus({ orderNo: 'ORDlocal1' })).toMatchObject(
      {
        state: 'scheduled',
        providerOrderId: 'ORD_new',
      }
    );
  });

  it('applied when the new order is live; failed when it closed unpaid', async () => {
    expect(
      await provider(
        answer([{ id: 'PAY_1', orderId: 'ORD_new', status: 'succeeded' }], {
          id: 'ORD_new',
          status: 'active',
        })
      ).getPlanChangeStatus({ orderNo: 'x' })
    ).toMatchObject({ state: 'applied' });
    expect(
      await provider(
        answer([{ id: 'PAY_1', orderId: 'ORD_new', status: 'failed' }], {
          id: 'ORD_new',
          status: 'canceled',
        })
      ).getPlanChangeStatus({ orderNo: 'x' })
    ).toMatchObject({ state: 'failed' });
  });

  it('pending order without a confirmed payment is not confirmed', async () => {
    expect(
      await provider(
        answer([{ id: 'PAY_1', orderId: 'ORD_new', status: 'pending' }], {
          id: 'ORD_new',
          status: 'pending',
        })
      ).getPlanChangeStatus({ orderNo: 'x' })
    ).toMatchObject({ state: 'none' });
  });

  it('origin parked in canceling = confirmed, even with no payment match', async () => {
    const p = provider(async (q: any) =>
      q.query.includes('payments')
        ? { data: { payments: [] } }
        : q.variables.id === 'ORD_origin'
          ? {
              data: {
                subscriptionOrder: { id: 'ORD_origin', status: 'canceling' },
              },
            }
          : { data: { subscriptionOrder: null } }
    );
    const res = await p.getPlanChangeStatus({
      orderNo: 'x',
      originOrderId: 'ORD_origin',
    });
    expect(res).toMatchObject({
      state: 'scheduled',
      originStatus: 'canceling',
    });
    expect(res.providerOrderId).toBeUndefined();
    expect(res.debug).toHaveProperty('origin');
  });

  it('origin still active and no payment → none', async () => {
    const p = provider(async (q: any) =>
      q.query.includes('payments')
        ? { data: { payments: [] } }
        : {
            data: { subscriptionOrder: { id: 'ORD_origin', status: 'active' } },
          }
    );
    expect(
      await p.getPlanChangeStatus({ orderNo: 'x', originOrderId: 'ORD_origin' })
    ).toMatchObject({ state: 'none', originStatus: 'active' });
  });

  it('one query failing is tolerated when the other answers', async () => {
    const p = provider(async (q: any) =>
      q.query.includes('payments')
        ? { errors: [{ message: 'Unknown field orderMerchantExternalId' }] }
        : {
            data: {
              subscriptionOrder: { id: 'ORD_origin', status: 'canceling' },
            },
          }
    );
    const res = await p.getPlanChangeStatus({
      orderNo: 'x',
      originOrderId: 'ORD_origin',
    });
    expect(res.state).toBe('scheduled');
    expect(res.debug?.payments).toEqual({
      errors: ['Unknown field orderMerchantExternalId'],
    });
  });

  it('surfaces GraphQL errors', async () => {
    const p = provider(async () => ({ errors: [{ message: 'boom' }] }));
    await expect(p.getPlanChangeStatus({ orderNo: 'x' })).rejects.toThrow(
      /boom/
    );
  });
});

describe('Waffo cancel / resume webhooks (portal)', () => {
  const session = (eventType: string, d: Record<string, unknown>) =>
    (provider() as any).buildPaymentSession({
      eventType,
      eventId: 'evt_1',
      data: data({ orderId: 'ORD_sub1', planChange: undefined, ...d }),
    });

  it('subscription.uncanceled → live status flagged as resumed', () => {
    const s = session('subscription.uncanceled', { orderStatus: 'active' });
    expect(s.subscriptionId).toBe('ORD_sub1');
    expect(s.subscriptionInfo.status).toBe('active');
    expect(s.subscriptionInfo.resumed).toBe(true);
  });

  it('uncanceled still reporting canceling is read as active', () => {
    const s = session('subscription.uncanceled', { orderStatus: 'canceling' });
    expect(s.subscriptionInfo.status).toBe('active');
  });

  it('canceling / updated are not a resume', () => {
    const canceling = session('subscription.canceling', {
      orderStatus: 'canceling',
    });
    expect(canceling.subscriptionInfo.status).toBe('pending_cancel');
    expect(canceling.subscriptionInfo.resumed).toBeUndefined();
    const updated = session('subscription.updated', { orderStatus: 'active' });
    expect(updated.subscriptionInfo.resumed).toBeUndefined();
  });
});
