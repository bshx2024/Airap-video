/// <reference types="vite/client" />
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import { createMiddleware, createServerFn } from '@tanstack/react-start';
import { ThemeProvider } from 'next-themes';

import { SessionProvider, type AuthSession } from '@/core/auth/client';
import { envConfigs } from '@/config';
import { parseCookieConsent } from '@/lib/cookie-consent';
import { getQueryClient } from '@/lib/query-client';
import { m } from '@/paraglide/messages.js';
import { getLocale, locales, localizeUrl } from '@/paraglide/runtime.js';
import { useCookieConsent } from '@/hooks/use-cookie-consent';
import { CookieConsent } from '@/blocks/cookie-consent';
import { Ads } from '@/components/analytics/ads';
import { GoogleAnalytics } from '@/components/analytics/google-analytics';
import { Plausible } from '@/components/analytics/plausible';
import { CustomerService } from '@/components/customer-service';
import { GoogleOneTap } from '@/components/google-one-tap';
import { SandboxPreviewBridge } from '@/components/sandbox-preview-bridge';
import { AttributionTracker } from '@/components/attribution-tracker';
import { TopBanner } from '@/components/top-banner';
import { Toaster } from '@/components/ui/sonner';

import '@fontsource-variable/inter';
import '@fontsource/libre-baskerville/400.css';
import '@fontsource/libre-baskerville/700.css';
import '@fontsource/libre-baskerville/400-italic.css';
import '@/styles/globals.css';

const authMiddleware = createMiddleware({ type: 'request' }).server(
  async ({ request, next }) => {
    let session: AuthSession | null = null;
    try {
      if (request?.headers) {
        const { getAuth } = await import('@/core/auth');
        const auth = getAuth();
        const sessionRes = await auth.api.getSession({
          headers: request.headers,
        });
        if (sessionRes?.user) {
          session = {
            user: sessionRes.user,
            session: {
              ...sessionRes.session,
              expiresAt:
                sessionRes.session.expiresAt instanceof Date
                  ? sessionRes.session.expiresAt.toISOString()
                  : sessionRes.session.expiresAt,
            },
          };
        }
      }
    } catch (err) {
      console.error('Failed to get server session in root middleware:', err);
    }
    return next({
      context: { session },
    });
  }
);

type TopBannerAnnouncement = {
  id: string;
  text: string;
  locale: string;
  startAt: number | null;
  endAt: number | null;
};

// Analytics IDs + Auth Session + top banner live on the server / DB config.
const getAnalyticsConfigs = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const session = context.session ?? null;
    const emptyTopBanner = {
      top_banner_enabled: '',
      top_banner_items: '',
      top_banner_stay_duration: '',
      top_banner_scroll_duration: '',
      mock: '0',
    };

    let topBannerAnnouncements: TopBannerAnnouncement[] = [];
    try {
      const { listPublicAnnouncements } =
        await import('@/modules/announcements/service');
      // Load every locale; the client filters by its own locale and the
      // start/end window (server fn requests may not carry the page locale).
      const [zh, en] = await Promise.all([
        listPublicAnnouncements('zh'),
        listPublicAnnouncements('en'),
      ]);
      const seen = new Set<string>();
      topBannerAnnouncements = [...zh.banners, ...en.banners]
        .filter((b: any) => !seen.has(String(b.id)) && seen.add(String(b.id)))
        .map((b: any) => ({
          id: String(b.id),
          text: String(b.text || ''),
          locale: String(b.locale || ''),
          startAt: b.startAt ?? null,
          endAt: b.endAt ?? null,
        }));
    } catch (error) {
      console.error('Failed to load banner announcements:', error);
    }

    try {
      const { getAllConfigs } = await import('@/modules/config/service');
      const configs = await getAllConfigs();
      const { getCookie } = await import('@tanstack/react-start/server');
      const { safeEmbedSetting } = await import('@/lib/embed-ids');
      // Host allow-list (PLAUSIBLE_SCRIPT_HOSTS) is runtime server env. A
      // configured src that fails it turns Plausible off rather than falling
      // back to the plausible.io script.
      const rawPlausibleSrc = configs.plausible_src?.trim() || '';
      const plausibleSrc = safeEmbedSetting('plausible_src', rawPlausibleSrc);
      const plausibleOff = !!rawPlausibleSrc && !plausibleSrc;
      const cookieConsentEnabled = configs.cookie_consent_enabled === 'true';
      return {
        session,
        appName: configs.app_name?.trim() || envConfigs.app_name,
        appDescription:
          configs.app_description?.trim() || envConfigs.app_description,
        appUrl: configs.app_url?.trim() || envConfigs.app_url,
        cookieConsentEnabled,
        // The visitor's saved choice, so SSR can render consented scripts.
        cookieConsent: cookieConsentEnabled
          ? parseCookieConsent(getCookie('cookie_consent'))
          : null,
        gaId: configs.google_analytics_id?.trim() || '',
        plausibleDomain: plausibleOff
          ? ''
          : configs.plausible_domain?.trim() || '',
        plausibleSrc,
        adsenseCode: configs.adsense_code?.trim() || '',
        crispWebsiteId:
          configs.crisp_enabled === 'true'
            ? configs.crisp_website_id?.trim() || ''
            : '',
        tawkPropertyId:
          configs.tawk_enabled === 'true'
            ? configs.tawk_property_id?.trim() || ''
            : '',
        tawkWidgetId:
          configs.tawk_enabled === 'true'
            ? configs.tawk_widget_id?.trim() || ''
            : '',
        topBannerAnnouncements,
        topBannerConfig: {
          // Legacy settings keys kept empty; banners come from announcements table.
          top_banner_enabled: '',
          top_banner_items: '',
          top_banner_stay_duration: '',
          top_banner_scroll_duration: '',
          mock:
            configs.mock?.trim() === '1' || process.env.MOCK?.trim() === '1'
              ? '1'
              : '0',
        },
      };
    } catch (error) {
      console.error('Failed to get analytics configs:', error);
      return {
        session,
        appName: envConfigs.app_name,
        appDescription: envConfigs.app_description,
        appUrl: envConfigs.app_url,
        cookieConsentEnabled: false,
        cookieConsent: null,
        gaId: '',
        plausibleDomain: '',
        plausibleSrc: '',
        adsenseCode: '',
        crispWebsiteId: '',
        tawkPropertyId: '',
        tawkWidgetId: '',
        topBannerAnnouncements,
        topBannerConfig: emptyTopBanner,
      };
    }
  });

export const Route = createRootRoute({
  loader: () => getAnalyticsConfigs(),
  head: ({ loaderData }) => {
    // head() runs on the SSR server AND again on the client during hydration.
    // On the client, app_url falls back to the localhost dev default when
    // VITE_APP_URL wasn't inlined into the client bundle at build — which would
    // emit a second, localhost set of hreflang links. Prefer the live origin
    // on the client so it always matches; the server uses admin setting → env.
    const appUrl =
      (typeof window !== 'undefined' && window.location?.origin) ||
      loaderData?.appUrl ||
      envConfigs.app_url ||
      '';
    const appName = loaderData?.appName || envConfigs.app_name || 'App';
    const appDescription =
      loaderData?.appDescription || envConfigs.app_description || '';
    const canonicalUrl = `${appUrl}/`;
    const structuredData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${appUrl}/#website`,
          url: appUrl,
          name: appName,
          description: appDescription,
          potentialAction: {
            '@type': 'SearchAction',
            target: `${appUrl}/?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
        {
          '@type': 'Organization',
          '@id': `${appUrl}/#organization`,
          name: appName,
          url: appUrl,
          logo: `${appUrl}/logo.svg`,
        },
        {
          '@type': 'SoftwareApplication',
          name: appName,
          applicationCategory: 'MultimediaApplication',
          operatingSystem: 'All',
          description: appDescription,
          url: appUrl,
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
        },
      ],
    };
    return {
      meta: [
        { charSet: 'utf-8' },
        {
          name: 'viewport',
          content:
            'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
        },
        { title: appName },
        { name: 'description', content: appDescription },
        {
          name: 'keywords',
          content: `AI video generator, text to video, image to video, AI video maker, ${appName}`,
        },
        {
          name: 'robots',
          content: 'noindex, nofollow, noarchive, nosnippet',
        },
        {
          name: 'googlebot',
          content: 'noindex, nofollow, noarchive, nosnippet',
        },
        {
          name: 'bingbot',
          content: 'noindex, nofollow, noarchive, nosnippet',
        },
        { property: 'og:site_name', content: appName },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: appName },
        { property: 'og:description', content: appDescription },
        { property: 'og:url', content: canonicalUrl },
        { property: 'og:image', content: `${appUrl}/logo.svg` },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: appName },
        { name: 'twitter:description', content: appDescription },
        { name: 'twitter:image', content: `${appUrl}/logo.svg` },
      ],
      links: [
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/favicon.svg' },
        { rel: 'canonical', href: canonicalUrl },
        { rel: 'alternate', hrefLang: 'x-default', href: canonicalUrl },
        ...locales.map((loc) => ({
          rel: 'alternate',
          hrefLang: loc,
          href: localizeUrl(`${appUrl}/`, { locale: loc }).href,
        })),
      ],
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(structuredData),
        },
      ],
    };
  },
  component: RootComponent,
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
  errorComponent: RootError,
});

function RootComponent() {
  const analytics = Route.useLoaderData();
  const consentEnabled = !!analytics?.cookieConsentEnabled;
  const consent = useCookieConsent(analytics?.cookieConsent ?? null);
  // With the banner on, ad scripts wait for an explicit "accept".
  const adsAllowed = !consentEnabled || consent === 'accepted';

  return (
    <QueryClientProvider client={getQueryClient()}>
      <SessionProvider initialSession={analytics?.session || null}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TopBanner />
          <AttributionTracker />
          <Outlet />
          <SandboxPreviewBridge />
          <Toaster position="top-center" richColors />
          <GoogleOneTap />
          {analytics?.gaId ? (
            <GoogleAnalytics
              measurementId={analytics.gaId}
              consentMode={consentEnabled}
            />
          ) : null}
          {analytics?.plausibleDomain || analytics?.plausibleSrc ? (
            <Plausible
              domain={analytics.plausibleDomain}
              src={analytics.plausibleSrc || undefined}
            />
          ) : null}
          {analytics?.adsenseCode ? (
            <Ads code={analytics.adsenseCode} loadScript={adsAllowed} />
          ) : null}
          <CustomerService
            crispWebsiteId={analytics?.crispWebsiteId || undefined}
            tawkPropertyId={analytics?.tawkPropertyId || undefined}
            tawkWidgetId={analytics?.tawkWidgetId || undefined}
          />
          {consentEnabled ? (
            <CookieConsent initial={analytics?.cookieConsent ?? null} />
          ) : null}
        </ThemeProvider>
      </SessionProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang={getLocale()} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-muted-foreground">{m['common.not_found.message']()}</p>
      <a href="/" className="text-sm underline underline-offset-4">
        {m['common.not_found.back_home']()}
      </a>
    </div>
  );
}

function RootError({ error, reset }: ErrorComponentProps) {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">{m['common.error.title']()}</h1>
      <p className="text-muted-foreground">{m['common.error.message']()}</p>
      {import.meta.env.DEV && error instanceof Error && (
        <pre className="bg-muted mt-2 max-w-lg overflow-auto rounded p-4 text-xs">
          {error.message}
        </pre>
      )}
      <button
        type="button"
        onClick={reset}
        className="text-sm underline underline-offset-4"
      >
        {m['common.error.retry']()}
      </button>
    </div>
  );
}
