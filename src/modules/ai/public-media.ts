import fs from 'node:fs';
import path from 'node:path';

import { envConfigs } from '@/config';
import { md5 } from '@/lib/hash';
import { getStorage } from '@/modules/storage/service';

/**
 * Ensures media URL is a publicly accessible HTTPS URL.
 * Automatically uploads local relative paths (/videos/...) and base64 data URIs to Cloudflare R2 storage.
 */
export async function ensurePublicMediaUrl(
  inputUrl: string,
  mediaKind: 'image' | 'audio' | 'video' = 'image'
): Promise<string> {
  if (!inputUrl) return '';
  const trimmed = inputUrl.trim();

  // If already an external public HTTP/HTTPS URL and not localhost / 127.0.0.1
  if (
    /^https?:\/\//i.test(trimmed) &&
    !trimmed.includes('localhost') &&
    !trimmed.includes('127.0.0.1')
  ) {
    return trimmed;
  }

  let buffer: Buffer | null = null;
  let contentType =
    mediaKind === 'audio'
      ? 'audio/mpeg'
      : mediaKind === 'video'
        ? 'video/mp4'
        : 'image/jpeg';
  let ext = mediaKind === 'audio' ? 'mp3' : mediaKind === 'video' ? 'mp4' : 'jpg';

  if (trimmed.startsWith('data:')) {
    const match = trimmed.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      contentType = match[1];
      if (contentType.includes('png')) ext = 'png';
      else if (contentType.includes('webp')) ext = 'webp';
      else if (contentType.includes('mp3') || contentType.includes('mpeg')) ext = 'mp3';
      else if (contentType.includes('wav')) ext = 'wav';
      else if (contentType.includes('mp4')) ext = 'mp4';
      buffer = Buffer.from(match[2], 'base64');
    }
  } else if (trimmed.startsWith('/') || trimmed.startsWith('\\')) {
    const cleanPath = trimmed.replace(/^[/\\]+/, '');
    const localFilePath = path.join(process.cwd(), 'public', cleanPath);
    try {
      if (fs.existsSync(localFilePath)) {
        buffer = fs.readFileSync(localFilePath);
        if (cleanPath.endsWith('.png')) {
          contentType = 'image/png';
          ext = 'png';
        } else if (cleanPath.endsWith('.webp')) {
          contentType = 'image/webp';
          ext = 'webp';
        } else if (cleanPath.endsWith('.mp3')) {
          contentType = 'audio/mpeg';
          ext = 'mp3';
        } else if (cleanPath.endsWith('.mp4')) {
          contentType = 'video/mp4';
          ext = 'mp4';
        }
      }
    } catch {
      // Ignore filesystem errors in edge runtimes
    }
  }

  try {
    const storage = await getStorage();
    if (storage && buffer) {
      const hash = md5(buffer);
      const objectKey = `workflow/${mediaKind}_${hash}.${ext}`;
      const publicUrl = storage.getPublicUrl({ key: objectKey });

      const exists = await storage.exists({ key: objectKey }).catch(() => false);
      if (exists && publicUrl) {
        return publicUrl;
      }

      const uploadRes = await storage.uploadFile({
        body: buffer,
        key: objectKey,
        contentType,
        disposition: 'inline',
      });

      if (uploadRes.success && uploadRes.url) {
        return uploadRes.url;
      }
    }
  } catch (storageErr: any) {
    console.warn('[Public Media] Storage upload error:', storageErr?.message);
  }

  if (trimmed.startsWith('/') || trimmed.startsWith('\\')) {
    const cleanPath = trimmed.replace(/^[/\\]+/, '');
    const siteBase = (envConfigs.app_url || 'https://airap-video.net').replace(
      /\/+$/,
      ''
    );
    return `${siteBase}/${cleanPath}`;
  }

  return trimmed;
}
