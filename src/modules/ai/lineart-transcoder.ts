import { getStorage } from '@/modules/storage/service';
import { getAllConfigs } from '@/modules/config/service';
import { envConfigs } from '@/config';

/**
 * 将用户上传的原始视频通过转码微服务提取为黑白线稿动作骨架，
 * 并自动存回 Cloudflare R2，确保送入视频大模型（Wan 3.0 / Kling）时
 * 彻底消除原人物肤色/衣服鬼影，同时 1:1 复刻身体律动、手势和口型。
 */
export async function ensureLineartReferenceVideo(params: {
  videoUrl: string;
  taskId: string;
}): Promise<string> {
  const { videoUrl, taskId } = params;

  if (!videoUrl) return '';

  // 如果已经是处理过的线稿视频，直接复用
  if (
    videoUrl.includes('_lineart.mp4') ||
    videoUrl.includes('skeleton') ||
    videoUrl.includes('tiny-desk-reference')
  ) {
    return videoUrl;
  }

  const configs = await getAllConfigs();
  const transcoderBase = (
    configs.lineart_transcoder_url ||
    envConfigs.lineart_transcoder_url ||
    ''
  ).trim().replace(/\/+$/, '');

  // 未配置微服务时优雅降级：直接沿用原视频，确保绝不阻断生成流
  if (!transcoderBase) {
    console.info(
      '[Lineart Transcoder] No LINEART_TRANSCODER_URL configured; using raw master video as reference.'
    );
    return videoUrl;
  }

  try {
    console.log(`[Lineart Transcoder] Sending video ${videoUrl} to transcoder: ${transcoderBase}`);
    const res = await fetch(`${transcoderBase}/api/extract-lineart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl, taskId }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(
        `[Lineart Transcoder] Service returned status ${res.status}: ${errText.slice(0, 150)}. Falling back to raw video.`
      );
      return videoUrl;
    }

    const arrayBuffer = await res.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      console.warn('[Lineart Transcoder] Empty buffer received, falling back to raw video.');
      return videoUrl;
    }

    const storage = await getStorage();
    if (!storage) {
      console.warn('[Lineart Transcoder] Storage not configured; cannot persist lineart video to R2.');
      return videoUrl;
    }

    const objectKey = `skeletons/${taskId}_lineart.mp4`;
    const uploadRes = await storage.uploadFile({
      body: new Uint8Array(arrayBuffer),
      key: objectKey,
      contentType: 'video/mp4',
      disposition: 'inline',
    });

    if (uploadRes.success && uploadRes.url) {
      console.log(`[Lineart Transcoder] Successfully uploaded lineart skeleton: ${uploadRes.url}`);
      return uploadRes.url;
    }

    console.warn('[Lineart Transcoder] Failed to upload skeleton to R2:', uploadRes.error);
    return videoUrl;
  } catch (err: any) {
    console.warn('[Lineart Transcoder] Exception while transcoding lineart:', err.message);
    return videoUrl;
  }
}

