/**
 * Lightweight client environment and user-agent parser.
 * Works seamlessly in Cloudflare Workers and Node.js environments.
 */

export interface ParsedClientEnv {
  ip: string;
  country: string;
  device: 'pc' | 'mobile' | 'tablet' | 'bot' | 'unknown';
  os: string;
  browser: string;
  locale: string;
}

export function parseUserAgent(uaString: string): {
  device: 'pc' | 'mobile' | 'tablet' | 'bot' | 'unknown';
  os: string;
  browser: string;
} {
  const ua = (uaString || '').toLowerCase();

  // 1. Detect Bots & Crawlers
  if (
    ua.includes('bot') ||
    ua.includes('spider') ||
    ua.includes('crawler') ||
    ua.includes('crawling') ||
    ua.includes('ahrefs') ||
    ua.includes('semrush') ||
    ua.includes('googlebot') ||
    ua.includes('bingbot') ||
    ua.includes('yandex') ||
    ua.includes('slurp')
  ) {
    return { device: 'bot', os: 'bot', browser: 'bot' };
  }

  // 2. Detect Device Type
  let device: 'pc' | 'mobile' | 'tablet' | 'unknown' = 'pc';
  if (ua.includes('ipad') || (ua.includes('android') && !ua.includes('mobile'))) {
    device = 'tablet';
  } else if (
    ua.includes('mobile') ||
    ua.includes('iphone') ||
    ua.includes('ipod') ||
    ua.includes('android') ||
    ua.includes('blackberry') ||
    ua.includes('webos')
  ) {
    device = 'mobile';
  }

  // 3. Detect Operating System
  let os = 'other';
  if (ua.includes('windows')) {
    os = 'windows';
  } else if (ua.includes('macintosh') || ua.includes('mac os')) {
    os = 'macos';
  } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) {
    os = 'ios';
  } else if (ua.includes('android')) {
    os = 'android';
  } else if (ua.includes('linux')) {
    os = 'linux';
  }

  // 4. Detect Browser
  let browser = 'other';
  if (ua.includes('edg/') || ua.includes('edge/')) {
    browser = 'edge';
  } else if (ua.includes('chrome/') || ua.includes('crios/')) {
    browser = 'chrome';
  } else if (ua.includes('safari/') && !ua.includes('chrome/')) {
    browser = 'safari';
  } else if (ua.includes('firefox/') || ua.includes('fxios/')) {
    browser = 'firefox';
  } else if (ua.includes('opera/') || ua.includes('opr/')) {
    browser = 'opera';
  }

  return { device, os, browser };
}

/**
 * Extracts normalized client environment from request headers.
 */
export function extractClientEnv(headers: Headers | Record<string, string | undefined>): ParsedClientEnv {
  const getHeader = (name: string): string => {
    if (typeof headers.get === 'function') {
      return headers.get(name) || '';
    }
    const val = (headers as Record<string, string | undefined>)[name.toLowerCase()];
    return val || '';
  };

  // Country from Cloudflare Edge
  let country = getHeader('cf-ipcountry') || getHeader('x-country-code') || '';
  country = country.toUpperCase().trim();

  // IP extraction
  const ip =
    getHeader('cf-connecting-ip') ||
    getHeader('x-forwarded-for')?.split(',')[0]?.trim() ||
    getHeader('x-real-ip') ||
    '';

  // UA parsing
  const uaString = getHeader('user-agent');
  const { device, os, browser } = parseUserAgent(uaString);

  // Preferred locale from Accept-Language
  const acceptLang = getHeader('accept-language');
  let locale = '';
  if (acceptLang) {
    const primary = acceptLang.split(',')[0]?.split(';')[0]?.trim() || '';
    locale = primary.slice(0, 10);
  }

  return {
    ip,
    country,
    device,
    os,
    browser,
    locale,
  };
}
