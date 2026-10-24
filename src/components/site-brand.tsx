'use client';

import { useEffect, useState } from 'react';
import { getRouteApi } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { cn } from '@/lib/utils';
import { usePublicConfig } from '@/hooks/use-public-config';

const rootRoute = getRouteApi('__root__');

export function SiteBrand({
  className,
  logoClassName,
  nameClassName,
  showName = true,
}: {
  className?: string;
  logoClassName?: string;
  nameClassName?: string;
  showName?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const { data: configsData } = usePublicConfig();
  const rootData = rootRoute.useLoaderData();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prefer live public config after mount. SSR / first paint use root loader
  // (DB app_name) so we never flash the env template default "ShipAny".
  const appName =
    (mounted && configsData?.app_name?.trim()) ||
    rootData?.appName?.trim() ||
    envConfigs.app_name;
  const logo =
    (mounted && configsData?.app_logo?.trim()) ||
    envConfigs.app_logo ||
    '/logo.svg';

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-3', className)}>
      <img
        src={logo}
        alt={appName}
        width={24}
        height={24}
        className={cn('size-6 shrink-0', logoClassName)}
        suppressHydrationWarning
      />
      {showName && (
        <span
          suppressHydrationWarning
          className={cn(
            'truncate font-serif text-lg leading-snug tracking-tight italic',
            nameClassName
          )}
        >
          {appName}
        </span>
      )}
    </span>
  );
}
