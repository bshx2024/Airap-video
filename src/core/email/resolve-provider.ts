import type { EmailProvider } from '@/core/email';
import { formatSenderAddress, resolveEmailBrand } from '@/core/email/brand';
import { CloudflareEmailProvider } from '@/core/email/cloudflare';
import { ResendProvider } from '@/core/email/resend';

function getResendProvider(
  configs: Record<string, string>
): { provider: EmailProvider; from: string } | null {
  const apiKey = String(configs.resend_api_key || '').trim();
  const sender = String(configs.resend_sender_email || '').trim();
  if (!apiKey || !sender) return null;
  const { appName } = resolveEmailBrand(configs);
  const from = formatSenderAddress(sender, appName);
  return { provider: new ResendProvider({ apiKey, defaultFrom: from }), from };
}

function getCloudflareProvider(
  configs: Record<string, string>
): { provider: EmailProvider; from: string } | null {
  const apiToken = String(configs.cloudflare_email_api_token || '').trim();
  const accountId = String(configs.cloudflare_email_account_id || '').trim();
  const sender = String(configs.cloudflare_email_sender_email || '').trim();
  if (!apiToken || !accountId || !sender) return null;
  const { appName } = resolveEmailBrand(configs);
  const from = formatSenderAddress(sender, appName);
  return {
    provider: new CloudflareEmailProvider({
      apiToken,
      accountId,
      defaultFrom: from,
    }),
    from,
  };
}

/**
 * Build the configured email provider from admin settings.
 * Returns null if the chosen provider is not fully configured.
 * If the selected provider is incomplete, fall back to the other one when available.
 */
export function getEmailProvider(
  configs: Record<string, string>
): { provider: EmailProvider; from: string } | null {
  const selected = String(configs.email_provider || 'resend')
    .trim()
    .toLowerCase();

  if (selected === 'cloudflare') {
    return getCloudflareProvider(configs) || getResendProvider(configs);
  }

  return getResendProvider(configs) || getCloudflareProvider(configs);
}

/** Check whether email sending is available for the selected provider */
export function isEmailConfigured(configs: Record<string, string>): boolean {
  return getEmailProvider(configs) !== null;
}
