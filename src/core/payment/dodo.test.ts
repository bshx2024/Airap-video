import { describe, expect, it } from 'vitest';

import { DodoProvider } from './dodo';
import {
  PaymentEventType,
  PaymentInterval,
  PaymentStatus,
  PaymentType,
  SubscriptionCycleType,
  SubscriptionStatus,
  WebhookIgnoredError,
} from './types';

function createMockProvider(clientOverrides: Record<string, any> = {}) {
  const provider = new DodoProvider({
    apiKey: 'test_api_key',
    webhookKey: 'whsec_test',
    environment: 'test_mode',
  });

  (provider as any).client = {
    checkoutSessions: {
      create: async () => ({
        session_id: 'cks_123',
        checkout_url: 'https://test.checkout.dodopayments.com/session/cks_123',
      }),
      retrieve: async (id: string) => ({
        id,
        payment_status: 'succeeded',
        payment_id: 'pay_123',
      }),
      ...clientOverrides.checkoutSessions,
    },
    payments: {
      retrieve: async (id: string) => ({
        payment_id: id,
        status: 'succeeded',
        total_amount: 999,
        currency: 'USD',
        created_at: '2026-01-01T00:00:00Z',
        metadata: { order_no: 'ORDER-123' },
        customer: { email: 'user@example.com', name: 'Test User' },
      }),
      ...clientOverrides.payments,
    },
    subscriptions: {
      retrieve: async (id: string) => ({
        subscription_id: id,
        product_id: 'pdt_pro',
        recurring_pre_tax_amount: 999,
        currency: 'USD',
        payment_frequency_interval: 'Month',
        payment_frequency_count: 1,
        status: 'active',
        previous_billing_date: '2026-01-01T00:00:00Z',
        next_billing_date: '2026-02-01T00:00:00Z',
      }),
      update: async (id: string, body: any) => ({
        subscription_id: id,
        status: 'active',
        cancel_at_next_billing_date: body.cancel_at_next_billing_date,
        previous_billing_date: '2026-01-01T00:00:00Z',
        next_billing_date: '2026-02-01T00:00:00Z',
      }),
      ...clientOverrides.subscriptions,
    },
    customers: {
      customerPortal: {
        create: async (customerId: string) => ({
          link: `https://test.customer.dodopayments.com/portal/${customerId}`,
        }),
      },
      ...clientOverrides.customers,
    },
    webhooks: {
      unwrap: (_body: string, _opts: any) => ({
        type: 'payment.succeeded',
        data: {
          payment_id: 'pay_123',
          total_amount: 999,
          currency: 'USD',
          created_at: '2026-01-01T00:00:00Z',
          metadata: { order_no: 'ORDER-123' },
        },
      }),
      ...clientOverrides.webhooks,
    },
  };

  return provider;
}

describe('DodoProvider.createPayment', () => {
  it('creates checkout session successfully', async () => {
    let createBody: any;
    const provider = createMockProvider({
      checkoutSessions: {
        create: async (body: any) => {
          createBody = body;
          return {
            session_id: 'cks_123',
            checkout_url:
              'https://test.checkout.dodopayments.com/session/cks_123',
          };
        },
      },
    });

    const session = await provider.createPayment({
      order: {
        type: PaymentType.ONE_TIME,
        orderNo: 'ORDER-123',
        productId: 'pdt_starter',
        price: { amount: 999, currency: 'usd' },
        customer: { id: 'usr_1', email: 'test@example.com' },
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      },
    });

    expect(session.provider).toBe('dodo');
    expect(session.checkoutInfo.sessionId).toBe('cks_123');
    expect(session.checkoutInfo.checkoutUrl).toContain('dodopayments.com');
    expect(createBody.billing_currency).toBe('USD');
    expect(createBody.feature_flags).toEqual({
      allow_currency_selection: false,
      allow_discount_code: false,
    });
  });

  it('throws error when productId is missing', async () => {
    const provider = createMockProvider();

    await expect(
      provider.createPayment({
        order: {
          type: PaymentType.ONE_TIME,
          orderNo: 'ORDER-123',
          price: { amount: 999, currency: 'usd' },
        } as any,
      })
    ).rejects.toThrow('productId is required');
  });
});

describe('DodoProvider.getPaymentSession', () => {
  it('retrieves session by checkout session ID (cks_...)', async () => {
    const provider = createMockProvider();

    const session = await provider.getPaymentSession({ sessionId: 'cks_123' });
    expect(session.paymentStatus).toBe(PaymentStatus.SUCCESS);
    expect(session.paymentInfo?.paymentAmount).toBe(999);
    expect(session.paymentInfo?.paymentCurrency).toBe('usd');
    expect(session.paymentInfo?.transactionId).toBe('pay_123');
  });

  it('retrieves session by payment ID (pay_...)', async () => {
    const provider = createMockProvider();

    const session = await provider.getPaymentSession({ sessionId: 'pay_123' });
    expect(session.paymentStatus).toBe(PaymentStatus.SUCCESS);
    expect(session.paymentInfo?.paymentAmount).toBe(999);
  });

  it('marks failed checkout without payment_id and keeps session id for order lookup', async () => {
    const provider = createMockProvider({
      checkoutSessions: {
        retrieve: async (id: string) => ({
          id,
          session_id: id,
          payment_status: 'failed',
          payment_id: null,
        }),
      },
    });

    const session = await provider.getPaymentSession({ sessionId: 'cks_fail' });
    expect(session.paymentStatus).toBe(PaymentStatus.FAILED);
    expect((session.paymentResult as any)?.id).toBe('cks_fail');
  });
});

describe('DodoProvider.getPaymentEvent', () => {
  it('parses payment.succeeded event', async () => {
    const provider = createMockProvider({
      webhooks: {
        unwrap: () => ({
          type: 'payment.succeeded',
          data: {
            payment_id: 'pay_999',
            total_amount: 1999,
            currency: 'USD',
            created_at: '2026-01-01T00:00:00Z',
            metadata: { order_no: 'ORDER-999' },
          },
        }),
      },
    });

    const req = new Request('https://example.com/api/payment/notify/dodo', {
      method: 'POST',
      headers: {
        'webhook-id': 'wh_1',
        'webhook-signature': 'sig_1',
        'webhook-timestamp': '1234567890',
      },
      body: JSON.stringify({}),
    });

    const event = await provider.getPaymentEvent({ req });
    expect(event.eventType).toBe(PaymentEventType.PAYMENT_SUCCESS);
    expect(event.paymentSession?.paymentStatus).toBe(PaymentStatus.SUCCESS);
    expect(event.paymentSession?.paymentInfo?.paymentAmount).toBe(1999);
    expect(event.paymentSession?.paymentResult.id).toBe('ORDER-999');
  });

  it('parses subscription.renewed event', async () => {
    const provider = createMockProvider({
      webhooks: {
        unwrap: () => ({
          type: 'subscription.renewed',
          data: {
            subscription_id: 'sub_123',
            product_id: 'pdt_pro',
            recurring_pre_tax_amount: 1999,
            currency: 'USD',
            metadata: { order_no: 'ORDER-RENEW' },
            previous_billing_date: '2026-02-01T00:00:00Z',
            next_billing_date: '2026-03-01T00:00:00Z',
          },
        }),
      },
    });

    const req = new Request('https://example.com/api/payment/notify/dodo', {
      method: 'POST',
      headers: {
        'webhook-id': 'wh_2',
        'webhook-signature': 'sig_2',
        'webhook-timestamp': '1234567890',
      },
      body: JSON.stringify({}),
    });

    const event = await provider.getPaymentEvent({ req });
    expect(event.eventType).toBe(PaymentEventType.PAYMENT_SUCCESS);
    expect(event.paymentSession?.subscriptionId).toBe('sub_123');
    expect(event.paymentSession?.paymentInfo?.subscriptionCycleType).toBe(
      SubscriptionCycleType.RENEWAL
    );
  });

  it('parses subscription.cancelled event', async () => {
    const provider = createMockProvider({
      webhooks: {
        unwrap: () => ({
          type: 'subscription.cancelled',
          data: {
            subscription_id: 'sub_123',
            product_id: 'pdt_pro',
            status: 'cancelled',
            metadata: { order_no: 'ORDER-CANCEL' },
          },
        }),
      },
    });

    const req = new Request('https://example.com/api/payment/notify/dodo', {
      method: 'POST',
      headers: {
        'webhook-id': 'wh_3',
        'webhook-signature': 'sig_3',
        'webhook-timestamp': '1234567890',
      },
      body: JSON.stringify({}),
    });

    const event = await provider.getPaymentEvent({ req });
    expect(event.eventType).toBe(PaymentEventType.SUBSCRIBE_CANCELED);
    expect(event.paymentSession?.subscriptionInfo?.status).toBe(
      SubscriptionStatus.CANCELED
    );
  });

  it('throws WebhookIgnoredError for unknown events', async () => {
    const provider = createMockProvider({
      webhooks: {
        unwrap: () => ({
          type: 'unknown.event',
          data: {},
        }),
      },
    });

    const req = new Request('https://example.com/api/payment/notify/dodo', {
      method: 'POST',
      headers: {
        'webhook-id': 'wh_4',
        'webhook-signature': 'sig_4',
        'webhook-timestamp': '1234567890',
      },
      body: JSON.stringify({}),
    });

    await expect(provider.getPaymentEvent({ req })).rejects.toThrow(
      WebhookIgnoredError
    );
  });
});

describe('DodoProvider.cancelSubscription & getPaymentBilling', () => {
  it('cancels subscription with period end flag', async () => {
    const provider = createMockProvider();

    const res = await provider.cancelSubscription({
      subscriptionId: 'sub_123',
    });
    expect(res.subscriptionId).toBe('sub_123');
    expect(res.subscriptionInfo?.status).toBe(
      SubscriptionStatus.PENDING_CANCEL
    );
  });

  it('generates customer portal link', async () => {
    const provider = createMockProvider();

    const res = await provider.getPaymentBilling({
      customerId: 'cus_123',
      returnUrl: 'https://example.com/billing',
    });
    expect(res.billingUrl).toContain('portal/cus_123');
  });
});
