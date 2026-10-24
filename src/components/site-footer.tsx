'use client';

import { useEffect, useState, type ComponentType, type SVGProps } from 'react';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { cn } from '@/lib/utils';
import { usePublicConfig } from '@/hooks/use-public-config';
import { BuiltWithShipAny } from '@/components/built-with-shipany';
import { LocaleSelector } from '@/components/locale-selector';

export interface FooterColumn {
  title: string;
  /**
   * external: open in a new tab. Off-site (http) hrefs always open in a new tab.
   * onClick: render a button instead of a link (e.g. "Cookie settings").
   */
  links: {
    label: string;
    href?: string;
    external?: boolean;
    onClick?: () => void;
  }[];
}

/** Off-site URLs render as plain <a>; internal paths use the locale-aware Link. */
const isExternalHref = (href: string) => /^https?:\/\//.test(href);

export interface FooterSocial {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  href: string;
  label: string;
}

export function SiteFooter({
  tagline,
  columns,
  socials,
  copyright,
}: {
  tagline?: string;
  columns?: FooterColumn[];
  socials?: FooterSocial[];
  copyright?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const year = new Date().getFullYear();
  const { data: configsData } = usePublicConfig();

  useEffect(() => {
    setMounted(true);
  }, []);

  const appName =
    mounted && configsData?.app_name?.trim()
      ? configsData.app_name.trim()
      : envConfigs.app_name;

  return (
    <footer className="border-t border-slate-200 bg-slate-50 text-slate-900 transition-colors dark:border-transparent dark:bg-neutral-950 dark:text-neutral-100">
      <div className="mx-auto max-w-7xl px-6 pt-14 pb-6 sm:px-10 sm:pt-16 lg:px-16">
        {tagline && (
          <p className="mb-12 max-w-2xl font-serif text-2xl leading-[1.15] tracking-tight text-slate-900 italic sm:text-3xl md:text-4xl dark:text-neutral-100">
            {tagline}
          </p>
        )}

        {columns && columns.length > 0 && (
          <div
            className={cn(
              'grid gap-x-6 gap-y-10 sm:gap-x-12',
              columns.length <= 3
                ? 'grid-cols-2 sm:grid-cols-3'
                : columns.length === 4
                  ? 'grid-cols-2 sm:grid-cols-4'
                  : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
            )}
          >
            {columns.map((col) => (
              <div key={col.title} className="space-y-5">
                <p className="text-[13px] font-semibold tracking-wide text-slate-800 dark:text-neutral-100">
                  {col.title}
                </p>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {link.onClick || !link.href ? (
                        <button
                          type="button"
                          onClick={link.onClick}
                          className="text-sm text-neutral-400 transition-colors hover:text-neutral-100"
                        >
                          {link.label}
                        </button>
                      ) : isExternalHref(link.href) ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          target={link.external ? '_blank' : undefined}
                          className="text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Socials + language row */}
        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          {socials && socials.length > 0 ? (
            <div className="flex items-center gap-5">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 transition-colors hover:text-slate-900 dark:text-neutral-300 dark:hover:text-neutral-100"
                >
                  <s.icon className="size-[18px]" />
                </a>
              ))}
            </div>
          ) : (
            <div />
          )}
          <LocaleSelector
            variant="pill"
            className="border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-white/5 dark:hover:text-neutral-50"
          />
        </div>

        {/* Bottom bar */}
        <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800">
          <BuiltWithShipAny />
          <span
            suppressHydrationWarning
            className="text-sm text-slate-500 dark:text-neutral-400"
          >
            {copyright || `© ${year} ${appName}. All rights reserved.`}
          </span>
        </div>
      </div>
    </footer>
  );
}
