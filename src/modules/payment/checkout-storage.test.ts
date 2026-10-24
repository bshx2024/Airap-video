import { describe, expect, it } from 'vitest';

import {
  checkoutFieldsForStorage,
  stripUrlFragment,
  withoutCustomerToken,
} from './checkout-storage';

const live = 'https://checkout.waffo.ai/s/cs_123?lang=zh#token=SECRET_TOKEN';

describe('checkout storage (Waffo customer token)', () => {
  it('first checkout: stored order fields carry no token', () => {
    const fields = checkoutFieldsForStorage(
      'waffo',
      { sessionId: 'cs_123', checkoutUrl: live },
      {
        sessionId: 'cs_123',
        checkoutUrl: live,
        token: 'SECRET_TOKEN',
        expiresAt: '2026-10-19T03:00:00Z',
      }
    );
    expect(fields.checkoutUrl).toBe(
      'https://checkout.waffo.ai/s/cs_123?lang=zh'
    );
    const all = JSON.stringify(fields);
    expect(all).not.toContain('SECRET_TOKEN');
    expect(all).not.toContain('#token');
    expect(JSON.parse(fields.checkoutInfo)).toEqual({
      sessionId: 'cs_123',
      checkoutUrl: 'https://checkout.waffo.ai/s/cs_123?lang=zh',
    });
    expect(JSON.parse(fields.checkoutResult)).toMatchObject({
      sessionId: 'cs_123',
      expiresAt: '2026-10-19T03:00:00Z',
    });
  });

  it('other providers are stored unchanged', () => {
    const url = 'https://checkout.stripe.com/c/pay/cs_test_1#fidkdWxOYHwn';
    const fields = checkoutFieldsForStorage(
      'stripe',
      { sessionId: 'cs_test_1', checkoutUrl: url },
      { id: 'cs_test_1', url }
    );
    expect(fields.checkoutUrl).toBe(url);
    expect(JSON.parse(fields.checkoutResult)).toEqual({
      id: 'cs_test_1',
      url,
    });
  });

  it('helpers tolerate empty input', () => {
    expect(stripUrlFragment(undefined)).toBeUndefined();
    expect(withoutCustomerToken(null)).toEqual({});
    expect(
      checkoutFieldsForStorage('waffo', { sessionId: 's' }, undefined)
        .checkoutUrl
    ).toBe('');
  });
});
