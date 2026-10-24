import {
  baseLocale,
  extractLocaleFromUrl,
  isLocale,
} from '@/paraglide/runtime.js';

/** Reset link lifetime (seconds). Passed to better-auth `resetPasswordTokenExpiresIn`. */
export const PASSWORD_RESET_TOKEN_EXPIRES_IN_SECONDS = 60 * 60;

/** Client-side cooldown between two "send reset link" requests for one email. */
export const PASSWORD_RESET_RESEND_COOLDOWN_SECONDS = 60;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** better-auth stores reset tokens as `reset-password:<token>` in `verification`. */
export function passwordResetVerificationIdentifier(token: string) {
  return `reset-password:${token}`;
}

/**
 * Pick the locale for the reset email.
 *
 * Priority:
 * 1. Locale of the `callbackURL` embedded in the better-auth reset url
 * 2. PARAGLIDE_LOCALE cookie / user.locale / accept-language
 * 3. baseLocale
 */
export function resolvePasswordResetLocale(input: {
  url?: string | null;
  cookieLocale?: string | null;
  userLocale?: string | null;
  acceptLanguage?: string | null;
}): string {
  const callbackURL = getCallbackUrlFromResetUrl(input.url);
  if (callbackURL) {
    try {
      const href = callbackURL.startsWith('http')
        ? callbackURL
        : `https://dummy.local${callbackURL.startsWith('/') ? '' : '/'}${callbackURL}`;
      const fromUrl = extractLocaleFromUrl(href);
      if (fromUrl && isLocale(fromUrl)) return fromUrl;
    } catch {
      // fall through
    }
  }

  for (const candidate of [
    input.cookieLocale,
    input.userLocale,
    input.acceptLanguage,
  ]) {
    const normalized = normalizeLocaleCandidate(candidate);
    if (normalized) return normalized;
  }

  return baseLocale;
}

function getCallbackUrlFromResetUrl(url?: string | null): string {
  if (!url) return '';
  try {
    return new URL(url).searchParams.get('callbackURL') || '';
  } catch {
    return '';
  }
}

function normalizeLocaleCandidate(value?: string | null): string | null {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
  if (!raw) return null;
  const primary = raw.split(/[-_]/)[0] || raw;
  if (isLocale(primary)) return primary;
  if (isLocale(raw)) return raw;
  return null;
}

/** Replace `{name}` placeholders in a message. */
export function formatResetEmailMessage(
  template: string | undefined,
  values: Record<string, string | number> = {}
): string {
  return String(template || '').replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? String(values[key]) : match
  );
}

/** Mask an email for logs, e.g. "jo***@example.com". */
export function maskEmailForLog(email?: string | null): string {
  const value = String(email || '').trim();
  const at = value.indexOf('@');
  if (at <= 0) return value ? '***' : '';
  const name = value.slice(0, at);
  return `${name.slice(0, 2)}***${value.slice(at)}`;
}
