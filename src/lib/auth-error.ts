import { tDynamic } from '@/core/i18n/dynamic';
import { m } from '@/paraglide/messages.js';

/** better-auth error.code → i18n key */
const AUTH_ERROR_CODE_KEYS: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'common.sign.error.invalid_email_or_password',
  INVALID_EMAIL: 'common.sign.error.invalid_email',
  INVALID_PASSWORD: 'common.sign.error.invalid_password',
  USER_NOT_FOUND: 'common.sign.error.user_not_found',
  USER_ALREADY_EXISTS: 'common.sign.error.user_already_exists',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    'common.sign.error.user_already_exists_email',
  EMAIL_NOT_VERIFIED: 'common.sign.error.email_not_verified',
  PASSWORD_TOO_SHORT: 'common.sign.error.password_too_short',
  PASSWORD_TOO_LONG: 'common.sign.error.password_too_long',
  INVALID_TOKEN: 'common.sign.error.invalid_token',
  TOKEN_EXPIRED: 'common.sign.error.token_expired',
  CREDENTIAL_ACCOUNT_NOT_FOUND: 'common.sign.error.credential_not_found',
  SESSION_EXPIRED: 'common.sign.error.session_expired',
  FAILED_TO_CREATE_USER: 'common.sign.error.failed_to_create_user',
  FAILED_TO_CREATE_SESSION: 'common.sign.error.failed_to_create_session',
  VERIFICATION_EMAIL_NOT_ENABLED:
    'common.sign.error.verification_email_not_enabled',
  EMAIL_ALREADY_VERIFIED: 'common.sign.error.email_already_verified',
  SOCIAL_ACCOUNT_ALREADY_LINKED:
    'common.sign.error.social_account_already_linked',
  ACCOUNT_NOT_FOUND: 'common.sign.error.account_not_found',
};

/** better-auth English message → i18n key (fallback when code missing) */
const AUTH_ERROR_MESSAGE_KEYS: Record<string, string> = {
  'Invalid email or password': 'common.sign.error.invalid_email_or_password',
  'Invalid email': 'common.sign.error.invalid_email',
  'Invalid password': 'common.sign.error.invalid_password',
  'User not found': 'common.sign.error.user_not_found',
  'User already exists.': 'common.sign.error.user_already_exists',
  'User already exists. Use another email.':
    'common.sign.error.user_already_exists_email',
  'Email not verified': 'common.sign.error.email_not_verified',
  'Password too short': 'common.sign.error.password_too_short',
  'Password too long': 'common.sign.error.password_too_long',
  'Invalid token': 'common.sign.error.invalid_token',
  'Token expired': 'common.sign.error.token_expired',
  'Credential account not found': 'common.sign.error.credential_not_found',
  'Session expired. Re-authenticate to perform this action.':
    'common.sign.error.session_expired',
  'Failed to create user': 'common.sign.error.failed_to_create_user',
  'Failed to create session': 'common.sign.error.failed_to_create_session',
  "Verification email isn't enabled":
    'common.sign.error.verification_email_not_enabled',
  'Email is already verified': 'common.sign.error.email_already_verified',
  'Social account already linked':
    'common.sign.error.social_account_already_linked',
  'Account not found': 'common.sign.error.account_not_found',
};

/**
 * Localize better-auth client errors by `code` first, then English `message`.
 * Prefer the localized `fallback` over unknown English strings.
 */
export function authErrorMessage(err: unknown, fallback?: string): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code || '')
      : '';
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message?: unknown }).message || '')
          : '';

  const byCode = code ? AUTH_ERROR_CODE_KEYS[code] : undefined;
  if (byCode) return tDynamic(byCode);

  const byMsg = raw ? AUTH_ERROR_MESSAGE_KEYS[raw] : undefined;
  if (byMsg) return tDynamic(byMsg);

  return fallback || raw || m['common.error.failed']();
}
