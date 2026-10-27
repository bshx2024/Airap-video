import { createFileRoute } from '@tanstack/react-router';

import { AITaskStatus, extractAudioUrl, extractMediaUrl } from '@/core/ai/types';
import { getAIProvider } from '@/modules/ai/service';
import { respData, respErr } from '@/lib/resp';

async function GET({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const taskId = url.searchParams.get('taskId');
    const mediaType = url.searchParams.get('mediaType') || 'music';

    if (!taskId) {
      return respErr('taskId is required');
    }

    if (taskId.startsWith('mock_')) {
      if (mediaType === 'video') {
        return respData({
          taskId,
          status: 'success',
          videoUrl: 'https://pixanyoss.16781678.xyz/palix-ai.mp4',
        });
      }
      return respData({
        taskId,
        status: 'success',
        audioUrl: 'https://pixanyoss.16781678.xyz/test.mp3',
      });
    }

    // Support Alibaba Cloud Model Studio tasks (UUID with dashes)
    const isAlibabaTask =
      url.searchParams.get('provider') === 'alibaba' ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);

    if (isAlibabaTask) {
      const { envConfigs } = await import('@/config');
      const alibabaApiKey = envConfigs.alibaba_api_key;
      const alibabaBaseUrl = envConfigs.alibaba_base_url;
      const origin = new URL(alibabaBaseUrl || 'https://ws-2txa9apyfxruykae.us-east-1.maas.aliyuncs.com').origin;
      const queryEndpoint = `${origin}/api/v1/tasks/${taskId}`;

      const res = await fetch(queryEndpoint, {
        headers: {
          Authorization: `Bearer ${alibabaApiKey}`,
        },
      });

      const json = await res.json().catch(() => ({}));
      const taskOutput = json.output || {};
      const taskStatus = taskOutput.task_status;

      if (taskStatus === 'SUCCEEDED') {
        return respData({
          taskId,
          status: 'success',
          videoUrl: taskOutput.video_url || null,
          taskInfo: taskOutput,
          raw: json,
        });
      } else if (taskStatus === 'FAILED') {
        return respData({
          taskId,
          status: 'failed',
          error: taskOutput.message || json.message || 'Alibaba video generation failed',
          taskInfo: taskOutput,
          raw: json,
        });
      } else {
        return respData({
          taskId,
          status: 'processing',
          videoUrl: null,
          taskInfo: taskOutput,
          raw: json,
        });
      }
    }

    const provider = await getAIProvider();
    if (!provider || typeof provider.query !== 'function') {
      return respErr('Active provider does not support query');
    }

    const queryRes = await provider.query({
      taskId,
      mediaType,
      model: mediaType === 'music' ? 'suno-v4' : undefined,
    });

    const isSuccess = queryRes.taskStatus === AITaskStatus.SUCCESS;
    const isFailed = queryRes.taskStatus === AITaskStatus.FAILED;

    let audioUrl = extractAudioUrl(queryRes);
    let videoUrl = extractMediaUrl(queryRes);

    // If audio is successfully generated from Suno (temp URL), attempt background archive to R2
    if (isSuccess && audioUrl && (audioUrl.includes('tempfile') || audioUrl.includes('aiquickdraw'))) {
      try {
        const { getStorage } = await import('@/modules/storage/service');
        const storage = await getStorage();
        if (storage) {
          const objectKey = `workflow/audio_${taskId}.mp3`;
          const exists = await storage.exists({ key: objectKey }).catch(() => false);
          if (exists) {
            const publicUrl = storage.getPublicUrl({ key: objectKey });
            if (publicUrl) audioUrl = publicUrl;
          } else {
            const fetchRes = await fetch(audioUrl, { signal: AbortSignal.timeout(6000) });
            if (fetchRes.ok) {
              const buf = Buffer.from(await fetchRes.arrayBuffer());
              const upRes = await storage.uploadFile({
                body: buf,
                key: objectKey,
                contentType: 'audio/mpeg',
                disposition: 'inline',
              });
              if (upRes.success && upRes.url) {
                audioUrl = upRes.url;
              }
            }
          }
        }
      } catch (e: any) {
        console.warn('[Workflow Query] Non-critical: Failed to archive audio to R2:', e.message);
      }
    }

    return respData({
      taskId,
      status: isSuccess ? 'success' : isFailed ? 'failed' : 'processing',
      audioUrl: audioUrl || null,
      videoUrl: videoUrl || null,
      taskInfo: queryRes.taskInfo,
      raw: queryRes.taskResult,
    });
  } catch (err: any) {
    return respErr(err.message || 'Failed to query task status');
  }
}

export const Route = createFileRoute('/api/ai/workflow/query')({
  server: {
    handlers: { GET },
  },
});
