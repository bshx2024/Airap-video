'use client';

import { useEffect, useState } from 'react';

import { envConfigs } from '@/config';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { usePublicConfig } from '@/hooks/use-public-config';

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function BuiltWithShipAny({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const { data: configsData } = usePublicConfig();

  useEffect(() => {
    setMounted(true);
  }, []);

  // SSR + first client paint must use env fallback so href matches hydrate.
  const appUrl =
    mounted && configsData?.app_url?.trim()
      ? configsData.app_url.trim()
      : envConfigs.app_url;
  const utm = encodeURIComponent(getHostname(appUrl));
  const href = `https://shipany.ai/?utm_source=${utm}`;

  return (
    <a
      href={href}
      suppressHydrationWarning
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:border-neutral-500 dark:hover:bg-neutral-800',
        className
      )}
    >
      <span>{m['landing.footer.built_with']()}</span>
      <span aria-hidden className="text-red-500">
        ❤️
      </span>
      <span>{m['landing.footer.built_with_brand']()}</span>
    </a>
  );
}
