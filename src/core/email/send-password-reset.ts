import { eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { resolveEmailBrand } from '@/core/email/brand';
import { getEmailProvider } from '@/core/email/resolve-provider';
import {
  ResetPasswordEmail,
  type ResetPasswordEmailTexts,
} from '@/core/email/templates/reset-password';
import { account, verification } from '@/config/db/schema';
import {
  getCookieFromHeader,
  guessLocaleFromAcceptLanguage,
} from '@/lib/cookie';
import {
  formatResetEmailMessage,
  maskEmailForLog,
  PASSWORD_RESET_TOKEN_EXPIRES_IN_SECONDS,
  passwordResetVerificationIdentifier,
  resolvePasswordResetLocale,
} from '@/lib/password-reset';
import { cookieName } from '@/paraglide/runtime.js';

import enMessages from '../../../messages/en.json';
import zhMessages from '../../../messages/zh.json';

const recentResetEmailSentAt = new Map<string, number>();
const RESET_EMAIL_MIN_INTERVAL_MS = 60_000;

type ResetPasswordEmailMessages = ResetPasswordEmailTexts & {
  subject: string;
};

const FALLBACK_MESSAGES: ResetPasswordEmailMessages = {
  subject: 'Reset your password - {appName}',
  preview: 'Reset your {appName} password',
  heading: 'Reset your password',
  intro:
    'We received a request to reset the password for your {appName} account. Click the button below to set a new password.',
  button: 'Reset password',
  expires:
    'This link will expire in {minutes} minutes and can only be used once.',
  fallback_link:
    "If the button doesn't work, copy and paste this link into your browser:",
  ignore:
    "If you didn't request a password reset, you can safely ignore this email. Your password will not change.",
};

const MESSAGE_PACKS: Record<string, Record<string, string>> = {
  en: enMessages as Record<string, string>,
  zh: zhMessages as Record<string, string>,
};

function getResetPasswordEmailMessages(
  locale: string
): ResetPasswordEmailMessages {
  const pack = MESSAGE_PACKS[locale] || MESSAGE_PACKS.en || {};
  const pick = (key: string, fallback: string) =>
    String(pack[`emails.reset_password.${key}`] || fallback);
  return {
    subject: pick('subject', FALLBACK_MESSAGES.subject),
    preview: pick('preview', FALLBACK_MESSAGES.preview),
    heading: pick('heading', FALLBACK_MESSAGES.heading),
    intro: pick('intro', FALLBACK_MESSAGES.intro),
    button: pick('button', FALLBACK_MESSAGES.button),
    expires: pick('expires', FALLBACK_MESSAGES.expires),
    fallback_link: pick('fallback_link', FALLBACK_MESSAGES.fallback_link),
    ignore: pick('ignore', FALLBACK_MESSAGES.ignore),
  };
}

async function userHasCredentialAccount(userId: string): Promise<boolean> {
  if (!userId) return true; // route gate already validated; don't block send
  try {
    const rows = await db()
      .select({ providerId: account.providerId })
      .from(account)
      .where(eq(account.userId, userId));
    if (rows.length === 0) return true;
    return rows.some(
      (item: { providerId: string }) => item.providerId === 'credential'
    );
  } catch (error) {
    console.error('[auth] password reset credential lookup failed', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return true;
  }
}

async function invalidatePasswordResetToken(token: string): Promise<void> {
  if (!token) return;
  await db()
    .delete(verification)
    .where(
      eq(verification.identifier, passwordResetVerificationIdentifier(token))
    );
}

/**
 * Send the password reset email (better-auth `sendResetPassword`).
 * Never throws. OAuth-only is normally rejected earlier in `/api/auth/$`.
 */
export async function sendPasswordResetEmail({
  configs,
  user,
  url,
  token,
  request,
}: {
  configs: Record<string, string>;
  user: { id?: string | null; email?: string | null; locale?: string | null };
  url: string;
  token: string;
  request?: Request;
}) {
  const email = String(user?.email || '').trim();
  const maskedEmail = maskEmailForLog(email);

  try {
    if (!email) return;

    const userId = String(user?.id || '');
    if (!(await userHasCredentialAccount(userId))) {
      await invalidatePasswordResetToken(token);
      console.log('[auth] password reset skipped: oauth-only account', {
        to: maskedEmail,
      });
      return;
    }

    const emailCtx = getEmailProvider(configs);
    if (!emailCtx) {
      console.error(
        '[auth] password reset email NOT sent: email provider is not configured.',
        { to: maskedEmail }
      );
      return;
    }

    const key = email.toLowerCase();
    const now = Date.now();
    const last = recentResetEmailSentAt.get(key) || 0;
    if (now - last < RESET_EMAIL_MIN_INTERVAL_MS) {
      console.log('[auth] password reset email throttled', { to: maskedEmail });
      return;
    }
    recentResetEmailSentAt.set(key, now);

    const headers = request?.headers;
    const locale = resolvePasswordResetLocale({
      url,
      cookieLocale: getCookieFromHeader(headers?.get('cookie'), cookieName),
      userLocale: user?.locale,
      acceptLanguage: guessLocaleFromAcceptLanguage(
        headers?.get('accept-language') ?? undefined
      ),
    });

    const { appName, logoUrl } = resolveEmailBrand(configs);
    const messages = getResetPasswordEmailMessages(locale);
    const values = {
      appName,
      minutes: Math.round(PASSWORD_RESET_TOKEN_EXPIRES_IN_SECONDS / 60),
    };
    const texts: ResetPasswordEmailTexts = {
      preview: formatResetEmailMessage(messages.preview, values),
      heading: formatResetEmailMessage(messages.heading, values),
      intro: formatResetEmailMessage(messages.intro, values),
      button: formatResetEmailMessage(messages.button, values),
      expires: formatResetEmailMessage(messages.expires, values),
      fallback_link: formatResetEmailMessage(messages.fallback_link, values),
      ignore: formatResetEmailMessage(messages.ignore, values),
    };
    const subject = formatResetEmailMessage(messages.subject, values);
    const text = [
      texts.intro,
      '',
      `${texts.button}: ${url}`,
      '',
      texts.expires,
      '',
      texts.ignore,
    ].join('\n');

    const result = await emailCtx.provider.sendEmail({
      to: email,
      subject,
      text,
      react: ResetPasswordEmail({
        appName,
        logoUrl,
        url,
        lang: locale,
        texts,
      }),
    });

    if (!result?.success) {
      recentResetEmailSentAt.delete(key);
      console.error('[auth] password reset email send failed', {
        to: maskedEmail,
        provider: result?.provider,
        error: result?.error,
      });
      return;
    }

    console.log('[auth] password reset email sent', {
      to: maskedEmail,
      provider: result.provider,
      messageId: result.messageId,
    });
  } catch (e) {
    console.error('[auth] password reset email send failed', {
      to: maskedEmail,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
