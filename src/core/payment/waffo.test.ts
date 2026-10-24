import { generateKeyPairSync } from 'node:crypto';
import { WaffoPancakeError } from '@waffo/pancake-ts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PaymentStatus, PaymentType } from './types';
import { WaffoApiError, WaffoProvider } from './waffo';

function buildProviderWithPayments(payments: Array<Record<string, unknown>>) {
  const provider = Object.create(WaffoProvider.prototype) as WaffoProvider;
  (provider as unknown as { client: { graphql: { query: unknown } } }).client =
    {
      graphql: {
        async query() {
          return { data: { payments } };
        },
      },
    };
  return provider;
}

describe('WaffoProvider.getPaymentSession amount completeness', () => {
  it('keeps PROCESSING when succeeded without amount details', async () => {
    const provider = buildProviderWithPayments([
      {
        id: 'pay-1',
        status: 'succeeded',
        orderId: 'ord-1',
        orderMerchantExternalId: 'ORDER-1',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const session = await provider.getPaymentSession({ sessionId: 'ORDER-1' });
    expect(session.paymentStatus).toBe(PaymentStatus.PROCESSING);
    expect(session.paymentInfo?.paymentAmount).toBeUndefined();
    expect(session.paymentInfo?.paymentCurrency).toBe('');
  });

  it('keeps PROCESSING when total is empty or currency is missing', async () => {
    for (const snapshotAmountDetails of [
      { currency: 'USD', total: '' },
      { currency: 'USD' },
      { total: '5.99' },
      { currency: '', total: '0' },
    ]) {
      const provider = buildProviderWithPayments([
        {
          id: 'pay-3',
          status: 'succeeded',
          orderId: 'ord-3',
          orderMerchantExternalId: 'ORDER-3',
          createdAt: '2026-01-01T00:00:00.000Z',
          snapshotAmountDetails,
        },
      ]);
      const session = await provider.getPaymentSession({
        sessionId: 'ORDER-3',
      });
      expect(session.paymentStatus).toBe(PaymentStatus.PROCESSING);
      expect(session.paymentInfo?.paymentAmount).toBeUndefined();
    }
  });

  it('returns SUCCESS with a genuine reported 0 (100% discount)', async () => {
    for (const total of ['0', '0.00']) {
      const provider = buildProviderWithPayments([
        {
          id: 'pay-4',
          status: 'succeeded',
          orderId: 'ord-4',
          orderMerchantExternalId: 'ORDER-4',
          createdAt: '2026-01-01T00:00:00.000Z',
          snapshotAmountDetails: { currency: 'USD', total },
        },
      ]);
      const session = await provider.getPaymentSession({
        sessionId: 'ORDER-4',
      });
      expect(session.paymentStatus).toBe(PaymentStatus.SUCCESS);
      expect(session.paymentInfo?.paymentAmount).toBe(0);
      expect(session.paymentInfo?.paymentCurrency).toBe('USD');
    }
  });

  it('returns SUCCESS when succeeded with amount details', async () => {
    const provider = buildProviderWithPayments([
      {
        id: 'pay-2',
        status: 'succeeded',
        orderId: 'ord-2',
        orderMerchantExternalId: 'ORDER-2',
        createdAt: '2026-01-01T00:00:00.000Z',
        snapshotAmountDetails: {
          currency: 'USD',
          total: '5.99',
        },
      },
    ]);

    const session = await provider.getPaymentSession({ sessionId: 'ORDER-2' });
    expect(session.paymentStatus).toBe(PaymentStatus.SUCCESS);
    expect(session.paymentInfo?.paymentAmount).toBe(599);
    expect(session.paymentInfo?.paymentCurrency).toBe('USD');
  });
});

describe('WaffoProvider webhook paymentInfo amounts', () => {
  const provider = Object.create(WaffoProvider.prototype) as WaffoProvider;
  const info = (data: Record<string, unknown>) =>
    (provider as any).paymentInfo(
      {
        orderId: 'ord-1',
        buyerEmail: 'a@b.c',
        productName: 'Pack',
        paymentId: 'pay-1',
        ...data,
      },
      'evt-1'
    );

  it('maps missing total/amount to undefined', () => {
    expect(info({ currency: 'USD' }).paymentAmount).toBeUndefined();
    expect(
      info({ currency: 'USD', total: '', amount: '' }).paymentAmount
    ).toBeUndefined();
  });

  it('maps missing currency to undefined', () => {
    expect(info({ total: '5.99' }).paymentAmount).toBeUndefined();
  });

  it('prefers total, falls back to amount, keeps a real 0', () => {
    expect(
      info({ currency: 'USD', total: '6.59', amount: '5.99' }).paymentAmount
    ).toBe(659);
    expect(info({ currency: 'USD', amount: '5.99' }).paymentAmount).toBe(599);
    expect(info({ currency: 'USD', total: '0' }).paymentAmount).toBe(0);
    expect(info({ currency: 'JPY', total: '1000' }).paymentAmount).toBe(1000);
  });
});

describe('WaffoProvider.createPayment price snapshot', () => {
  function providerCapturingCheckout() {
    const calls: Array<Record<string, any>> = [];
    const provider = Object.create(WaffoProvider.prototype) as WaffoProvider;
    (provider as any).client = {
      checkout: {
        authenticated: {
          async create(params: Record<string, any>) {
            calls.push(params);
            return { sessionId: 'sess-1', checkoutUrl: 'https://waffo/x' };
          },
        },
      },
    };
    return { provider, calls };
  }

  const baseOrder = {
    orderNo: 'ORD-1',
    productId: 'PROD_1',
    customer: { id: 'u1', email: 'a@b.c' },
    successUrl: 'https://app/cb',
  };

  it('one-time CNY: passes currency + exact amount snapshot', async () => {
    const { provider, calls } = providerCapturingCheckout();
    await provider.createPayment({
      order: {
        ...baseOrder,
        type: PaymentType.ONE_TIME,
        locale: 'zh',
        price: { amount: 7199, currency: 'cny' },
      } as any,
    });
    expect(calls[0]).toMatchObject({
      productId: 'PROD_1',
      currency: 'CNY',
      priceSnapshot: { amount: '71.99', taxCategory: 'digital_goods' },
      language: 'zh-Hans',
    });
  });

  it('subscription: no snapshot (keeps Waffo recurring price)', async () => {
    const { provider, calls } = providerCapturingCheckout();
    await provider.createPayment({
      order: {
        ...baseOrder,
        type: PaymentType.SUBSCRIPTION,
        price: { amount: 999, currency: 'usd' },
      } as any,
    });
    expect(calls[0].currency).toBe('USD');
    expect(calls[0].priceSnapshot).toBeUndefined();
  });
});

describe('WaffoProvider.resumeSubscription', () => {
  function providerWithAuth(
    opts: {
      token?: string;
      reactivateStatus?: string;
      reactivateError?: Error | ((environment?: string) => Error | undefined);
      issueError?: Error;
      environment?: 'test' | 'prod';
    } = { environment: 'test' }
  ) {
    const issueCalls: Record<string, unknown>[] = [];
    const reactivateCalls: Record<string, unknown>[] = [];
    const provider = Object.create(WaffoProvider.prototype) as WaffoProvider;
    (provider as any).configs = { environment: opts.environment };
    (provider as unknown as { client: unknown }).client = {
      auth: {
        issueSessionToken: async (params: Record<string, unknown>) => {
          issueCalls.push(params);
          if (opts.issueError) throw opts.issueError;
          return {
            token: opts.token ?? 'tok_1',
            expiresAt: '2099-01-01T00:00:00Z',
          };
        },
      },
      customer: (token: string, options?: { environment?: string }) => ({
        reactivateSubscription: async (params: Record<string, unknown>) => {
          const environment = options?.environment;
          reactivateCalls.push({ token, environment, ...params });
          const err =
            typeof opts.reactivateError === 'function'
              ? opts.reactivateError(environment)
              : opts.reactivateError;
          if (err) throw err;
          return {
            orderId: params.orderId,
            status: opts.reactivateStatus ?? 'active',
          };
        },
      }),
    };
    return { provider, issueCalls, reactivateCalls };
  }

  it('issues a session token then reactivates the canceling order', async () => {
    const { provider, issueCalls, reactivateCalls } = providerWithAuth();
    const session = await provider.resumeSubscription({
      subscriptionId: 'ORD_1',
      buyerIdentity: 'user_1',
      productId: 'PROD_1',
    });
    expect(issueCalls).toEqual([
      { productId: 'PROD_1', buyerIdentity: 'user_1' },
    ]);
    // X-Environment must match the order (SDK sends it from this option).
    expect(reactivateCalls).toEqual([
      { token: 'tok_1', environment: 'test', orderId: 'ORD_1' },
    ]);
    expect(session.subscriptionInfo?.status).toBe('active');
    expect(session.subscriptionInfo?.resumed).toBe(true);
    expect(session.subscriptionId).toBe('ORD_1');
  });

  it('requires subscriptionId, buyerIdentity, and productId', async () => {
    const { provider } = providerWithAuth();
    await expect(
      provider.resumeSubscription({
        subscriptionId: '',
        buyerIdentity: 'u',
        productId: 'P',
      })
    ).rejects.toThrow('subscriptionId is required');
    await expect(
      provider.resumeSubscription({ subscriptionId: 'ORD_1', productId: 'P' })
    ).rejects.toThrow('buyerIdentity is required');
    await expect(
      provider.resumeSubscription({
        subscriptionId: 'ORD_1',
        buyerIdentity: 'u',
      })
    ).rejects.toThrow('productId is required');
  });

  it('fails when reactivate does not return active', async () => {
    const { provider } = providerWithAuth({ reactivateStatus: 'canceling' });
    await expect(
      provider.resumeSubscription({
        subscriptionId: 'ORD_1',
        buyerIdentity: 'u',
        productId: 'PROD_1',
      })
    ).rejects.toThrow('Resume subscription failed');
  });

  it('surfaces the Waffo errors[] in the thrown message', async () => {
    const { provider } = providerWithAuth({
      environment: 'prod',
      reactivateError: new WaffoPancakeError(401, [
        { message: 'Authentication failed', layer: 'gateway' } as any,
      ]),
    });
    const err = await provider
      .resumeSubscription({
        subscriptionId: 'ORD_1',
        buyerIdentity: 'u',
        productId: 'PROD_1',
      })
      .catch((e) => e);
    expect(err).toBeInstanceOf(WaffoApiError);
    expect(err.message).toContain('reactivate-order failed (401)');
    expect(err.message).toContain('Authentication failed');
    expect(err.message).not.toContain('tok_1');
    expect(err.notReactivatable).toBe(false);
  });

  it('flags orders Waffo will never reactivate', async () => {
    for (const message of [
      'Only canceling subscriptions can be reactivated',
      'Subscription with an unpaid balance cannot be reactivated',
      'Subscription with a confirmed plan change cannot be reactivated',
    ]) {
      const { provider } = providerWithAuth({
        environment: 'prod',
        reactivateError: new WaffoPancakeError(400, [
          { message, layer: 'order' } as any,
        ]),
      });
      const err = await provider
        .resumeSubscription({
          subscriptionId: 'ORD_1',
          buyerIdentity: 'u',
          productId: 'PROD_1',
        })
        .catch((e) => e);
      expect(err.notReactivatable).toBe(true);
    }
  });

  it('wraps a failed token issue', async () => {
    const { provider, reactivateCalls } = providerWithAuth({
      environment: 'prod',
      issueError: new WaffoPancakeError(404, [
        { message: 'Product not found', layer: 'product' } as any,
      ]),
    });
    await expect(
      provider.resumeSubscription({
        subscriptionId: 'ORD_1',
        buyerIdentity: 'u',
        productId: 'PROD_1',
      })
    ).rejects.toThrow('issue-session-token failed (404)');
    expect(reactivateCalls).toEqual([]);
  });

  it('without waffo_environment tries prod, then test on Order not found', async () => {
    const { provider, reactivateCalls } = providerWithAuth({
      environment: undefined,
      reactivateError: (env) =>
        env === 'prod'
          ? new WaffoPancakeError(404, [
              { message: 'Order not found', layer: 'order' } as any,
            ])
          : undefined,
    });
    const session = await provider.resumeSubscription({
      subscriptionId: 'ORD_1',
      buyerIdentity: 'u',
      productId: 'PROD_1',
    });
    expect(reactivateCalls.map((c) => c.environment)).toEqual(['prod', 'test']);
    expect(session.subscriptionInfo?.status).toBe('active');
  });
});

describe('WaffoProvider session token freshness', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('mints session tokens without the replayed idempotency key', async () => {
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    const seen: Array<{ url: string; headers: Headers }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: any, init?: RequestInit) => {
        seen.push({ url: String(input), headers: new Headers(init?.headers) });
        return new Response(
          JSON.stringify({
            data: { token: 'tok_x', expiresAt: '2099-01-01T00:00:00Z' },
          }),
          { status: 200 }
        );
      })
    );
    const provider = new WaffoProvider({
      merchantId: 'MER_2aUyqjCzEIiEcYMKj7TZtw',
      privateKey,
      environment: 'test',
    });
    await (provider as any).client.auth.issueSessionToken({
      productId: 'PROD_5HOIULBVawwiapdLxX9SMf',
      buyerIdentity: 'u1',
    });
    expect(seen[0].url).toContain('/v1/actions/auth/issue-session-token');
    expect(seen[0].headers.get('X-Idempotency-Key')).toBeNull();
    expect(seen[0].headers.get('X-Signature')).toBeTruthy();
  });
});

describe('WaffoProvider period dates when Waffo omits them', () => {
  it('infers yearly currentPeriodEnd instead of both ends = now', () => {
    const provider = Object.create(WaffoProvider.prototype) as WaffoProvider;
    const info = (
      provider as unknown as {
        subscriptionInfo: (data: Record<string, unknown>) => {
          currentPeriodStart: Date;
          currentPeriodEnd: Date;
          interval: string;
        };
      }
    ).subscriptionInfo({
      orderId: 'ORD_1',
      billingPeriod: 'yearly',
      orderStatus: 'active',
      currentPeriodStart: undefined,
      currentPeriodEnd: undefined,
      total: '106.80',
      currency: 'USD',
    });
    const span =
      info.currentPeriodEnd.getTime() - info.currentPeriodStart.getTime();
    expect(span).toBeGreaterThan(300 * 86_400_000);
    expect(info.interval).toBe('year');
  });
});
