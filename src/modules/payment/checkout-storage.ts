/**
 * What of a provider checkout session may be persisted on the order row.
 *
 * Waffo returns a customer token (`token`, and `#token=…` on the hosted
 * checkout / confirm URL). It authenticates the buyer on Waffo, so it is
 * never stored: the order keeps the URL without its fragment, and a "continue
 * payment" flow must create a fresh session instead of reusing a stored link.
 */

/** URL without its fragment (where Waffo puts `#token=…`). */
export function stripUrlFragment<T>(url: T): T {
  return (typeof url === 'string' ? url.split('#')[0] : url) as T;
}

const TOKEN_KEYS = ['token', 'customerToken', 'accessToken'];
const URL_KEYS = ['checkoutUrl', 'confirmUrl', 'url'];

/** Shallow copy of a Waffo session response without the customer token. */
export function withoutCustomerToken(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw ?? {};
  const copy: Record<string, unknown> = { ...(raw as Record<string, unknown>) };
  for (const key of TOKEN_KEYS) delete copy[key];
  for (const key of URL_KEYS) {
    if (typeof copy[key] === 'string') copy[key] = stripUrlFragment(copy[key]);
  }
  return copy;
}

/**
 * Order columns for a new checkout. Waffo: token-free; other providers are
 * stored as before (their URLs carry no buyer credential).
 */
export function checkoutFieldsForStorage(
  provider: string,
  checkoutInfo: Record<string, any>,
  checkoutResult: unknown
): { checkoutInfo: string; checkoutResult: string; checkoutUrl: string } {
  if (provider !== 'waffo') {
    return {
      checkoutInfo: JSON.stringify(checkoutInfo),
      checkoutResult: JSON.stringify(checkoutResult),
      checkoutUrl: checkoutInfo.checkoutUrl,
    };
  }
  const info = withoutCustomerToken(checkoutInfo) as Record<string, any>;
  return {
    checkoutInfo: JSON.stringify(info),
    checkoutResult: JSON.stringify(withoutCustomerToken(checkoutResult)),
    checkoutUrl: stripUrlFragment(checkoutInfo.checkoutUrl) || '',
  };
}
