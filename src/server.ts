import handler from '@tanstack/react-start/server-entry';

import { envConfigs } from './config';
import { db } from './core/db';
import { crawlerLog } from './config/db/schema';
import { getUuid } from './lib/hash';
import { runWithDbScope } from './core/db/request-scope';
import {
  getCookieFromHeader,
  REFERRER_COOKIE,
  sanitizeReferrer,
  sanitizeUtm,
} from './lib/cookie';
import { paraglideMiddleware } from './paraglide/server.js';

// On Cloudflare Workers, stash the binding env (D1, ASSETS, …) on globalThis
// so synchronous code paths (e.g. the db() singleton with DATABASE_PROVIDER=d1)
// can reach bindings without threading the request context through every call.
// The specifier is kept non-literal so bundlers leave the import to runtime;
// outside workerd the import rejects and we just move on.
const CF_WORKERS_MODULE = 'cloudflare:workers';
let cfEnvPromise: Promise<void> | null = null;

function ensureCloudflareEnv(): Promise<void> {
  if (!cfEnvPromise) {
    cfEnvPromise = import(/* @vite-ignore */ CF_WORKERS_MODULE)
      .then((mod) => {
        (globalThis as any).__CF_ENV__ = mod.env;
        ensureDefaultUserAgent();
      })
      .catch(() => {
        // Not running on Cloudflare Workers — nothing to stash.
      });
  }
  return cfEnvPromise;
}

// Cloudflare Workers' fetch sends no User-Agent, while Node's adds one. Some
// APIs reject UA-less requests (GitHub → 403, WeChat Pay v3 → 400), so on
// Workers give every outbound request a default UA unless it sets its own.
let fetchPatched = false;

function ensureDefaultUserAgent() {
  if (fetchPatched) return;
  fetchPatched = true;
  const nativeFetch = globalThis.fetch;
  const userAgent = `${envConfigs.app_name || 'ShipAny'} (+${envConfigs.app_url})`;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined)
    );
    if (headers.has('user-agent')) return nativeFetch(input, init);
    headers.set('user-agent', userAgent);
    return nativeFetch(input, { ...init, headers });
  }) as typeof fetch;
}

const UTM_COOKIE_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
];
const ATTRIBUTION_COOKIE_ATTRS = 'Max-Age=2592000; Path=/; SameSite=Lax';
const FT_COOKIE_ATTRS = 'Max-Age=31536000; Path=/; SameSite=Lax';

// Behind a proxy req.url can carry an internal host, so also treat the public
// app URL as "self" when filtering referrers.
function appHost(): string {
  try {
    return new URL(envConfigs.app_url).host;
  } catch {
    return '';
  }
}

// Custom server entry — wraps every request in a db scope (one db client per
// request on Workers, see core/db/request-scope.ts) and Paraglide's middleware
// so getLocale() resolves per-request (AsyncLocalStorage) during SSR.
export default {
  async fetch(req: Request, env?: any, ctx?: any): Promise<Response> {
    await ensureCloudflareEnv();

    const isGetOrHead = req.method === 'GET' || req.method === 'HEAD';
    const urlObj = new URL(req.url);
    const isPublicPage =
      urlObj.pathname === '/' ||
      urlObj.pathname === '/terms' ||
      urlObj.pathname === '/privacy' ||
      urlObj.pathname.startsWith('/showcase');
    const cookieHeader = req.headers.get('cookie');
    const hasAuth = Boolean(
      cookieHeader?.includes('better-auth.session_token')
    );
    const hasUtms = UTM_COOKIE_KEYS.some((k) => urlObj.searchParams.has(k));

    // Fast-path: check Cloudflare Edge Cache API for public pages without session/UTMs
    const cache =
      typeof caches !== 'undefined' ? (caches as any).default : null;
    let cacheKey: Request | null = null;
    if (cache && isGetOrHead && isPublicPage && !hasAuth && !hasUtms) {
      cacheKey = new Request(req.url, req);
      try {
        const cachedResponse = await cache.match(cacheKey);
        if (cachedResponse) {
          return cachedResponse;
        }
      } catch {
        // Fallback to SSR handler on cache miss
      }
    }

    // Wrap the whole request so anything before/after the handler shares
    // the same db client too.
    const response = await runWithDbScope(() => handleRequest(req));

    // Cache valid public HTML responses without Set-Cookie on Cloudflare Edge
    if (
      cache &&
      cacheKey &&
      response.status === 200 &&
      !response.headers.has('set-cookie') &&
      response.headers.get('content-type')?.includes('text/html')
    ) {
      try {
        if (ctx?.waitUntil) {
          ctx.waitUntil(cache.put(cacheKey, response.clone()));
        } else {
          await cache.put(cacheKey, response.clone());
        }
      } catch {
        // Silently continue if cache.put encounters errors
      }
    }

    return response;
  },
};

async function handleRequest(req: Request): Promise<Response> {
  const response = await paraglideMiddleware(req, () => handler.fetch(req));
  // First-touch attribution: remember UTM params for 30 days so sign-up can
  // stamp them onto the user row. Never overwrite an existing cookie.
  const urlObj = new URL(req.url);
  const params = urlObj.searchParams;
  const cookieHeader = req.headers.get('cookie');
  let hasNewUtm = false;
  const capturedUtms: Record<string, string> = {};

  for (const key of UTM_COOKIE_KEYS) {
    const value = params.get(key);
    if (!value || getCookieFromHeader(cookieHeader, key)) continue;
    const sanitized = sanitizeUtm(value);
    if (sanitized) {
      hasNewUtm = true;
      capturedUtms[key] = sanitized;
      response.headers.append(
        'Set-Cookie',
        `${key}=${encodeURIComponent(sanitized)}; ${ATTRIBUTION_COOKIE_ATTRS}`
      );
    }
  }

  // First-touch referrer: only page navigations arriving from another site.
  const referer = req.headers.get('referer');
  let capturedReferrer = '';
  if (
    referer &&
    req.method === 'GET' &&
    (req.headers.get('accept') || '').includes('text/html') &&
    !getCookieFromHeader(cookieHeader, REFERRER_COOKIE)
  ) {
    const sanitized = sanitizeReferrer(referer, [
      urlObj.host,
      appHost(),
    ]);
    if (sanitized) {
      capturedReferrer = sanitized;
      response.headers.append(
        'Set-Cookie',
        `${REFERRER_COOKIE}=${encodeURIComponent(sanitized)}; ${ATTRIBUTION_COOKIE_ATTRS}`
      );
    }
  }

  // Structured First-Touch (attr_ft) cookie for robust cross-environment attribution
  if (!getCookieFromHeader(cookieHeader, 'attr_ft') && (hasNewUtm || capturedReferrer)) {
    const ftPayload = {
      source: capturedUtms.utm_source || (capturedReferrer ? new URL(capturedReferrer.startsWith('http') ? capturedReferrer : `https://${capturedReferrer}`).hostname : 'direct'),
      medium: capturedUtms.utm_medium || (capturedReferrer ? 'referral' : 'none'),
      campaign: capturedUtms.utm_campaign || '',
      term: capturedUtms.utm_term || '',
      content: capturedUtms.utm_content || '',
      referrer: capturedReferrer || referer || '',
      landing: `${urlObj.pathname}${urlObj.search}`,
      timestamp: Date.now(),
    };
    response.headers.append(
      'Set-Cookie',
      `attr_ft=${encodeURIComponent(JSON.stringify(ftPayload))}; ${FT_COOKIE_ATTRS}`
    );
  }

  // Detect and persist crawler & scanner requests to database for admin review
  const ua = req.headers.get('user-agent') || '';
  const botType = detectBotType(ua, urlObj.pathname);

  if (botType) {
    const clientIp =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      '';
    const country = (req.headers.get('cf-ipcountry') || '').toUpperCase().trim();

    console.log(
      `[CRAWLER][${botType}] ${req.method} ${urlObj.pathname}${urlObj.search} | ${response.status} | IP: ${clientIp} (${country || 'Unknown'}) | UA: ${ua}`
    );

    // Asynchronously insert into database without blocking client response
    Promise.resolve().then(async () => {
      try {
        await db().insert(crawlerLog).values({
          id: getUuid(),
          ip: clientIp.slice(0, 45),
          country: country.slice(0, 10),
          method: req.method.slice(0, 10),
          path: `${urlObj.pathname}${urlObj.search}`.slice(0, 500),
          statusCode: response.status,
          botType,
          userAgent: ua.slice(0, 1000),
          createdAt: new Date(),
        });
      } catch (err) {
        // Silently catch to prevent unhandled rejections during background insert
      }
    });
  }

  // Edge Cache optimization for anonymous public page requests
  // Ensures sub-100ms TTFB for visitors, crawlers, and SEO audit tools while keeping dynamic routes un-cached.
  const isHtml = response.headers.get('content-type')?.includes('text/html');
  const isGetOrHead = req.method === 'GET' || req.method === 'HEAD';
  const isOk = response.status === 200;
  const isPublicPage =
    urlObj.pathname === '/' ||
    urlObj.pathname === '/terms' ||
    urlObj.pathname === '/privacy' ||
    urlObj.pathname.startsWith('/showcase');
  const hasAuthSession = Boolean(
    cookieHeader?.includes('better-auth.session_token')
  );

  if (isGetOrHead && isOk && isHtml && isPublicPage && !hasAuthSession) {
    response.headers.set(
      'Cache-Control',
      'public, max-age=60, s-maxage=300, stale-while-revalidate=86400'
    );
  }

  return response;
}

function detectBotType(ua: string, path: string): string | null {
  const lPath = path.toLowerCase();
  if (['.php', '.env', 'wp-admin', 'shell', 'backup', '.git', 'composer.json', 'xmlrpc', 'setup.cgi'].some((s) => lPath.includes(s))) {
    return 'scanner';
  }
  const lUa = ua.toLowerCase();
  if (lUa.includes('googlebot')) return 'googlebot';
  if (lUa.includes('bingbot')) return 'bingbot';
  if (lUa.includes('ahrefs')) return 'ahrefs';
  if (lUa.includes('semrush')) return 'semrush';
  if (lUa.includes('bytespider')) return 'bytespider';
  if (lUa.includes('yandex')) return 'yandex';
  if (lUa.includes('duckduckbot') || lUa.includes('duckduckgo')) return 'duckduckgo';
  if (lUa.includes('baiduspider')) return 'baidu';
  if (lUa.includes('bot') || lUa.includes('spider') || lUa.includes('crawler') || lUa.includes('slurp')) return 'other_bot';
  return null;
}
