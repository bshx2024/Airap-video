import { m } from '@/paraglide/messages.js';

/** Map upload-media API error messages to localized UI copy. */
export function resolveUploadMediaErrorMessage(
  message?: string | null
): string {
  const raw = (message || '').trim();
  if (!raw) return m['landing.hero.upload_failed']();

  if (
    raw === 'storage_required' ||
    raw.includes('storage_required') ||
    /public storage|r2 storage is not configured|cloudflare r2 storage is not configured/i.test(
      raw
    )
  ) {
    return m['landing.hero.upload_storage_required']();
  }

  if (/unauthorized/i.test(raw)) {
    return m['landing.hero.sign_in_to_upload']();
  }

  if (/image too large|exceeds the .*mb limit/i.test(raw)) {
    return m['landing.hero.upload_size_limit']();
  }

  if (/is not an image|must be a .*image/i.test(raw)) {
    return m['common.error.upload_image_only']();
  }

  if (/no files provided|upload failed|upload media failed/i.test(raw)) {
    return m['landing.hero.upload_failed']();
  }

  // Bare API error codes should never surface as toast text.
  if (/^[a-z][a-z0-9_]*$/i.test(raw)) {
    return m['landing.hero.upload_failed']();
  }

  return raw;
}

export function isUploadUnauthorized(
  message?: string | null,
  status?: number
): boolean {
  return status === 401 || /unauthorized/i.test(message || '');
}
