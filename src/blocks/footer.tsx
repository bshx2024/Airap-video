import type { SVGProps } from 'react';
import { getRouteApi } from '@tanstack/react-router';
import { House } from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { envConfigs } from '@/config';
import { AI_MODELS, AI_TOOLS, NAV_FEATURES } from '@/config/landing-data';
import { openCookieSettings } from '@/lib/cookie-consent';
import { m } from '@/paraglide/messages.js';
import { usePublicConfig } from '@/hooks/use-public-config';
import {
  SiteFooter,
  type FooterColumn,
  type FooterSocial,
} from '@/components/site-footer';

('use client');

function GithubIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

const rootRoute = getRouteApi('__root__');

export function Footer() {
  const cookieConsentEnabled =
    !!rootRoute.useLoaderData()?.cookieConsentEnabled;
  const { data: configsData } = usePublicConfig();
  const appUrl = configsData?.app_url?.trim() || envConfigs.app_url;
  const utm = (() => {
    try {
      return new URL(appUrl).hostname;
    } catch {
      return appUrl;
    }
  })();

  const columns: FooterColumn[] = [
    {
      title: m['landing.footer.feature'](),
      links: NAV_FEATURES.map((item) => ({
        label: tDynamic(`landing.nav.items.${item.id}.label`),
        href: item.href,
      })),
    },
    {
      title: m['landing.nav.models'](),
      links: [
        ...AI_MODELS.map((item) => ({
          label: item.name,
          href: item.href,
        })),
        { label: m['landing.footer.view_all_models'](), href: '/models' },
      ],
    },
    {
      title: m['landing.nav.tools'](),
      links: [
        ...AI_TOOLS.map((item) => ({
          label: tDynamic(`landing.tools.items.${item.id}.title`),
          href: item.href,
        })),
        { label: m['landing.footer.view_all_tools'](), href: '/tools' },
      ],
    },
    {
      title: m['landing.footer.product'](),
      links: [
        { label: m['landing.nav.showcase'](), href: '/#showcase' },
        { label: m['landing.nav.faq'](), href: '/#faq' },
        { label: m['landing.footer.blog'](), href: '/blog' },
        { label: m['landing.nav.pricing'](), href: '/pricing' },
        { label: m['landing.footer.creations'](), href: '/settings' },
      ],
    },
    {
      title: m['landing.footer.legal'](),
      links: [
        { label: m['landing.footer.privacy'](), href: '/privacy-policy' },
        { label: m['landing.footer.terms'](), href: '/terms-of-service' },
        { label: 'Acceptable Use Policy (AUP)', href: '/acceptable-use-policy' },
        ...(cookieConsentEnabled
          ? [
              {
                label: m['landing.footer.cookie_settings'](),
                onClick: openCookieSettings,
              },
            ]
          : []),
        { label: m['landing.footer.cookies'](), href: '/cookie-policy' },
        { label: m['landing.footer.refund'](), href: '/refund-policy' },
        { label: 'Report Abuse: report@airap-video.net', href: 'mailto:report@airap-video.net' },
      ],
    },
  ];

  const socials: FooterSocial[] = [
    {
      icon: House,
      href: `https://shipany.ai/?utm_source=${encodeURIComponent(utm)}`,
      label: 'ShipAny',
    },
    {
      icon: GithubIcon,
      href: `https://github.com/shipany-ai?utm_source=${encodeURIComponent(utm)}`,
      label: 'GitHub',
    },
  ];

  return (
    <SiteFooter
      tagline={m['landing.footer.tagline']()}
      columns={columns}
      socials={socials}
    />
  );
}
