import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Full-page redirect to another site (payment provider) that keeps the UI
 * busy until the page actually unloads. Navigation can take seconds; the
 * caller shows `redirecting` as a loading state instead of going idle.
 * When the browser restores this page from the back/forward cache
 * (user pressed Back on the provider page), the state is reset and
 * `onRestore` runs so dialogs do not stay stuck in "loading".
 */
export function useExternalRedirect(onRestore?: () => void) {
  const [redirecting, setRedirecting] = useState(false);
  const restoreRef = useRef(onRestore);
  restoreRef.current = onRestore;

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      setRedirecting(false);
      restoreRef.current?.();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const redirect = useCallback((url: string) => {
    setRedirecting(true);
    window.location.assign(url);
  }, []);

  return { redirecting, redirect };
}
