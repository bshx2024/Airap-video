import { generateKeyPairSync } from 'crypto';
import { describe, expect, it, vi } from 'vitest';

import {
  PaymentStatus,
  SubscriptionCycleType,
  SubscriptionStatus,
} from './types';
import { WaffoProvider } from './waffo';

/** Waffo getRenewalSession / getSubscription against a mocked GraphQL client. */
const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

function provider(query: (p: any) => Promise<any>) {
  const p = new WaffoProvider({
    merchantId: 'MER_2D5F8G3H1K4M6N9P0a1b2c',
    privateKey,
  });
  const fn = vi.fn(query);
  (p as any).client.graphql = { query: fn };
  return { p, fn };
}

const after = new Date('2026-11-10T08:00:00Z');
const order = (start: string, end: string, status = 'active') => ({
  id: 'ORD_sub1',
  status,
  billingPeriod: 'monthly',
  currentPeriodStart: start,
  currentPeriodEnd: end,
  subscriptionProduct: { id: 'PROD_pro', name: 'Pro' },
  priceSnapshot: { currency: 'USD', regularPhase: { total: '19.90' } },
});
const payment = (id: string, createdAt: string, extra: any = {}) => ({
  id,
  status: 'succeeded',
  orderId: 'ORD_sub1',
  orderMerchantExternalId: 'ORDlocal1',
  createdAt,
  snapshotAmountDetails: { currency: 'USD', total: '19.90' },
  subscriptionOrder: order('2026-11-10T08:00:00Z', '2026-12-10T08:00:00Z'),
  ...extra,
});

describe('WaffoProvider.getRenewalSession', () => {
  it('the new period paid: session keyed by the Waffo payment id', async () => {
    const { p, fn } = provider(async () => ({
      data: {
        payments: [
          payment('PAY_first', '2026-10-10T08:00:00Z'),
          payment('PAY_r1', '2026-11-10T08:01:00Z'),
        ],
      },
    }));
    const s = await p.getRenewalSession({
      subscriptionId: 'ORD_sub1',
      after,
      orderRef: 'ORDlocal1',
    });
    expect(fn.mock.calls[0][0].variables).toEqual({ ref: 'ORDlocal1' });
    expect(s?.paymentStatus).toBe(PaymentStatus.SUCCESS);
    expect(s?.subscriptionId).toBe('ORD_sub1');
    expect(s?.paymentInfo?.transactionId).toBe('PAY_r1');
    expect(s?.paymentInfo?.paymentAmount).toBe(1990);
    expect(s?.paymentInfo?.subscriptionCycleType).toBe(
      SubscriptionCycleType.RENEWAL
    );
    expect(s?.subscriptionInfo?.currentPeriodStart).toEqual(
      new Date('2026-11-10T08:00:00Z')
    );
  });

  it('only the first payment (not renewed yet) → null', async () => {
    const { p } = provider(async () => ({
      data: { payments: [payment('PAY_first', '2026-10-10T08:00:00Z')] },
    }));
    expect(
      await p.getRenewalSession({
        subscriptionId: 'ORD_sub1',
        after,
        orderRef: 'ORDlocal1',
      })
    ).toBeNull();
  });

  it('ignores payments of another order and failed charges', async () => {
    const { p } = provider(async () => ({
      data: {
        payments: [
          payment('PAY_other', '2026-11-10T09:00:00Z', { orderId: 'ORD_new' }),
          payment('PAY_failed', '2026-11-10T09:00:00Z', { status: 'failed' }),
        ],
      },
    }));
    expect(
      await p.getRenewalSession({
        subscriptionId: 'ORD_sub1',
        after,
        orderRef: 'ORDlocal1',
      })
    ).toBeNull();
  });

  it('order still on the old period → null', async () => {
    const { p } = provider(async () => ({
      data: {
        payments: [
          payment('PAY_r1', '2026-11-10T08:01:00Z', {
            subscriptionOrder: order(
              '2026-10-10T08:00:00Z',
              '2026-11-10T08:00:00Z'
            ),
          }),
        ],
      },
    }));
    expect(
      await p.getRenewalSession({
        subscriptionId: 'ORD_sub1',
        after,
        orderRef: 'ORDlocal1',
      })
    ).toBeNull();
  });

  it('no order ref → null without a query; GraphQL error → throws', async () => {
    const { p, fn } = provider(async () => ({
      errors: [{ message: 'boom' }],
    }));
    expect(
      await p.getRenewalSession({ subscriptionId: 'ORD_sub1', after })
    ).toBeNull();
    expect(fn).not.toHaveBeenCalled();
    await expect(
      p.getRenewalSession({
        subscriptionId: 'ORD_sub1',
        after,
        orderRef: 'ORDlocal1',
      })
    ).rejects.toThrow('boom');
  });
});

describe('WaffoProvider.getSubscription', () => {
  it('maps an ended order to canceled', async () => {
    const { p, fn } = provider(async () => ({
      data: {
        subscriptionOrder: {
          ...order('2026-10-10T08:00:00Z', '2026-11-10T08:00:00Z', 'expired'),
          canceledAt: '2026-11-10T08:00:00Z',
        },
      },
    }));
    const s = await p.getSubscription({ subscriptionId: 'ORD_sub1' });
    expect(fn.mock.calls[0][0].variables).toEqual({ id: 'ORD_sub1' });
    expect(s.subscriptionInfo?.status).toBe(SubscriptionStatus.CANCELED);
    expect(s.subscriptionInfo?.canceledAt).toEqual(
      new Date('2026-11-10T08:00:00Z')
    );
  });

  it('unknown order → throws (treated as unavailable)', async () => {
    const { p } = provider(async () => ({ data: { subscriptionOrder: null } }));
    await expect(
      p.getSubscription({ subscriptionId: 'ORD_x' })
    ).rejects.toThrow('not found');
  });
});
