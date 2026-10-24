import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api-client';
import { getLocale } from '@/paraglide/runtime.js';

type BannerItem = { id: string; text: string };

/** Published top-banner announcements for the current locale (start/end window applied server-side). */
export function useBannerAnnouncements(enabled = true): BannerItem[] {
  const locale = getLocale();
  const { data } = useQuery({
    queryKey: ['public-announcement-banners', locale],
    enabled,
    queryFn: () =>
      apiGet<{ banners: BannerItem[] }>(`/api/announcements?locale=${locale}`),
    staleTime: 60_000,
  });
  return useMemo(
    () =>
      (data?.banners ?? [])
        .filter((item) => item.text?.trim())
        .map((item) => ({ id: String(item.id), text: item.text })),
    [data]
  );
}
