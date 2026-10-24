import { apiErrorMessage } from '@/lib/api-error';

function isLoopbackHostname(hostname: string): boolean {
  const value = hostname.toLowerCase();
  return (
    value === 'localhost' ||
    value.endsWith('.localhost') ||
    value === '0.0.0.0' ||
    value === '::1' ||
    value === '[::1]' ||
    /^127(?:\.\d{1,3}){3}$/.test(value)
  );
}

/** Bundled/same-origin assets still need a public storage URL for AI providers. */
export function isLocalMediaUrl(
  src: string,
  origin: string = typeof window === 'undefined' ? '' : window.location.origin
): boolean {
  if (!src || !origin) return false;
  try {
    const url = new URL(src, origin);
    return url.origin === origin || isLoopbackHostname(url.hostname);
  } catch {
    return false;
  }
}

function mediaMimeType(pathname: string, responseType: string): string {
  const normalized = responseType.split(';')[0].trim().toLowerCase();
  if (normalized && normalized !== 'application/octet-stream') {
    return normalized;
  }
  const extension = pathname.split('.').pop()?.toLowerCase();
  return (
    {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      m4v: 'video/x-m4v',
    }[extension ?? ''] || 'application/octet-stream'
  );
}

export interface LocalMediaSource {
  src: string;
  name?: string;
}

/**
 * Copy bundled/same-origin media into configured public storage before it is
 * handed to an external generation provider. CDN URLs pass through unchanged.
 */
export async function publishLocalMediaSources(
  sources: LocalMediaSource[]
): Promise<string[]> {
  const urls = sources.map((source) => source.src);
  const localSources = sources
    .map((source, index) => ({ source, index }))
    .filter(({ source }) => isLocalMediaUrl(source.src));
  if (localSources.length === 0) return urls;

  const files = await Promise.all(
    localSources.map(async ({ source }) => {
      const sourceUrl = new URL(source.src, window.location.origin);
      const assetUrl = isLoopbackHostname(sourceUrl.hostname)
        ? new URL(
            `${sourceUrl.pathname}${sourceUrl.search}`,
            window.location.origin
          )
        : sourceUrl;
      const response = await fetch(assetUrl.href, {
        credentials: 'same-origin',
      });
      if (!response.ok) {
        throw new Error(
          apiErrorMessage(`Unable to load example media (${response.status})`)
        );
      }

      const blob = await response.blob();
      const filename =
        source.name ||
        decodeURIComponent(assetUrl.pathname.split('/').pop() || '') ||
        'reference-media';
      return new File([blob], filename, {
        type: mediaMimeType(assetUrl.pathname, blob.type),
      });
    })
  );

  const formData = new FormData();
  for (const file of files) formData.append('files', file);

  const res = await fetch('/api/storage/upload-media', {
    method: 'POST',
    body: formData,
  });
  const json = await res.json().catch(() => ({}));
  const uploaded: string[] = Array.isArray(json?.data?.urls)
    ? json.data.urls
    : Array.isArray(json?.urls)
      ? json.urls
      : [];

  if (!res.ok || json?.code !== 0 || uploaded.length !== localSources.length) {
    throw new Error(json?.message || apiErrorMessage('Upload failed'));
  }

  localSources.forEach(({ index }, uploadIndex) => {
    urls[index] = uploaded[uploadIndex];
  });
  return urls;
}
