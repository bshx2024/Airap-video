import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respErr } from '@/lib/resp';

/**
 * GET /api/storage/download?url=…&name=…
 *
 * Stream back remote media assets (R2, CDN, external storage) from our origin
 * with Content-Disposition to support cross-origin downloads and prevent canvas tainting.
 * Public CDNs are allowed, while loopback and private networks are rejected to prevent SSRF.
 */
function isPrivateHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1) — check the embedded IPv4.
  const v4Mapped = host.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (v4Mapped) return isPrivateHost(v4Mapped[1]);

  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '0.0.0.0'
  ) {
    return true;
  }

  const parts = host.split('.').map(Number);
  if (
    parts.length === 4 &&
    parts.every((p) => Number.isInteger(p) && p >= 0 && p <= 255)
  ) {
    if (
      parts[0] === 0 ||
      parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168)
    ) {
      return true;
    }
  }

  return false;
}

function safeFilename(input: string | null, fallback: string): string {
  const raw = (input || fallback).split(/[\\/]/).pop() || fallback;
  const cleaned = raw
    .replace(/["\r\n]/g, '')
    .trim()
    .slice(0, 120);
  return cleaned || fallback;
}

async function GET({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 300,
    keyPrefix: 'download',
  });
  if (limited) return limited;

  const auth = getAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return respErr('Unauthorized', { status: 401 });

  const { searchParams, origin } = new URL(request.url);
  const raw = searchParams.get('url');
  if (!raw) return respErr('Missing url', { status: 400 });

  let target: URL;
  try {
    target = new URL(raw, origin);
  } catch {
    return respErr('Invalid url', { status: 400 });
  }

  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return respErr('Invalid url', { status: 400 });
  }

  if (isPrivateHost(target.hostname)) {
    return respErr('Forbidden source', { status: 403 });
  }

  // Follow redirects manually and re-check each hop — default fetch() would
  // allow an open redirect into loopback / link-local / cloud metadata.
  let upstream: Response | null = null;
  let currentUrl = target.toString();
  for (let redirects = 0; redirects <= 5; redirects++) {
    upstream = await fetch(currentUrl, { redirect: 'manual' });
    if (upstream.status < 300 || upstream.status >= 400) break;

    const location = upstream.headers.get('location');
    if (!location || redirects === 5) {
      return respErr('Failed to follow remote redirect', { status: 502 });
    }

    let nextUrl: URL;
    try {
      nextUrl = new URL(location, currentUrl);
    } catch {
      return respErr('Invalid redirect URL', { status: 400 });
    }

    if (
      (nextUrl.protocol !== 'https:' && nextUrl.protocol !== 'http:') ||
      isPrivateHost(nextUrl.hostname)
    ) {
      return respErr('Forbidden redirect', { status: 403 });
    }
    currentUrl = nextUrl.toString();
  }

  if (!upstream || !upstream.ok || !upstream.body) {
    return respErr(`Upstream returned ${upstream?.status ?? 502}`, {
      status:
        upstream && upstream.status >= 400 && upstream.status < 600
          ? upstream.status
          : 502,
    });
  }

  const filename = safeFilename(
    searchParams.get('name') || searchParams.get('filename'),
    target.pathname.split('/').pop() || 'download'
  );

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type':
        upstream.headers.get('content-type') || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, max-age=600',
    },
  });
}

export const Route = createFileRoute('/api/storage/download')({
  server: { handlers: { GET } },
});
