import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getPasswordResetEligibility } from '@/core/auth/password-reset-eligibility';
import { isEmailConfigured } from '@/core/email/resolve-provider';
import { getAllConfigs, getDbConfigs } from '@/modules/config/service';
import {
  consumeSlidingWindowRateLimit,
  enforceMinIntervalRateLimit,
} from '@/lib/rate-limit';

const AUTH_PASSWORD_RESET_REQUEST_PATHS = [
  '/api/auth/request-password-reset',
  // deprecated alias kept by better-auth
  '/api/auth/forget-password',
];
const DEFAULT_AUTH_PASSWORD_RESET_MIN_INTERVAL_MS = 10_000;
const DEFAULT_AUTH_PASSWORD_RESET_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_AUTH_PASSWORD_RESET_MAX_REQUESTS = 5;

function getNumberEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getClientIpFromRequest(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || '';
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    ''
  );
}

export function maybeRateLimitPasswordResetRequest(
  request: Request
): Response | null {
  const url = new URL(request.url);
  if (
    request.method !== 'POST' ||
    !AUTH_PASSWORD_RESET_REQUEST_PATHS.some((path) =>
      url.pathname.endsWith(path)
    )
  ) {
    return null;
  }

  const minIntervalLimited = enforceMinIntervalRateLimit(request, {
    intervalMs: getNumberEnv(
      'AUTH_PASSWORD_RESET_MIN_INTERVAL_MS',
      DEFAULT_AUTH_PASSWORD_RESET_MIN_INTERVAL_MS
    ),
    keyPrefix: 'auth-password-reset-min-interval',
  });
  if (minIntervalLimited) {
    return minIntervalLimited;
  }

  const windowMs = getNumberEnv(
    'AUTH_PASSWORD_RESET_WINDOW_MS',
    DEFAULT_AUTH_PASSWORD_RESET_WINDOW_MS
  );
  const maxRequests = getNumberEnv(
    'AUTH_PASSWORD_RESET_MAX_REQUESTS',
    DEFAULT_AUTH_PASSWORD_RESET_MAX_REQUESTS
  );
  if (windowMs <= 0 || maxRequests <= 0) {
    return null;
  }

  const ip = getClientIpFromRequest(request) || 'no-ip';
  const { allowed, retryAfterMs } = consumeSlidingWindowRateLimit({
    key: `auth-password-reset|${ip}`,
    limit: maxRequests,
    windowMs,
  });
  if (allowed) {
    return null;
  }

  return Response.json(
    {
      error: 'too_many_requests',
      message: 'Too many password reset requests. Please try again later.',
    },
    {
      status: 429,
      headers: {
        'cache-control': 'no-store',
        'retry-after': String(
          Math.max(
            1,
            Math.ceil(retryAfterMs / 1000) || Math.ceil(windowMs / 1000)
          )
        ),
      },
    }
  );
}

async function maybeRejectIneligiblePasswordReset(
  request: Request
): Promise<Response | null> {
  const url = new URL(request.url);
  if (
    request.method !== 'POST' ||
    !AUTH_PASSWORD_RESET_REQUEST_PATHS.some((path) =>
      url.pathname.endsWith(path)
    )
  ) {
    return null;
  }

  let email = '';
  try {
    const body = (await request.clone().json()) as { email?: unknown };
    email = String(body?.email || '').trim();
  } catch {
    return null;
  }
  if (!email) return null;

  const configs = await getAllConfigs();
  if (!isEmailConfigured(configs)) {
    return Response.json(
      {
        code: 'PASSWORD_RESET_UNAVAILABLE',
        message: 'Password reset is not available',
      },
      {
        status: 503,
        headers: { 'cache-control': 'no-store' },
      }
    );
  }

  const eligibility = await getPasswordResetEligibility(email);
  if (eligibility === 'ok') return null;

  const code =
    eligibility === 'oauth_only'
      ? 'PASSWORD_RESET_OAUTH_ONLY'
      : 'USER_NOT_FOUND';
  const message =
    eligibility === 'oauth_only'
      ? 'This account uses social sign-in and has no password to reset'
      : 'No account found with this email';

  return Response.json(
    { code, message },
    {
      status: 400,
      headers: { 'cache-control': 'no-store' },
    }
  );
}

async function handle(request: Request) {
  const passwordResetLimited = maybeRateLimitPasswordResetRequest(request);
  if (passwordResetLimited) {
    return passwordResetLimited;
  }

  const ineligible = await maybeRejectIneligiblePasswordReset(request);
  if (ineligible) {
    return ineligible;
  }

  const configs = await getDbConfigs();
  const auth = getAuth(configs);
  return auth.handler(request);
}

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
