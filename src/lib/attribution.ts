/**
 * Double-Touch Attribution Engine (Client-Side Dual-Storage).
 * Inspired by APIVALE's attribution.ts.
 *
 * Ensures attribution is persisted in both localStorage and cookies,
 * protecting against mobile in-app browser context switches and Safari ITP limitations.
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
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrer?: string;
  firstLanding?: string;
  firstTouchAt?: number;
  lastSource?: string;
  lastMedium?: string;
  lastCampaign?: string;
}

const STORAGE_FT_KEY = 'attr_first_touch';
const STORAGE_LT_KEY = 'attr_last_touch';
const COOKIE_FT_KEY = 'attr_ft';
const COOKIE_LT_KEY = 'attr_lt';

const FT_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const LT_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, maxAgeSec: number): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSec}; Path=/; SameSite=Lax`;
}

function getStoredTouch(storageKey: string, cookieKey: string): TouchAttribution | null {
  if (typeof window === 'undefined') return null;
  try {
    const rawStorage = localStorage.getItem(storageKey);
    if (rawStorage) {
      return JSON.parse(rawStorage);
    }
  } catch {}

  const rawCookie = getCookie(cookieKey);
  if (rawCookie) {
    try {
      const parsed = JSON.parse(rawCookie);
      // Sync back to localStorage
      try {
        localStorage.setItem(storageKey, JSON.stringify(parsed));
      } catch {}
      return parsed;
    } catch {}
  }
  return null;
}

function saveTouch(
  storageKey: string,
  cookieKey: string,
  data: TouchAttribution,
  maxAgeSec: number
): void {
  const serialized = JSON.stringify(data);
  try {
    localStorage.setItem(storageKey, serialized);
  } catch {}
  setCookie(cookieKey, serialized, maxAgeSec);
}

/**
 * Parses traffic parameters directly on the client to handle SPA transitions or hydration
 */
export function initClientAttribution(): void {
  if (typeof window === 'undefined') return;

  try {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    const utmSource = params.get('utm_source')?.trim() || '';
    const utmMedium = params.get('utm_medium')?.trim() || '';
    const utmCampaign = params.get('utm_campaign')?.trim() || '';
    const utmTerm = params.get('utm_term')?.trim() || '';
    const utmContent = params.get('utm_content')?.trim() || '';

    // Quick aliases
    const channel = params.get('channel')?.trim() || '';
    const ref = params.get('ref')?.trim() || '';
    const f = params.get('f')?.trim() || '';
    const aff = params.get('aff')?.trim() || '';

    let source = utmSource || channel || ref || f || '';
    let medium = utmMedium || '';
    let campaign = utmCampaign || '';
    let hasExplicitMarketing = Boolean(source || medium || campaign || aff);

    if (aff && !source) {
      source = `aff_${aff}`;
      medium = 'referral';
    }

    const rawReferrer = document.referrer || '';
    let resolvedReferrer = rawReferrer;

    if (!source && rawReferrer) {
      try {
        const refUrl = new URL(rawReferrer);
        const host = refUrl.hostname.toLowerCase();
        const currentHost = window.location.hostname.toLowerCase();

        if (host !== currentHost && !host.endsWith(`.${currentHost}`)) {
          if (host === 'tiktok.com' || host.endsWith('.tiktok.com') || host.includes('byteoversea')) {
            source = 'tiktok';
            medium = 'social';
          } else if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
            source = 'instagram';
            medium = 'social';
          } else if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be' || host.endsWith('.youtu.be')) {
            source = 'youtube';
            medium = 'social';
          } else if (
            host === 'twitter.com' ||
            host.endsWith('.twitter.com') ||
            host === 'x.com' ||
            host.endsWith('.x.com') ||
            host === 't.co' ||
            host.endsWith('.t.co')
          ) {
            source = 'twitter';
            medium = 'social';
          } else if (host === 'reddit.com' || host.endsWith('.reddit.com')) {
            source = 'reddit';
            medium = 'community';
          } else if (host.includes('google.')) {
            source = 'google';
            medium = 'organic';
          } else if (host.includes('bing.')) {
            source = 'bing';
            medium = 'organic';
          } else {
            source = host;
            medium = 'referral';
          }
          hasExplicitMarketing = true;
        }
      } catch {}
    }

    if (!source) {
      source = 'direct';
      medium = 'none';
    }

    const now = Date.now();
    const landing = `${window.location.pathname}${window.location.search}`;

    const touchData: TouchAttribution = {
      source,
      medium,
      campaign,
      term: utmTerm,
      content: utmContent,
      referrer: resolvedReferrer,
      landing,
      timestamp: now,
    };

    // 1. First Touch: set if not exists
    const existingFT = getStoredTouch(STORAGE_FT_KEY, COOKIE_FT_KEY);
    if (!existingFT) {
      saveTouch(STORAGE_FT_KEY, COOKIE_FT_KEY, touchData, FT_MAX_AGE);
    }

    // 2. Last Touch: set if explicit marketing detected
    if (hasExplicitMarketing) {
      saveTouch(STORAGE_LT_KEY, COOKIE_LT_KEY, touchData, LT_MAX_AGE);
    }
  } catch (err) {
    // Non-blocking
    console.debug('[attribution] init client tracker caught:', err);
  }
}

export const initAttributionTracker = initClientAttribution;

/**
 * Returns complete attribution payload for registration or checkout
 */
export function getAttributionPayload(): AttributionPayload {
  const ft = getStoredTouch(STORAGE_FT_KEY, COOKIE_FT_KEY);
  const lt = getStoredTouch(STORAGE_LT_KEY, COOKIE_LT_KEY) || ft;

  const payload: AttributionPayload = {};

  if (ft) {
    payload.utmSource = ft.source;
    payload.utmMedium = ft.medium;
    payload.utmCampaign = ft.campaign;
    payload.utmTerm = ft.term;
    payload.utmContent = ft.content;
    payload.referrer = ft.referrer;
    payload.firstLanding = ft.landing;
    payload.firstTouchAt = ft.timestamp;
  }

  if (lt) {
    payload.lastSource = lt.source;
    payload.lastMedium = lt.medium;
    payload.lastCampaign = lt.campaign;
  }

  return payload;
}
