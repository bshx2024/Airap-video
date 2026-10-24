import MarkdownIt from 'markdown-it';

import { formatDateTime } from '@/lib/time';
import { m } from '@/paraglide/messages.js';
import { locales } from '@/paraglide/runtime.js';

export const ANNOUNCEMENT_STORAGE_KEY = 'shipany_read_announcements';

export type AnnouncementItem = {
  id: string;
  title: string;
  content: string;
  createdAt: string | number | Date;
};

/** Ids already auto-prompted this tab (survives Header remounts within the SPA). */
const autoPromptedIds = new Set<string>();

export function wasAnnouncementAutoPrompted(id: string) {
  return autoPromptedIds.has(String(id));
}

export function markAnnouncementAutoPrompted(id: string) {
  autoPromptedIds.add(String(id));
}

export function readStoredAnnouncementIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function writeStoredAnnouncementIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      ANNOUNCEMENT_STORAGE_KEY,
      JSON.stringify([...new Set(ids.map(String))])
    );
  } catch {
    // ignore quota / private mode
  }
}

const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: true,
});

const defaultLinkRender =
  md.renderer.rules.link_open ||
  function (tokens, idx, options, _env, self) {
    return self.renderToken(tokens, idx, options);
  };

md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const hrefIndex = token.attrIndex('href');
  if (hrefIndex >= 0) {
    const href = token.attrGet('href');
    token.attrSet('rel', 'noreferrer noopener');
    if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
      token.attrSet('target', '_blank');
    }
  }
  return defaultLinkRender(tokens, idx, options, env, self);
};

export function renderAnnouncementHtml(content: string) {
  return md.render(content);
}

export function stripLocalePrefix(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  for (const loc of locales) {
    if (normalized === `/${loc}`) return '/';
    if (normalized.startsWith(`/${loc}/`)) {
      return normalized.slice(loc.length + 1) || '/';
    }
  }
  return normalized;
}

export function formatRelativeTime(
  input: Date | string | number | null | undefined,
  locale = 'en'
): string {
  if (!input) return '';
  const d = new Date(input);
  const now = Date.now();
  const diffSec = Math.round((d.getTime() - now) / 1000);
  try {
    // BCP47 tags for Intl; extend this map when adding locales (no isZh branching).
    const intlLocale =
      ({ zh: 'zh-CN', en: 'en-US' } as Record<string, string>)[locale] ??
      locale;
    const rtf = new Intl.RelativeTimeFormat(intlLocale, {
      numeric: 'auto',
    });
    const absSec = Math.abs(diffSec);
    if (absSec < 60) return m['common.time.just_now']();
    if (absSec < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
    if (absSec < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
    if (absSec < 2592000) return rtf.format(Math.round(diffSec / 86400), 'day');
  } catch {
    // fallback
  }
  return formatDateTime(input);
}
