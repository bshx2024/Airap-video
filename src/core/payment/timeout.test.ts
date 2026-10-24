import { describe, expect, it } from 'vitest';

import {
  fetchWithTimeout,
  isProviderTimeoutError,
  PROVIDER_TIMEOUT_PATTERN,
  ProviderTimeoutError,
  providerTimeoutMessage,
} from './timeout';

/** fetch stub that never answers until aborted. */
const hangingFetch: typeof fetch = (_input, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () =>
      reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    );
  });

describe('fetchWithTimeout', () => {
  it('throws ProviderTimeoutError when the provider hangs', async () => {
    const f = fetchWithTimeout('Waffo', 20, hangingFetch);
    await expect(f('https://api.example.test')).rejects.toBeInstanceOf(
      ProviderTimeoutError
    );
    await expect(f('https://api.example.test')).rejects.toThrow(
      'Waffo did not respond within 1s. Please try again.'
    );
  });

  it('passes fast responses through', async () => {
    const ok = new Response('{}', { status: 200 });
    const f = fetchWithTimeout('Creem', 1000, async () => ok);
    await expect(f('https://api.example.test')).resolves.toBe(ok);
  });

  it('keeps a caller abort as a plain abort (not a timeout)', async () => {
    const controller = new AbortController();
    const f = fetchWithTimeout('Creem', 10_000, hangingFetch);
    const pending = f('https://api.example.test', {
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rethrows network errors unchanged', async () => {
    const f = fetchWithTimeout('Creem', 1000, async () => {
      throw new TypeError('network down');
    });
    await expect(f('https://api.example.test')).rejects.toThrow('network down');
  });
});

describe('isProviderTimeoutError / message', () => {
  it('recognises our error and SDK timeouts', () => {
    expect(
      isProviderTimeoutError(new ProviderTimeoutError('Waffo', 15000))
    ).toBe(true);
    expect(
      isProviderTimeoutError(
        Object.assign(new Error('Request timed out.'), {
          name: 'APIConnectionTimeoutError',
        })
      )
    ).toBe(true);
    expect(
      isProviderTimeoutError({
        type: 'StripeConnectionError',
        message: 'Request aborted due to timeout being reached (20000ms)',
      })
    ).toBe(true);
    expect(isProviderTimeoutError(new Error('card declined'))).toBe(false);
    expect(isProviderTimeoutError(null)).toBe(false);
  });

  it('produces a message the client can localise', () => {
    expect(
      providerTimeoutMessage(new ProviderTimeoutError('Waffo', 15000))
    ).toMatch(PROVIDER_TIMEOUT_PATTERN);
    expect(providerTimeoutMessage(new Error('x'))).toBe(
      'Payment provider did not respond within 20s. Please try again.'
    );
  });
});
