import { describe, expect, it } from 'vitest';

import { safeErrorMessage } from './safe-error-message';

describe('safeErrorMessage', () => {
  it('hides raw provider errors behind the fallback', () => {
    expect(
      safeErrorMessage(
        new Error(
          '422 Only full_immediately proration mode is allowed with effective_at: next_billing_date'
        ),
        'Plan change failed'
      )
    ).toBe('Plan change failed');
    expect(
      safeErrorMessage(new Error('No such price: price_123'), 'Checkout failed')
    ).toBe('Checkout failed');
    expect(safeErrorMessage(undefined, 'Cancellation failed')).toBe(
      'Cancellation failed'
    );
  });

  it('keeps our own (client-translated) messages', () => {
    expect(
      safeErrorMessage(
        new Error('Upgrade in progress. You can cancel once it completes.'),
        'Cancellation failed'
      )
    ).toBe('Upgrade in progress. You can cancel once it completes.');
    expect(safeErrorMessage(new Error('Subscription not found'), 'x')).toBe(
      'Subscription not found'
    );
    expect(
      safeErrorMessage(
        new Error("Payment provider 'dodo' is not configured"),
        'x'
      )
    ).toBe("Payment provider 'dodo' is not configured");
    expect(
      safeErrorMessage(new Error('Product pdt_x does not exist'), 'x')
    ).toBe('Product pdt_x does not exist');
  });
});
