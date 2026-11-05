'use client';

import type { SVGProps } from 'react';
import { House, Mail } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { LocaleSelector } from '@/components/locale-selector';

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

export function VideoFooter() {
  const columns = [
    {
      title: m['landing.footer.product'](),
      links: [
        { label: m['landing.hero.title'](), href: '/#generator' },
        { label: m['landing.nav.features'](), href: '/#features' },
        { label: m['landing.nav.pricing'](), href: '/pricing' },
        { label: m['landing.footer.creations'](), href: '/settings' },
      ],
    },
    {
      title: m['landing.footer.content'](),
      links: [
        { label: m['landing.nav.showcase'](), href: '/#showcase' },
        { label: m['landing.footer.use_cases'](), href: '/#use-cases' },
        { label: m['landing.nav.faq'](), href: '/#faq' },
        { label: m['landing.nav.blog'](), href: '/blog' },
      ],
    },
    {
      title: m['landing.nav.models'](),
      links: [
        { label: 'Kling 4.0 Studio', href: '/#generator' },
        { label: 'Wan 2.6 Flash', href: '/#generator' },
        { label: 'Seedance 2.5 Pro', href: '/#generator' },
        { label: 'Suno 808 Audio Engine', href: '/#technical-transparency' },
      ],
    },
    {
      title: m['landing.footer.legal'](),
      links: [
        { label: m['landing.footer.privacy'](), href: '/privacy-policy' },
        { label: m['landing.footer.terms'](), href: '/terms-of-service' },
        {
          label: 'Acceptable Use Policy (AUP)',
          href: '/acceptable-use-policy',
        },
        { label: m['landing.footer.cookies'](), href: '/cookie-policy' },
        { label: m['landing.footer.refund'](), href: '/refund-policy' },
        {
          label: 'Support: support@airap-video.net',
          href: 'mailto:support@airap-video.net',
        },
        {
          label: 'Report Abuse: report@airap-video.net',
          href: 'mailto:report@airap-video.net',
        },
      ],
    },
  ];

  return (
    <footer className="border-t border-slate-200 bg-slate-50 text-slate-900 transition-colors dark:border-[#1e293b] dark:bg-[#060a13] dark:text-[#f8fafc]">
      <div className="mx-auto w-[calc(100%-2rem)] max-w-7xl pt-14 pb-6 sm:pt-16">
        <p className="mb-12 max-w-4xl font-serif text-2xl leading-[1.15] font-normal tracking-[-0.03em] italic sm:text-3xl md:text-4xl">
          {m['landing.footer.tagline']()}
        </p>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 sm:gap-x-12">
          {columns.map((col, idx) => (
            <div key={idx} className="space-y-5">
              <p className="text-[13px] font-semibold tracking-wide text-slate-800 dark:text-[#e2e8f0]">
                {col.title}
              </p>
              <ul className="space-y-1">
                {col.links.map((link, lIdx) => (
                  <li key={lIdx}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-6 items-center text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-[#94a3b8] dark:hover:text-[#f8fafc]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="-ml-2 flex items-center gap-1">
            <Link
              href="/"
              aria-label={m['landing.footer.home']()}
              className="inline-flex size-8 items-center justify-center text-slate-500 transition-colors hover:text-slate-900 dark:text-[#94a3b8] dark:hover:text-[#f8fafc]"
            >
              <House className="size-[18px]" />
            </Link>
            <a
              href="https://github.com/shipany-ai?utm_source=video-lite.shipany.site"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={m['landing.footer.github']()}
              className="inline-flex size-8 items-center justify-center text-slate-500 transition-colors hover:text-slate-900 dark:text-[#94a3b8] dark:hover:text-[#f8fafc]"
            >
              <GithubIcon className="size-[18px]" />
            </a>
          </div>

          <div className="[&_button]:border-slate-300 [&_button]:text-slate-700 dark:[&_button]:border-[#334155] dark:[&_button]:text-[#cbd5e1] [&_button:hover]:bg-slate-100 [&_button:hover]:text-slate-900 dark:[&_button:hover]:bg-[#0f172a] dark:[&_button:hover]:text-[#f8fafc]">
            <LocaleSelector variant="pill" />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-[#1e293b]">
          <span className="text-sm text-slate-500 dark:text-[#94a3b8]">
            {m['landing.footer.copyright']()}
          </span>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-[#94a3b8]">
            <a
              href="mailto:support@airap-video.net"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-900 dark:hover:text-[#f8fafc]"
            >
              <Mail className="size-4" />
              <span>support@airap-video.net</span>
            </a>
            <span className="hidden opacity-40 sm:inline">|</span>
            <a
              href="mailto:report@airap-video.net"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-900 dark:hover:text-[#f8fafc]"
            >
              <span>Abuse Reports: report@airap-video.net</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
