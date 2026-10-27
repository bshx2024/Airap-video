import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { getAIProvider } from '@/modules/ai/service';
import { isMockMode } from '@/modules/config/service';
import { getUuid } from '@/lib/hash';
import { respData, respErr } from '@/lib/resp';

import fs from 'node:fs';
import path from 'node:path';
import { getStorage } from '@/modules/storage/service';
import { md5 } from '@/lib/hash';

/**
 * Ensures media URL is a publicly accessible HTTPS URL.
 * Automatically uploads local relative paths (/imgs/...) and data URIs to Cloudflare R2 storage.
 */
async function ensurePublicMediaUrl(
  inputUrl: string,
  mediaKind: 'image' | 'audio' = 'image'
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

  const storage = await getStorage();
  if (!storage) {
    console.warn(`[Workflow Video] Storage not configured, using original URL: ${trimmed}`);
    return trimmed;
  }

  let buffer: Buffer | null = null;
  let contentType = mediaKind === 'audio' ? 'audio/mpeg' : 'image/jpeg';
  let ext = mediaKind === 'audio' ? 'mp3' : 'jpg';

  if (trimmed.startsWith('data:')) {
    const match = trimmed.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      contentType = match[1];
      if (contentType.includes('png')) ext = 'png';
      else if (contentType.includes('webp')) ext = 'webp';
      else if (contentType.includes('mp3') || contentType.includes('mpeg')) ext = 'mp3';
      else if (contentType.includes('wav')) ext = 'wav';
      buffer = Buffer.from(match[2], 'base64');
    }
  } else if (trimmed.startsWith('/') || trimmed.startsWith('\\')) {
    const cleanPath = trimmed.replace(/^[/\\]+/, '');
    const localFilePath = path.join(process.cwd(), 'public', cleanPath);
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
      }
    }
  }

  if (buffer) {
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

  return trimmed;
}

async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      imageUrl = '',
      imageUrls = [],
      audioUrl = '',
      prompt = 'Rapper singing rap song, high energy, synchronized mouth lip sync',
      model = envConfigs.rap_video_model || 'seedance-2-5',
      resolution = envConfigs.rap_video_resolution || '480p',
      duration = 5,
      mock: reqMock,
    } = body;

    const rawImages = imageUrls.length > 0 ? imageUrls : imageUrl ? [imageUrl] : [];
    if (rawImages.length === 0) {
      return respErr('Portrait image URL is required');
    }
    if (!audioUrl) {
      return respErr('Audio URL is required for video lip-sync');
    }

    const mock = reqMock !== undefined ? Boolean(reqMock) : await isMockMode();

    if (mock) {
      // 0 成本调试模拟
      const mockTaskId = `mock_video_${getUuid().slice(0, 8)}`;
      return respData({
        taskId: mockTaskId,
        status: 'success',
        videoUrl: 'https://pixanyoss.16781678.xyz/palix-ai.mp4',
        mock: true,
        message: 'Mock 模式：已即时生成示例 MV 视频',
      });
    }

    // Convert local images or data URLs into public R2 URLs
    const publicImages = await Promise.all(
      rawImages.map((img: string) => ensurePublicMediaUrl(img, 'image'))
    );
    const publicAudioUrl = await ensurePublicMediaUrl(audioUrl, 'audio');

    // Pre-flight check: ensure the audio URL is alive and not 404
    try {
      if (/^https?:\/\//i.test(publicAudioUrl)) {
        const headCheck = await fetch(publicAudioUrl, { method: 'HEAD', signal: AbortSignal.timeout(4000) });
        if (headCheck.status === 404) {
          return respErr('伴奏音频链接已失效或过期 (HTTP 404)。请在第2步「Suno 编曲」节点重新点击单步调试生成最新音频。');
        }
      }
    } catch (e: any) {
      console.warn('[Workflow Video] Audio preflight check note:', e.message);
    }

    // If happyhorse model is selected, dispatch directly to Alibaba Cloud Model Studio International
    if (model.toLowerCase().includes('happyhorse')) {
      const alibabaApiKey = envConfigs.alibaba_api_key;
      const alibabaBaseUrl = envConfigs.alibaba_base_url;
      if (!alibabaApiKey) {
        return respErr('Alibaba Model Studio API Key is not configured (ALIBABA_API_KEY).');
      }

      const origin = new URL(alibabaBaseUrl || 'https://ws-2txa9apyfxruykae.us-east-1.maas.aliyuncs.com').origin;
      const endpoint = `${origin}/api/v1/services/aigc/video-generation/video-synthesis`;

      const normalizedResolution = (resolution || '480p').toUpperCase();
      const validResolution = ['480P', '720P', '1080P'].includes(normalizedResolution)
        ? normalizedResolution
        : '480P';

      const payload = {
        model: 'happyhorse-1.1-r2v',
        input: {
          prompt,
          media: publicImages.map((url) => ({
            type: 'reference_image',
            url,
          })),
        },
        parameters: {
          duration: Number(duration) || 5,
          resolution: validResolution,
        },
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${alibabaApiKey}`,
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.code) {
        throw new Error(json.message || `Alibaba happyhorse request failed (HTTP ${res.status})`);
      }

      const taskId = json.output?.task_id;
      if (!taskId) {
        throw new Error('Alibaba happyhorse returned no task_id');
      }

      return respData({
        taskId,
        provider: 'alibaba',
        status: 'processing',
        mock: false,
        message: `已成功调度阿里百炼国际 HappyHorse 模型 (${model}) 驱动渲染`,
      });
    }

    const provider = await getAIProvider();
    if (!provider) {
      return respErr('No AI Provider (APIMart / KIE) configured for video generation.');
    }

    const callbackUrl = `${envConfigs.app_url || 'https://airap.video'}/api/ai/task`;

    const res = await provider.generate({
      params: {
        mediaType: 'video' as any,
        prompt,
        model,
        callbackUrl,
        options: {
          image_url: publicImages[0],
          image_urls: publicImages,
          audio_url: publicAudioUrl,
          resolution,
          duration: Number(duration) || 5,
        },
      },
    });

    return respData({
      taskId: res.taskId,
      status: 'processing',
      mock: false,
      message: `已成功调度视频模型 (${model}) 驱动渲染`,
    });
  } catch (err: any) {
    console.error('Workflow Video Error:', err);
    return respErr(err.message || 'Failed to dispatch video generation');
  }
}

export const Route = createFileRoute('/api/ai/workflow/video')({
  server: {
    handlers: { POST },
  },
});
