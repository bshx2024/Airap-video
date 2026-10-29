import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { getAIProvider } from '@/modules/ai/service';
import { isMockMode } from '@/modules/config/service';
import { getUuid } from '@/lib/hash';
import { respData, respErr } from '@/lib/resp';

import fs from 'node:fs';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import { getStorage } from '@/modules/storage/service';
import { md5 } from '@/lib/hash';

/**
 * Ensures media URL is a publicly accessible HTTPS URL.
 * Automatically uploads local relative paths (/imgs/...) and data URIs to Cloudflare R2 storage.
 */
async function ensurePublicMediaUrl(
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
  let contentType = mediaKind === 'audio' ? 'audio/mpeg' : mediaKind === 'video' ? 'video/mp4' : 'image/jpeg';
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
    console.warn('[Workflow Video] Storage upload error:', storageErr?.message);
  }

  if (trimmed.startsWith('/') || trimmed.startsWith('\\')) {
    const cleanPath = trimmed.replace(/^[/\\]+/, '');
    const siteBase = (envConfigs.app_url || 'https://airap-video.net').replace(/\/+$/, '');
    return `${siteBase}/${cleanPath}`;
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
      referenceVideoUrl = '',
      motionSyncEnabled = true,
      lipSyncEnabled = true,
      lyrics = '',
      prompt = 'Rapper singing rap song, high energy, synchronized mouth lip sync',
      model = envConfigs.rap_video_model || 'wan3.0-video',
      resolution = envConfigs.rap_video_resolution || '480p',
      aspectRatio = '9:16',
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
    const publicReferenceVideoUrl = referenceVideoUrl
      ? await ensurePublicMediaUrl(referenceVideoUrl, 'video')
      : '';

    // Validate that images are public URLs (DashScope cannot process raw base64 data URIs)
    if (publicImages.some((img: string) => img.startsWith('data:'))) {
      return respErr(
        '人像图片需转为公网可访问 CDN 链接（阿里百炼模型不支持 Base64 数据）。请在开始节点重新上传或检查存储配置。'
      );
    }

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

    // Extract first 2-3 lines of clean lyrics to steer the character mouth articulation
    const cleanLyricsSnippet = typeof lyrics === 'string'
      ? lyrics
          .replace(/\[.*?\]/g, '')
          .split('\n')
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && !s.startsWith('#'))
          .slice(0, 3)
          .join(', ')
      : '';

    // If happyhorse or wan model is selected, dispatch directly to Alibaba Cloud Model Studio International
    if (model.toLowerCase().includes('happyhorse') || model.toLowerCase().includes('wan')) {
      const { getAllConfigs } = await import('@/modules/config/service');
      const configs = await getAllConfigs();
      const alibabaApiKey = (configs.alibaba_api_key || envConfigs.alibaba_api_key || '').trim();
      const alibabaBaseUrl = (configs.alibaba_base_url || envConfigs.alibaba_base_url || '').trim();
      if (!alibabaApiKey) {
        return respErr('未配置阿里百炼 API Key。请在后台管理 [Settings -> AI -> Alibaba Cloud Model Studio] 中填入 Key 并保存。');
      }

      const origin = new URL(alibabaBaseUrl || 'https://ws-2txa9apyfxruykae.us-east-1.maas.aliyuncs.com').origin;
      const endpoint = `${origin}/api/v1/services/aigc/video-generation/video-synthesis`;

      const selectedResolution = (resolution || configs.alibaba_video_resolution || '480p').toUpperCase();
      const validResolution = ['480P', '720P', '1080P'].includes(selectedResolution)
        ? selectedResolution
        : '480P';

      const selectedDuration = Number(duration) || Number(configs.alibaba_video_duration) || 5;
      let selectedModel = model || configs.alibaba_video_model || 'wan3.0-video';

      // DashScope International Maas (us-east-1) uses happyhorse-1.1-i2v for single-image and happyhorse-1.1-r2v for duo
      if (selectedModel.toLowerCase().includes('wan2.1')) {
        selectedModel = publicImages.length > 1 ? 'happyhorse-1.1-r2v' : 'happyhorse-1.1-i2v';
      }

      const firstImage = publicImages[0];
      let effectivePrompt = prompt;

      // Check whether reference video motion transfer should be active
      let useReferenceVideo = Boolean(motionSyncEnabled !== false && publicReferenceVideoUrl);

      // If user enabled motion transfer, the model must be wan3.0-video (HappyHorse I2V is pure image-to-video only)
      if (useReferenceVideo && selectedModel.includes('happyhorse-1.1-i2v')) {
        selectedModel = 'wan3.0-video';
      }

      // If model is happyhorse-1.1-i2v, it strictly requires first_frame only (never reference_video)
      if (selectedModel === 'happyhorse-1.1-i2v') {
        useReferenceVideo = false;
      }

      // If user disabled motion transfer (or model is pure r2v/i2v without reference video),
      // sanitize any leftover "[Video 1]" references that would confuse the model
      if (!useReferenceVideo && effectivePrompt.includes('[Video 1]')) {
        effectivePrompt = effectivePrompt
          .replace(/Replace the left rapper in \[Video 1\] with the character (?:from|shown in) \[Image 1\],? and replace the right rapper in \[Video 1\] with the character (?:from|shown in) \[Image 2\]\.?/gi, 'Two high-energy hip-hop rappers, [Image 1] on the left and [Image 2] on the right, perform together in the recording studio around a hanging microphone.')
          .replace(/Replace the left rapper in \[Video 1\] with the character shown in \[Image 1\]\.?/gi, 'The energetic hip-hop rapper shown in [Image 1] performs dynamically in the recording studio into the hanging microphone.')
          .replace(/Replace the right rapper in \[Video 1\] with the character shown in \[Image 2\]\.?/gi, 'The energetic hip-hop rapper shown in [Image 2] performs dynamically in the recording studio into the hanging microphone.')
          .replace(/\[Video 1\]/g, 'the studio session');
      }

      // Enhance prompt with motion transfer guidance when reference video is provided and motion sync is enabled
      if (useReferenceVideo && !effectivePrompt.includes('Replace')) {
        effectivePrompt = `Replace the left rapper in [Video 1] with the character shown in [Image 1]. The new character [Image 1] actively delivers energetic rap singing into the hanging mic with wide pronounced mouth articulation, while strictly replicating the exact body motions, head nods, arm gestures, and hanging microphone rap battle choreography from [Video 1]. Keep the studio and right character unchanged: ${effectivePrompt}`;
      } else if (selectedModel.includes('r2v') && !effectivePrompt.includes('[Image 1]')) {
        effectivePrompt = publicImages.length > 1
          ? `The two rappers from [Image 1] and [Image 2] perform high-energy rap battle, rhythmic head nods, mouth lip sync`
          : `The rapper from [Image 1] performs high-energy rap singing, wide mouth articulation, rhythmic head nods, mouth lip sync`;
      }

      // Inject clean lyrics and strong mouth articulation directives for phoneme lip-syncing
      if (cleanLyricsSnippet && lipSyncEnabled !== false) {
        effectivePrompt += `. Pronounced mouth lip-sync: The rapper actively delivers expressive rap vocals into the hanging microphone, mouthing and pronouncing the lyrics: "${cleanLyricsSnippet}", wide open mouth movements, clear vowel and consonant articulation strictly in sync with the audio track.`;
      }

      const mediaPayload: any[] = [];
      if (useReferenceVideo) {
        mediaPayload.push({
          type: 'reference_video',
          url: publicReferenceVideoUrl,
        });
      }
      const targetImages = selectedModel === 'happyhorse-1.1-i2v' ? publicImages.slice(0, 1) : publicImages;
      targetImages.forEach((url, idx) => {
        mediaPayload.push({
          type: selectedModel.includes('r2v') ? 'reference_image' : (idx === 0 && !useReferenceVideo ? 'first_frame' : 'reference_image'),
          url,
        });
      });

      const selectedAspect = ['9:16', '16:9', '1:1'].includes(aspectRatio) ? aspectRatio : '9:16';

      const payload: any = {
        model: selectedModel,
        input: {
          prompt: effectivePrompt,
          img_url: firstImage,
          media: mediaPayload,
          ...(publicAudioUrl ? { audio_url: publicAudioUrl } : {}),
        },
        parameters: {
          watermark: false, // 彻底移除 Happy Horse 官方水印
          has_watermark: false, // 兼容性防重
          resolution: validResolution,
          duration: selectedDuration,
          ratio: selectedAspect, // 阿里百炼 DashScope 官方参数键名: ratio (支持 '9:16', '16:9', '1:1')
          aspect_ratio: selectedAspect, // 兼容其它模型格式
        },
      };

      // For Wan 2.1 legacy models supporting explicit pixel size
      if (selectedModel.toLowerCase().includes('wan2.1')) {
        const sizeMap: Record<string, Record<string, string>> = {
          '480P': { '9:16': '480*832', '16:9': '832*480', '1:1': '624*624' },
          '720P': { '9:16': '720*1280', '16:9': '1280*720', '1:1': '960*960' },
          '1080P': { '9:16': '1080*1920', '16:9': '1920*1080', '1:1': '1440*1440' },
        };
        const mappedSize = sizeMap[validResolution]?.[selectedAspect];
        if (mappedSize) {
          payload.parameters.size = mappedSize;
        }
      }

      if (selectedModel.toLowerCase().includes('wan')) {
        payload.parameters.prompt_extend = true;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${alibabaApiKey}`,
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      }).catch((fetchErr: any) => {
        throw new Error(`连接阿里百炼生视频服务超时或网络中断: ${fetchErr.message}`);
      });

      const json: any = await res.json().catch(() => ({}));
      if (!res.ok || json.code) {
        const errorMsg =
          json.message ||
          json.output?.message ||
          `阿里百炼生视频失败 (HTTP ${res.status})`;
        throw new Error(errorMsg);
      }

      const taskId = json.output?.task_id;
      if (!taskId) {
        throw new Error(
          `阿里百炼生视频服务未返回有效 task_id: ${json.message || JSON.stringify(json.output || json)}`
        );
      }

      return respData({
        taskId,
        provider: 'alibaba',
        status: 'processing',
        mock: false,
        message: `已成功向阿里百炼提交视频生成任务 (${selectedModel})`,
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
          video_url: publicReferenceVideoUrl,
          reference_video_url: publicReferenceVideoUrl,
          resolution,
          aspect_ratio: selectedAspect,
          ratio: selectedAspect,
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
