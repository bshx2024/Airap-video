import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getStorage } from '@/modules/storage/service';
import { md5 } from '@/lib/hash';
import { consumeSlidingWindowRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';
import {
  declaredBodyExceeds,
  extFromImageMime,
  isDeclaredImageType,
  sniffImageMime,
} from '@/lib/upload-guard';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 35 * 1024 * 1024;
const MAX_FILES = 10;

// Per request: bounds memory (formData() buffers the whole body) and storage use.
const MAX_REQUEST_BYTES = MAX_VIDEO_SIZE + 1024 * 1024;

// Sliding windows rather than a 1s minimum interval: the uploaders send several
// files as parallel requests (gallery picks, editor pastes), which a minimum
// interval would reject. Per account too, so one user can't sidestep the IP
// bucket by switching networks.
const UPLOAD_WINDOW_MS = 10_000;
const UPLOADS_PER_IP = 60;
const UPLOADS_PER_USER = 20;

function clientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isVideoFile(file: File): boolean {
  return (
    file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name)
  );
}

function isAudioFile(file: File): boolean {
  return (
    file.type.startsWith('audio/') ||
    /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name)
  );
}

function uploadRateLimited(key: string, limit: number): Response | null {
  const { allowed, retryAfterMs } = consumeSlidingWindowRateLimit({
    key: `upload-media|${key}`,
    limit,
    windowMs: UPLOAD_WINDOW_MS,
  });
  if (allowed) return null;
  const retryAfter = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return Response.json(
    {
      code: -1,
      error: 'too_many_requests',
      message: `Please retry after ${retryAfter}s.`,
    },
    {
      status: 429,
      headers: {
        'cache-control': 'no-store',
        'retry-after': String(retryAfter),
      },
    }
  );
}

export async function POST({ request }: { request: Request }) {
  const limited = uploadRateLimited(`ip:${clientIp(request)}`, UPLOADS_PER_IP);
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized');

    const userLimited = uploadRateLimited(
      `user:${session.user.id}`,
      UPLOADS_PER_USER
    );
    if (userLimited) return userLimited;

    if (declaredBodyExceeds(request, MAX_REQUEST_BYTES + 64 * 1024)) {
      return respErr(
        `Upload exceeds the ${MAX_REQUEST_BYTES / 1024 / 1024}MB limit`
      );
    }

    const formData = await request.formData();
    const files = (
      formData.getAll('files').length > 0
        ? formData.getAll('files')
        : formData.getAll('file')
    ) as File[];
    if (!files.length) return respErr('No files provided');
    if (files.length > MAX_FILES) {
      return respErr(`At most ${MAX_FILES} files are allowed per request`);
    }
    if (files.reduce((sum, f) => sum + f.size, 0) > MAX_REQUEST_BYTES) {
      return respErr(
        `Upload exceeds the ${MAX_REQUEST_BYTES / 1024 / 1024}MB limit`
      );
    }

    const storage = await getStorage();
    const uploadResults: Array<{
      url: string;
      key: string;
      filename: string;
      deduped: boolean;
    }> = [];

    for (const file of files) {
      const isVideo = isVideoFile(file);
      const isAudio = isAudioFile(file);
      const maxSize = isVideo
        ? MAX_VIDEO_SIZE
        : isAudio
          ? 25 * 1024 * 1024
          : MAX_IMAGE_SIZE;

      if (!isVideo && !isAudio && !isDeclaredImageType(file.type)) {
        return respErr(
          `File ${file.name} is not an image, video, or audio file`
        );
      }
      if (typeof file.size === 'number' && file.size > maxSize) {
        return respErr(
          `File ${file.name} exceeds the ${Math.round(maxSize / 1024 / 1024)}MB limit`
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      if (arrayBuffer.byteLength > maxSize) {
        return respErr(
          `File ${file.name} exceeds the ${Math.round(maxSize / 1024 / 1024)}MB limit`
        );
      }
      const body = new Uint8Array(arrayBuffer);

      let mimeType = '';
      let ext: string | null = '';

      if (isVideo) {
        mimeType = file.type || 'video/mp4';
        ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
      } else if (isAudio) {
        mimeType = file.type || 'audio/wav';
        ext = file.name.split('.').pop()?.toLowerCase() || 'wav';
      } else {
        // Type and extension come from the bytes, not the client's claim.
        mimeType = sniffImageMime(body);
        ext = extFromImageMime(mimeType);
        if (!ext) {
          return respErr(`File ${file.name} is not a supported image`);
        }
      }

      const digest = md5(body);
      // R2Provider prepends its own uploadPath (default `uploads`), so the object
      // key is the bare filename. The local fallback uses `public/uploads/<file>`.
      const objectKey = `${digest}.${ext}`;

      // Reference images must be publicly reachable by dual providers (APIMart/KIE).
      // Local disk fallback is not enough — require R2 (admin → Settings → Storage).
      if (!storage) {
        return respErr('storage_required');
      }

      const exists = await storage.exists({ key: objectKey });
      if (exists) {
        const publicUrl = storage.getPublicUrl({ key: objectKey });
        if (publicUrl) {
          uploadResults.push({
            url: publicUrl,
            key: objectKey,
            filename: file.name,
            deduped: true,
          });
          continue;
        }
      }

      const result = await storage.uploadFile({
        body,
        key: objectKey,
        contentType: mimeType,
        disposition: 'inline',
      });

      if (!result.success || !result.url) {
        return respErr(result.error || 'Upload failed');
      }

      uploadResults.push({
        url: result.url,
        key: result.key || objectKey,
        filename: file.name,
        deduped: false,
      });
    }

    return respData({
      urls: uploadResults.map((r) => r.url),
      results: uploadResults,
    });
  } catch (e: any) {
    console.error('upload media failed:', e);
    return respErr(e?.message || 'upload media failed');
  }
}

export const handlers = { POST };

export const Route = createFileRoute('/api/storage/upload-media')({
  server: {
    handlers,
  },
});
