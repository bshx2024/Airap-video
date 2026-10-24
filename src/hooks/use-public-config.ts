import { useQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api-client';

export type PublicConfig = Record<string, string>;

// Public runtime config (auth methods, social login ids, …) — shared by
// sign-in/sign-up/forgot-password/google-one-tap/pricing. Deduped and
// cached by react-query.
//
// Only fetch in the browser. SSR must keep `data` undefined so AppName /
// logo / mock banner always fall back to envConfigs and match the client's
// first paint (avoids React hydration #418 text mismatches).
export function usePublicConfig() {
  return useQuery({
    queryKey: ['public-config'],
    queryFn: () =>
      apiGet<PublicConfig>('/api/config/public', { cache: 'no-store' }),
    staleTime: 0,
    enabled: typeof window !== 'undefined',
  });
}
