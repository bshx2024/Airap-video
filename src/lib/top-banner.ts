export type TopBannerItemConfig = {
  id?: string;
  text: string;
  buttonText?: string;
  href?: string;
  target?: '_self' | '_blank';
};

export type TopBannerConfigs = {
  id: string;
  enabled: boolean;
  items: TopBannerItemConfig[];
  stayDuration: number;
  scrollDuration: number;
  dismissedExpiryDays: number;
};

/** Demo HTML link embedded in the admin fill-template placeholder. */
const DEMO_LINK_ZH =
  '<a href="https://example.com" target="_blank" rel="noreferrer" class="underline underline-offset-2 font-medium">示例链接</a>';
const DEMO_LINK_EN =
  '<a href="https://example.com" target="_blank" rel="noreferrer" class="underline underline-offset-2 font-medium">demo link</a>';

/** Placeholder + fill-template body for `top_banner_items` (locale-keyed JSON). */
export function topBannerItemsPlaceholder(): string {
  return JSON.stringify(
    {
      zh: [`🎉 欢迎使用 Video Lite — 点击查看${DEMO_LINK_ZH}`],
      en: [`🎉 Welcome to Video Lite — see the ${DEMO_LINK_EN}`],
    },
    null,
    2
  );
}

function getSimpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/** Allow simple rich text / links in admin announcements; strip executable markup. */
export function sanitizeBannerHtml(input: string): string {
  return String(input || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(
      /<\/?(?:iframe|object|embed|link|meta|base|form|svg|math)[^>]*>/gi,
      ''
    )
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(
      /\s(href|src|xlink:href)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi,
      ''
    )
    .replace(/\s(href|src|xlink:href)\s*=\s*javascript:[^\s>]*/gi, '');
}

export function sanitizeBannerHref(href?: string): string | undefined {
  if (!href || typeof href !== 'string') return undefined;
  const value = href.trim();
  if (!value) return undefined;
  if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  if (value.startsWith('#')) return value;
  return undefined;
}

function sanitizeBannerTarget(target?: string): '_self' | '_blank' | undefined {
  if (target === '_blank' || target === '_self') return target;
  return undefined;
}

function clampPositive(value: number, fallback: number, max = 3600): number {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(value, max);
}

function normalizeBannerItem(
  item: TopBannerItemConfig,
  index: number
): TopBannerItemConfig | null {
  const text = sanitizeBannerHtml(String(item.text || '').trim());
  if (!text) return null;
  return {
    id: item.id || `banner-${index}`,
    text,
    buttonText: item.buttonText ? String(item.buttonText) : undefined,
    href: sanitizeBannerHref(item.href ? String(item.href) : undefined),
    target: sanitizeBannerTarget(item.target ? String(item.target) : undefined),
  };
}

function parseItemList(raw: unknown): TopBannerItemConfig[] {
  const list = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  return list
    .map((item, index) => {
      if (typeof item === 'string') {
        return normalizeBannerItem({ text: item }, index);
      }
      if (item && typeof item === 'object' && 'text' in item) {
        const obj = item as Record<string, unknown>;
        return normalizeBannerItem(
          {
            id: typeof obj.id === 'string' ? obj.id : undefined,
            text: String(obj.text ?? ''),
            buttonText:
              typeof obj.buttonText === 'string' ? obj.buttonText : undefined,
            href: typeof obj.href === 'string' ? obj.href : undefined,
            target:
              obj.target === '_blank' || obj.target === '_self'
                ? obj.target
                : undefined,
          },
          index
        );
      }
      return null;
    })
    .filter(Boolean) as TopBannerItemConfig[];
}

function isLocaleMap(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.length === 0) return false;
  // Single announcement objects use `text` — never treat those as locale maps.
  if ('text' in value) return false;
  return keys.every((k) => {
    const v = (value as Record<string, unknown>)[k];
    return typeof v === 'string' || Array.isArray(v);
  });
}

function pickLocaleRaw(
  localeMap: Record<string, unknown>,
  locale: string
): unknown {
  if (locale in localeMap) return localeMap[locale];
  if ('en' in localeMap) return localeMap.en;
  if ('zh' in localeMap) return localeMap.zh;
  const first = Object.keys(localeMap)[0];
  return first ? localeMap[first] : undefined;
}

/**
 * Parse admin `top_banner_items` for the active UI locale.
 *
 * Supported shapes:
 * - Locale map: `{ "zh": ["…"], "en": ["…"] }` (recommended for i18n)
 * - JSON array / object with `text`
 * - Plain lines (one announcement per line, shared across locales)
 */
export function parseTopBannerItems(
  rawItems: string | undefined,
  locale: string
): TopBannerItemConfig[] {
  const trimmed = rawItems?.trim();
  if (!trimmed) return [];

  if (
    (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
    (trimmed.startsWith('{') && trimmed.endsWith('}'))
  ) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (isLocaleMap(parsed)) {
        return parseItemList(pickLocaleRaw(parsed, locale));
      }
      return parseItemList(parsed);
    } catch {
      // Fall through to line-by-line
    }
  }

  return trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text, index) => normalizeBannerItem({ text }, index))
    .filter(Boolean) as TopBannerItemConfig[];
}

export function resolveTopBannerConfigs(
  configs: Record<string, string> | undefined,
  locale: string
): TopBannerConfigs {
  const enabledStr = configs?.top_banner_enabled;
  const isEnabled =
    enabledStr === undefined
      ? false
      : enabledStr === 'true' || enabledStr === '1';

  const items = parseTopBannerItems(configs?.top_banner_items, locale);

  if (!isEnabled || items.length === 0) {
    return {
      id: 'topbanner-empty',
      enabled: false,
      items: [],
      stayDuration: 4,
      scrollDuration: 20,
      dismissedExpiryDays: 1,
    };
  }

  const stayDuration = clampPositive(
    Number(configs?.top_banner_stay_duration),
    4
  );
  const scrollDuration = clampPositive(
    Number(configs?.top_banner_scroll_duration),
    20
  );
  const dismissedExpiryDays = clampPositive(
    Number(configs?.top_banner_dismissed_expiry_days),
    1,
    365
  );

  const contentSign = `${locale}|${items.map((i) => i.text).join('|')}`;
  const id = `topbanner-${getSimpleHash(contentSign)}`;

  return {
    id,
    enabled: true,
    items,
    stayDuration,
    scrollDuration,
    dismissedExpiryDays,
  };
}
