import { useEffect } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { initAttributionTracker } from '@/lib/attribution';

/**
 * Invisible tracker component that triggers multi-touch attribution
 * on initial load and whenever the route/URL parameters change.
 */
export function AttributionTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.searchStr });

  useEffect(() => {
    initAttributionTracker();
  }, [pathname, search]);

  return null;
}
