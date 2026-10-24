import { envConfigs } from '@/config';

/**
 * Resolve app name / logo for transactional emails.
 * Prefer admin settings (DB configs), then env defaults.
 * Email clients don't render SVG `<img>`; SVG logos are omitted.
 */
export function resolveEmailBrand(configs: Record<string, string>): {
  appName: string;
  logoUrl?: string;
} {
  const appName =
    String(configs.app_name || '').trim() || envConfigs.app_name || 'App';
  const rawLogo =
    String(configs.app_logo || '').trim() ||
    String(envConfigs.app_logo || '').trim();
  const logo = /\.svg(\?|#|$)/i.test(rawLogo) ? '' : rawLogo;
  if (!logo) {
    return { appName };
  }

  if (logo.startsWith('http')) {
    return { appName, logoUrl: logo };
  }

  const base =
    String(envConfigs.app_url || '').trim() ||
    String(configs.app_url || '').trim();
  if (!base) {
    return { appName };
  }

  return {
    appName,
    logoUrl: `${base}${logo.startsWith('/') ? '' : '/'}${logo}`,
  };
}

/**
 * Build Resend/Cloudflare `from` value.
 * - Bare email `a@b.com` → `AppName <a@b.com>`
 * - Already formatted `Name <a@b.com>` → kept as-is
 */
export function formatSenderAddress(
  sender: string | null | undefined,
  displayName?: string | null
): string {
  const raw = String(sender || '').trim();
  if (!raw) return '';

  if (/^(.+?)\s<[^\s<>]+@[^\s<>]+>$/.test(raw)) {
    return raw;
  }

  const name = String(displayName || '').trim();
  if (!name) return raw;
  if (/[,"\\<>]/.test(name)) {
    return `"${name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}" <${raw}>`;
  }
  return `${name} <${raw}>`;
}
