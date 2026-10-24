import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Customer portal URL for the caller's own current subscription
 * (tinyship /api/subscription/portal, adapted): provider and customer come
 * from the subscription, never from the request.
 */
const state = vi.hoisted(() => ({
  view: null as Record<string, any> | null,
  billing: vi.fn(async (_p: any) => ({ billingUrl: 'https://portal/s' })),
  getSub: vi.fn(async () => ({
    subscriptionResult: { customer: 'cus_fresh' },
  })),
  providers: {} as Record<string, any>,
}));

vi.mock('./plan-change-service', () => ({
  getCurrentSubscriptionView: async () => state.view,
}));

vi.mock('./service', () => ({
  getPaymentManager: async () => ({
    getProvider: (name: string) => state.providers[name] || null,
  }),
}));

const { createCustomerPortalUrl, portalCustomerId, CustomerPortalError } =
  await import('./customer-portal');

const sub = (extra: Record<string, any> = {}) => ({
  userId: 'u1',
  subscriptionNo: 'SUB-1',
  subscriptionId: 'sub_1',
  paymentProvider: 'stripe',
  status: 'active',
  subscriptionResult: JSON.stringify({ customer: 'cus_1' }),
  ...extra,
});

beforeEach(() => {
  state.view = sub();
  state.billing = vi.fn(async () => ({ billingUrl: 'https://portal/s' }));
  state.getSub = vi.fn(async () => ({
    subscriptionResult: { customer: 'cus_fresh' },
  }));
  state.providers = {
    stripe: {
      name: 'stripe',
      getPaymentBilling: state.billing,
      getSubscription: state.getSub,
    },
  };
});

describe('portalCustomerId', () => {
  it('reads Stripe / Creem / Dodo customer shapes', () => {
    expect(portalCustomerId({ customer: 'cus_1' })).toBe('cus_1');
    expect(portalCustomerId({ customer: { id: 'cus_2' } })).toBe('cus_2');
    expect(portalCustomerId({ customer: { customer_id: 'cus_3' } })).toBe(
      'cus_3'
    );
    expect(portalCustomerId(JSON.stringify({ customer: 'cus_4' }))).toBe(
      'cus_4'
    );
    expect(portalCustomerId(null)).toBeNull();
    expect(portalCustomerId('not json')).toBeNull();
  });
});

describe('createCustomerPortalUrl', () => {
  it('opens the portal for the caller, with our return URL', async () => {
    const res = await createCustomerPortalUrl('u1', 'https://app/billing');
    expect(res).toEqual({ url: 'https://portal/s', provider: 'stripe' });
    expect(state.billing).toHaveBeenCalledWith({
      customerId: 'cus_1',
      returnUrl: 'https://app/billing',
    });
  });

  it('asks the provider for the customer id when it is not stored', async () => {
    state.view = sub({ subscriptionResult: null });
    const res = await createCustomerPortalUrl('u1', 'https://app/billing');
    expect(res.url).toBe('https://portal/s');
    expect(state.getSub).toHaveBeenCalledWith({ subscriptionId: 'sub_1' });
    expect(state.billing.mock.calls[0][0].customerId).toBe('cus_fresh');
  });

  it('Waffo: the fixed consumer portal, no provider call', async () => {
    state.view = sub({ paymentProvider: 'waffo' });
    const res = await createCustomerPortalUrl('u1', 'https://app/billing');
    expect(res.url).toBe('https://pancake.waffo.ai/consumer/portal/login');
    expect(res.provider).toBe('waffo');
  });

  it('refuses without a subscription, or for a provider without a portal', async () => {
    state.view = null;
    await expect(createCustomerPortalUrl('u1', 'x')).rejects.toMatchObject({
      code: 'no_subscription',
    });
    state.view = sub({ paymentProvider: 'paypal' });
    await expect(createCustomerPortalUrl('u1', 'x')).rejects.toBeInstanceOf(
      CustomerPortalError
    );
  });

  it('a provider error becomes portal_failed, no url leaked', async () => {
    state.billing.mockRejectedValue(new Error('boom'));
    await expect(createCustomerPortalUrl('u1', 'x')).rejects.toMatchObject({
      code: 'portal_failed',
    });
  });
});
