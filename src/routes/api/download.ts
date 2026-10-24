import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';

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
    parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
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

async function GET({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 300,
    keyPrefix: 'download',
  });
  if (limited) return limited;

  const auth = getAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return new Response('Unauthorized', { status: 401 });

  const urlObj = new URL(request.url);
  const targetUrl = urlObj.searchParams.get('url');
  const filename =
    urlObj.searchParams.get('filename') ||
    urlObj.searchParams.get('name') ||
    'download';

  if (!targetUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    const parsed = new URL(targetUrl);
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      isPrivateHost(parsed.hostname)
    ) {
      return new Response('Invalid URL protocol', { status: 400 });
    }

    let response: Response | null = null;
    let currentUrl = targetUrl;
    for (let redirects = 0; redirects <= 5; redirects++) {
      response = await fetch(currentUrl, { redirect: 'manual' });
      if (response.status < 300 || response.status >= 400) break;

      const location = response.headers.get('location');
      if (!location || redirects === 5) {
        return new Response('Failed to follow remote redirect', {
          status: 502,
        });
      }
      const nextUrl = new URL(location, currentUrl);
      if (
        !['http:', 'https:'].includes(nextUrl.protocol) ||
        isPrivateHost(nextUrl.hostname)
      ) {
        return new Response('Invalid redirect URL', { status: 400 });
      }
      currentUrl = nextUrl.toString();
    }
    if (!response) {
      return new Response('Failed to fetch remote asset', { status: 502 });
    }
    if (!response.ok) {
      return new Response(`Failed to fetch remote asset: ${response.status}`, {
        status: response.status,
      });
    }

    const contentType =
      response.headers.get('content-type') || 'application/octet-stream';
    const body = response.body;

    const safeFilename =
      filename.replace(/[\u0000-\u001f\u007f"\\/]/g, '_').slice(0, 255) ||
      'download';

    return new Response(body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return new Response('Download proxy failed', {
      status: 500,
    });
  }
}

export const Route = createFileRoute('/api/download')({
  server: {
    handlers: { GET },
  },
});
