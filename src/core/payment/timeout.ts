/**
 * Upper bound for one HTTP call to a payment provider. Without it a slow
 * provider keeps the user's request (and the confirm dialog) hanging for the
 * SDK default (Stripe 80s, Dodo 60s × retries, plain fetch: no limit).
 */
export const PROVIDER_TIMEOUT_MS = 20_000;

/** A provider did not answer in time; message is safe to show to users. */
export class ProviderTimeoutError extends Error {
  readonly code = 'provider_timeout';

  constructor(
    public provider: string,
    public timeoutMs: number
  ) {
    super(
      `${provider} did not respond within ${Math.max(1, Math.round(timeoutMs / 1000))}s. Please try again.`
    );
    this.name = 'ProviderTimeoutError';
  }
}

/** Matches PROVIDER_TIMEOUT_MESSAGE in api-error-message.ts. */
export const PROVIDER_TIMEOUT_PATTERN =
  /^(.+) did not respond within (\d+)s\. Please try again\.$/;

/**
 * `fetch` that aborts after `timeoutMs` and throws ProviderTimeoutError.
 * A caller-supplied signal still works (either one aborts the request).
 */
export function fetchWithTimeout(
  provider: string,
  timeoutMs = PROVIDER_TIMEOUT_MS,
  baseFetch?: typeof fetch
): typeof fetch {
  return async (input, init) => {
    const doFetch = baseFetch ?? globalThis.fetch.bind(globalThis);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const outer = init?.signal;
    const onOuterAbort = () => controller.abort(outer?.reason);
    if (outer) {
      if (outer.aborted) controller.abort(outer.reason);
      else outer.addEventListener('abort', onOuterAbort, { once: true });
    }
    try {
      return await doFetch(input, { ...init, signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted && !outer?.aborted) {
        throw new ProviderTimeoutError(provider, timeoutMs);
      }
      throw error;
    } finally {
      clearTimeout(timer);
      outer?.removeEventListener('abort', onOuterAbort);
    }
  };
}

/**
 * True for our ProviderTimeoutError and the SDKs' own timeout errors
 * (Stripe: StripeConnectionError "...timeout...", Dodo/Stainless:
 * APIConnectionTimeoutError).
 */
export function isProviderTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { name?: string; type?: string; message?: string };
  if (e instanceof ProviderTimeoutError) return true;
  if (e.name === 'APIConnectionTimeoutError') return true;
  if (
    (e.type === 'StripeConnectionError' ||
      e.name === 'StripeConnectionError') &&
    /timeout/i.test(e.message || '')
  ) {
    return true;
  }
  return false;
}

/** User-facing message for any provider timeout (see isProviderTimeoutError). */
export function providerTimeoutMessage(error: unknown): string {
  if (error instanceof ProviderTimeoutError) return error.message;
  return new ProviderTimeoutError('Payment provider', PROVIDER_TIMEOUT_MS)
    .message;
}
