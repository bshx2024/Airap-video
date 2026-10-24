import { m } from '@/paraglide/messages.js';

// Dynamic message lookup for keys built at runtime (tab labels, keyed
// lists). Prefer static `m["ns.key"]()` whenever the key is known —
// dynamic access opts the whole message bundle out of tree-shaking.
export function tDynamic(
  key: string,
  paramsOrFallback?: Record<string, unknown> | string,
  fallback?: string
): string {
  const fn = (m as Record<string, unknown>)[key];
  const params =
    paramsOrFallback && typeof paramsOrFallback === 'object'
      ? paramsOrFallback
      : undefined;
  const fb = typeof paramsOrFallback === 'string' ? paramsOrFallback : fallback;
  if (typeof fn === 'function') {
    return (fn as (args?: Record<string, unknown>) => string)(params);
  }
  return fb !== undefined ? fb : key;
}
