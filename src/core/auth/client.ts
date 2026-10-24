import React, { createContext, useContext } from 'react';
import { oneTapClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

const baseURL =
  typeof window !== 'undefined'
    ? window.location.origin
    : import.meta.env?.VITE_APP_URL || 'http://localhost:3000';

export const authClient = createAuthClient({
  baseURL,
  sessionOptions: {
    refetchOnWindowFocus: false,
  },
});

const rawUseSession = authClient.useSession;

export interface AuthSession {
  user: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role?: string | null;
    [key: string]: any;
  };
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date | string;
    [key: string]: any;
  };
}

const SessionContext = createContext<{
  initialSession: AuthSession | null;
}>({
  initialSession: null,
});

export function SessionProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession: AuthSession | null;
}) {
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('_auth')) return;
    url.searchParams.delete('_auth');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    void authClient.getSession();
  }, []);

  return React.createElement(
    SessionContext.Provider,
    { value: { initialSession } },
    children
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  const clientSession = rawUseSession();

  // Live client session wins.
  if (clientSession.data) {
    return {
      data: clientSession.data,
      isPending: false,
      error: clientSession.error,
      refetch: clientSession.refetch,
    };
  }

  // Client finished with no session (including after signOut). Soft-navigate
  // keeps SessionProvider's SSR initialSession — do not revive it or the
  // header keeps showing the signed-in avatar on `/`.
  if (!clientSession.isPending) {
    return {
      data: null,
      isPending: false,
      error: clientSession.error,
      refetch: clientSession.refetch,
    };
  }

  // First paint: client still loading — use SSR-preloaded session if any.
  if (context.initialSession) {
    return {
      data: context.initialSession,
      isPending: false,
      error: null,
      refetch: clientSession.refetch,
    };
  }

  return clientSession;
}

export const { signIn, signUp, signOut, requestPasswordReset, resetPassword } =
  authClient;

// Build a per-call auth client with the Google One Tap plugin attached.
// The plugin needs the client_id at construction time, so we can't add
// it to the default `authClient` — callers must pass live configs.
export function getAuthClient(configs: Record<string, string>) {
  return createAuthClient({
    baseURL,
    plugins:
      configs.google_client_id && configs.google_one_tap_enabled === 'true'
        ? [
            oneTapClient({
              clientId: configs.google_client_id,
              autoSelect: false,
              cancelOnTapOutside: false,
              context: 'signin',
              promptOptions: {
                baseDelay: 1000,
                maxAttempts: 1,
              },
            }),
          ]
        : [],
  });
}
