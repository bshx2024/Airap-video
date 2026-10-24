import { describe, expect, it } from 'vitest';

import { CreemProvider } from './creem';

/** refund.created: the refunded amount is refund_amount, not the paid total. */
describe('Creem refund.created session', () => {
  const p = new CreemProvider({
    apiKey: 'k',
    signingSecret: 's',
    environment: 'sandbox',
  } as any) as any;

  it('uses refund_amount / refund_currency and the refund id', async () => {
    const s = await p.buildPaymentSessionFromRefund({
      id: 'ref_1',
      refund_amount: 500,
      refund_currency: 'EUR',
      transaction: {
        id: 'tran_1',
        amount_paid: 1210,
        currency: 'EUR',
      },
      checkout: { request_id: 'ORD-1' },
    });
    expect(s.paymentInfo).toMatchObject({
      transactionId: 'tran_1',
      paymentAmount: 500,
      paymentCurrency: 'eur',
      invoiceId: 'ref_1',
    });
  });

  it('falls back to the paid total when refund_amount is missing', async () => {
    const s = await p.buildPaymentSessionFromRefund({
      id: 'ref_2',
      transaction: { id: 'tran_1', amount_paid: 1210, currency: 'EUR' },
    });
    expect(s.paymentInfo.paymentAmount).toBe(1210);
  });
});
