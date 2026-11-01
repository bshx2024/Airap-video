/**
 * Multi-touch Attribution Engine for ShipAny Video Lite.
 * Captures First Touch (initial discovery) & Last Touch (converting campaign)
 * with intelligent referrer classification and dual-storage persistence (localStorage + Cookie).
 */

export interface TouchAttribution {
  source: string;
  medium: string;
  campaign: string;
  term?: string;
  content?: string;
  referrer: string;
  landing: string;
  timestamp: number;
}

export interface AttributionPayload {
  first_source?: string;
  first_medium?: string;
  first_campaign?: string;
  first_term?: string;
  first_content?: string;
  first_referrer?: string;
  first_landing?: string;
  first_touch_at?: number;

  last_source?: string;
  last_medium?: string;
  last_campaign?: string;

  register_lang?: string;
}

const COOKIE_FT_KEY = 'attr_ft';
const COOKIE_LT_KEY = 'attr_lt';
const STORAGE_FT_KEY = 'attr_first_touch';
const STORAGE_LT_KEY = 'attr_last_touch';

const FT_MAX_AGE = 60 * 60 * 24 * 365; // 1 year (First Touch protection)
const LT_MAX_AGE = 60 * 60 * 24 * 30; // 30 days (Last Touch promotion)

function setCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === 'undefined') return;
  const isSecure = window.location.protocol === 'https:';
  document.cookie = `${name}=${value}; Max-Age=${maxAge}; Path=/; SameSite=Lax${
    isSecure ? '; Secure' : ''
  }`;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`));
  return match && match[3] ? match[3] : null;
}

/**
 * Intelligent parser for URL parameters and document.referrer
 */
export function parseTrafficSource(): {
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
  referrer: string;
  hasExplicitMarketing: boolean;
} {
  if (typeof window === 'undefined') {
    return {
      source: '',
      medium: '',
      campaign: '',
      term: '',
      content: '',
      referrer: '',
      hasExplicitMarketing: false,
    };
  }

  const urlParams = new URLSearchParams(window.location.search);

  // 1. Check UTM and custom parameters
  const utmSource = urlParams.get('utm_source')?.trim();
  const utmMedium = urlParams.get('utm_medium')?.trim();
  const utmCampaign = urlParams.get('utm_campaign')?.trim();
  const utmTerm = urlParams.get('utm_term')?.trim();
  const utmContent = urlParams.get('utm_content')?.trim();

  const refParam = urlParams.get('ref')?.trim();
  const fParam = urlParams.get('f')?.trim();
  const channelParam = urlParams.get('channel')?.trim();
  const affParam = urlParams.get('aff')?.trim();

  let source = utmSource || channelParam || refParam || fParam || '';
  let medium = utmMedium || '';
  const campaign = utmCampaign || '';
  const term = utmTerm || '';
  const content = utmContent || '';
  let hasExplicitMarketing = false;

  if (affParam) {
    if (!source) {
      source = `aff_${affParam}`;
      medium = 'referral';
    }
  }

  if (source || medium || campaign || term || content) {
    hasExplicitMarketing = true;
    if (!medium) {
      const s = source.toLowerCase();
      if (
        s.includes('chatgpt') ||
        s.includes('claude') ||
        s.includes('perplexity') ||
        s.includes('copilot') ||
        s.includes('gemini')
      ) {
        medium = 'ai_referral';
      } else {
        medium = 'campaign';
      }
    }
    return {
      source,
      medium,
      campaign,
      term,
      content,
      referrer: document.referrer || '',
      hasExplicitMarketing,
    };
  }

  // 2. Check Document Referrer
  const rawReferrer = document.referrer ? document.referrer.trim() : '';
  if (!rawReferrer) {
    return {
      source: 'direct',
      medium: 'none',
      campaign: '',
      term: '',
      content: '',
      referrer: '',
      hasExplicitMarketing: false,
    };
  }

  try {
    const refUrl = new URL(rawReferrer);
    const currentHost = window.location.hostname;

    // Filter out internal referrers
    if (
      refUrl.hostname === currentHost ||
      refUrl.hostname.endsWith(`.${currentHost}`)
    ) {
      return {
        source: '',
        medium: '',
        campaign: '',
        term: '',
        content: '',
        referrer: rawReferrer,
        hasExplicitMarketing: false,
      };
    }

    const host = refUrl.hostname.toLowerCase();

    // AI Assistants & LLM referral platforms (GEO tracking)
    if (host.includes('chatgpt.com') || host.includes('openai.com')) {
      source = 'chatgpt';
      medium = 'ai_referral';
    } else if (host.includes('claude.ai') || host.includes('anthropic.com')) {
      source = 'claude';
      medium = 'ai_referral';
    } else if (host.includes('perplexity.ai')) {
      source = 'perplexity';
      medium = 'ai_referral';
    } else if (
      host.includes('gemini.google.com') ||
      host.includes('bard.google.com')
    ) {
      source = 'gemini';
      medium = 'ai_referral';
    } else if (host.includes('copilot.microsoft.com')) {
      source = 'copilot';
      medium = 'ai_referral';
    } else if (host.includes('poe.com')) {
      source = 'poe';
      medium = 'ai_referral';
    } else if (host.includes('grok.com') || host.includes('x.ai')) {
      source = 'grok';
      medium = 'ai_referral';
    } else if (host.includes('kimi.moonshot.cn') || host.includes('kimi.ai')) {
      source = 'kimi';
      medium = 'ai_referral';
    } else if (host.includes('doubao.com')) {
      source = 'doubao';
      medium = 'ai_referral';
    }
    // Standard organic search engines
    else if (host.includes('google.')) {
      source = 'google';
      medium = 'organic';
    } else if (host.includes('bing.')) {
      source = 'bing';
      medium = 'organic';
    } else if (host.includes('baidu.')) {
      source = 'baidu';
      medium = 'organic';
    } else if (host.includes('duckduckgo.')) {
      source = 'duckduckgo';
      medium = 'organic';
    } else if (host.includes('yandex.')) {
      source = 'yandex';
      medium = 'organic';
    }
    // Social & Community platforms
    else if (
      host.includes('t.co') ||
      host.includes('twitter.') ||
      host.includes('x.com')
    ) {
      source = 'x';
      medium = 'social';
    } else if (host.includes('github.')) {
      source = 'github';
      medium = 'social';
    } else if (host.includes('reddit.')) {
      source = 'reddit';
      medium = 'social';
    } else if (host.includes('youtube.') || host.includes('youtu.be')) {
      source = 'youtube';
      medium = 'social';
    } else if (host.includes('tiktok.')) {
      source = 'tiktok';
      medium = 'social';
    } else if (host.includes('linkedin.')) {
      source = 'linkedin';
      medium = 'social';
    } else if (host.includes('facebook.') || host.includes('fb.com')) {
      source = 'facebook';
      medium = 'social';
    } else if (host.includes('discord.')) {
      source = 'discord';
      medium = 'community';
    } else if (host.includes('linux.do')) {
      source = 'linuxdo';
      medium = 'community';
    } else if (host.includes('v2ex.')) {
      source = 'v2ex';
      medium = 'community';
    } else if (host.includes('jike.') || host.includes('ruguoapp.com')) {
      source = 'jike';
      medium = 'social';
    } else if (host.includes('zhihu.')) {
      source = 'zhihu';
      medium = 'social';
    } else {
      source = refUrl.hostname.replace(/^www\./, '');
      medium = 'referral';
    }

    return {
      source,
      medium,
      campaign: '',
      term: '',
      content: '',
      referrer: rawReferrer,
      hasExplicitMarketing: true,
    };
  } catch {
    return {
      source: 'referral',
      medium: 'referral',
      campaign: '',
      term: '',
      content: '',
      referrer: rawReferrer,
      hasExplicitMarketing: true,
    };
  }
}

/**
 * Initialize attribution tracker on page load.
 * Safely saves to both localStorage and Cookies.
 */
export function initAttributionTracker(): void {
  if (typeof window === 'undefined') return;

  try {
    const traffic = parseTrafficSource();
    const now = Date.now();
    const landing = `${window.location.pathname}${window.location.search}`;

    // 1. First Touch Handling (Only write once, preserve original origin)
    const existingFT = getStoredTouch(STORAGE_FT_KEY, COOKIE_FT_KEY);
    if (!existingFT && traffic.source) {
      const ft: TouchAttribution = {
        source: traffic.source,
        medium: traffic.medium,
        campaign: traffic.campaign,
        term: traffic.term,
        content: traffic.content,
        referrer: traffic.referrer,
        landing,
        timestamp: now,
      };
      saveTouch(STORAGE_FT_KEY, COOKIE_FT_KEY, ft, FT_MAX_AGE);
    }

    // 2. Last Touch Handling (Update on any explicit marketing touch)
    if (traffic.hasExplicitMarketing && traffic.source) {
      const lt: TouchAttribution = {
        source: traffic.source,
        medium: traffic.medium,
        campaign: traffic.campaign,
        term: traffic.term,
        content: traffic.content,
        referrer: traffic.referrer,
        landing,
        timestamp: now,
      };
      saveTouch(STORAGE_LT_KEY, COOKIE_LT_KEY, lt, LT_MAX_AGE);
    }
  } catch (err) {
    console.error('[attribution] Tracker failed to record touch:', err);
  }
}

function saveTouch(
  storageKey: string,
  cookieKey: string,
  data: TouchAttribution,
  maxAge: number
): void {
  try {
    const serialized = JSON.stringify(data);
    window.localStorage.setItem(storageKey, serialized);
    setCookie(cookieKey, encodeURIComponent(serialized), maxAge);
  } catch {
    // ignore
  }
}

function getStoredTouch(
  storageKey: string,
  cookieKey: string
): TouchAttribution | null {
  try {
    if (typeof window !== 'undefined') {
      const fromStorage = window.localStorage.getItem(storageKey);
      if (fromStorage) {
        return JSON.parse(fromStorage);
      }
    }
    const fromCookie = getCookie(cookieKey);
    if (fromCookie) {
      return JSON.parse(decodeURIComponent(fromCookie));
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Returns attribution payload for registration or event tracking.
 */
export function getAttributionPayload(): AttributionPayload {
  if (typeof window === 'undefined') return {};

  const ft = getStoredTouch(STORAGE_FT_KEY, COOKIE_FT_KEY);
  const lt = getStoredTouch(STORAGE_LT_KEY, COOKIE_LT_KEY) || ft;

  const payload: AttributionPayload = {};

  if (ft) {
    payload.first_source = ft.source;
    payload.first_medium = ft.medium;
    payload.first_campaign = ft.campaign;
    payload.first_term = ft.term;
    payload.first_content = ft.content;
    payload.first_referrer = ft.referrer;
    payload.first_landing = ft.landing;
    payload.first_touch_at = ft.timestamp;
  }

  if (lt) {
    payload.last_source = lt.source;
    payload.last_medium = lt.medium;
    payload.last_campaign = lt.campaign;
  }

  if (typeof navigator !== 'undefined' && navigator.language) {
    payload.register_lang = navigator.language;
  }

  return payload;
}
