import { toast } from 'sonner';

import { extractMediaUrl } from '@/core/ai/types';
import { clampVideoDuration } from '@/config/ai-models';
import { pollPendingCreationTasks } from '@/modules/creations/polling';
import { saveLocalCreation } from '@/modules/creations/storage';
import { ApiError, apiPost } from '@/lib/api-client';
import {
  isCjkPromptTooShort,
  MIN_CJK_PROMPT_LENGTH,
} from '@/lib/prompt-validation';
import {
  isLocalMediaUrl,
  publishLocalMediaSources,
} from '@/lib/publish-local-media';
import { resolveUploadMediaErrorMessage } from '@/lib/upload-media-error';
import { m } from '@/paraglide/messages.js';
import { formatLocalizedErrorMessage } from '@/components/sites/root/generation-errors';
import { persistHomeHeroTaskId } from '@/components/sites/video-lite/video-hero-task';
import { isVideoMediaUrl } from '@/components/sites/video-lite/video-hero-utils';
import type { VideoHeroGenerationResult } from '@/components/sites/video-lite/VideoHeroResultPanel';

type SetGenerationResult = (
  value:
    | VideoHeroGenerationResult
    | null
    | ((
        prev: VideoHeroGenerationResult | null
      ) => VideoHeroGenerationResult | null)
) => void;

export async function runVideoHeroGenerate(args: {
  prompt: string;
  imageUrls: string[];
  imageNames: string[];
  frameLimit: number;
  isFirstLastFrameMode: boolean;
  firstFrame?: string;
  lastFrame?: string;
  sessionUser: unknown;
  requireAuth: () => void;
  selectedModelId: string;
  resolution: string;
  duration: number;
  aspectRatio: string;
  referenceMode?: boolean;
  setGenerationResult: SetGenerationResult;
  setImageUrls: (value: string[] | ((prev: string[]) => string[])) => void;
  setIsGenerating: (value: boolean) => void;
}) {
  const {
    prompt,
    imageUrls,
    imageNames,
    frameLimit,
    isFirstLastFrameMode,
    firstFrame,
    lastFrame,
    sessionUser,
    requireAuth,
    selectedModelId,
    resolution,
    duration,
    aspectRatio,
    referenceMode = false,
    setGenerationResult,
    setImageUrls,
    setIsGenerating,
  } = args;

  if (!prompt.trim()) {
    toast.error(m['landing.hero.alert_enter_text_prompt']());
    return;
  }
  if (isCjkPromptTooShort(prompt)) {
    toast.error(
      m['landing.hero.prompt_too_short']({ min: MIN_CJK_PROMPT_LENGTH })
    );
    return;
  }
  if (!referenceMode && isFirstLastFrameMode && lastFrame && !firstFrame) {
    toast.error(m['landing.hero.upload_first_frame']());
    return;
  }
  if (!sessionUser) {
    requireAuth();
    return;
  }

  const mediaUrls = imageUrls.map((url) => url.trim()).filter(Boolean);
  const validImages = mediaUrls
    .filter((url) => !isVideoMediaUrl(url))
    .slice(0, frameLimit);
  const validVideos = mediaUrls.filter((url) => isVideoMediaUrl(url));
  const isReference = referenceMode || validVideos.length > 0;
  if (isReference && validImages.length === 0 && validVideos.length === 0) {
    toast.error(m['landing.hero.upload_reference_video']());
    return;
  }

  const mode = isReference
    ? 'reference-to-video'
    : validImages.length > 0
      ? 'image-to-video'
      : 'text-to-video';
  const durationSeconds = clampVideoDuration(selectedModelId, duration);
  const options: Record<string, unknown> = {
    mode,
    resolution,
    duration: durationSeconds,
    aspect_ratio: aspectRatio,
  };

  const publishSources = isReference ? mediaUrls : validImages;

  const optimisticId = `task-${Date.now()}`;
  persistHomeHeroTaskId(null);
  setGenerationResult({
    id: optimisticId,
    status: 'processing',
    prompt: prompt.trim(),
  });
  setTimeout(() => {
    document
      .getElementById('generation-result')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 80);

  setIsGenerating(true);
  try {
    let publishedMedia = publishSources;
    if (publishSources.some((url) => isLocalMediaUrl(url))) {
      try {
        publishedMedia = await publishLocalMediaSources(
          publishSources.map((src) => {
            const idx = imageUrls.findIndex((item) => item.trim() === src);
            return {
              src,
              name:
                (idx >= 0 && imageNames[idx]) ||
                src.split('/').pop() ||
                (isVideoMediaUrl(src) ? 'reference.mp4' : 'reference.png'),
            };
          })
        );
        setImageUrls((prev) => {
          const next = [...prev];
          publishSources.forEach((src, index) => {
            const slot = next.findIndex((item) => item.trim() === src);
            if (slot >= 0 && publishedMedia[index]) {
              next[slot] = publishedMedia[index];
            }
          });
          return next;
        });
      } catch (err: any) {
        const errMsg = resolveUploadMediaErrorMessage(err?.message);
        persistHomeHeroTaskId(null);
        setGenerationResult({
          status: 'failed',
          error: errMsg,
        });
        toast.error(errMsg);
        return;
      }
    }

    const publishedImages = publishedMedia.filter(
      (url) => !isVideoMediaUrl(url)
    );
    const publishedVideos = publishedMedia.filter((url) =>
      isVideoMediaUrl(url)
    );
    if (isReference && publishedVideos.length > 0) {
      options.video_urls = publishedVideos;
    }

    const res = await apiPost<any>('/api/ai/generate', {
      mediaType: 'video',
      mode,
      prompt: prompt.trim(),
      model: selectedModelId,
      ...(publishedImages.length > 0 ? { imageUrls: publishedImages } : {}),
      options,
    });

    const targetId = res?.taskId || res?.id || res?.dbId || optimisticId;
    const dbId = res?.dbId || res?.id;
    const durationLabel = `${durationSeconds}s`;

    if (
      res?.taskInfo?.userErrorCode ||
      res?.taskStatus === 'failed' ||
      res?.taskStatus === 'canceled'
    ) {
      const errMsg = formatLocalizedErrorMessage(
        res?.taskInfo?.userErrorCode || 'generation_failed'
      );
      persistHomeHeroTaskId(null);
      saveLocalCreation({
        id: targetId,
        dbId,
        mediaType: 'video',
        mode,
        pageKey: 'home',
        prompt: prompt.trim(),
        model: selectedModelId,
        url: '',
        status: 'failed',
        errorCode: res?.taskInfo?.userErrorCode,
        resolution,
        duration: durationLabel,
      });
      setGenerationResult({
        id: targetId,
        status: 'failed',
        error: errMsg,
        prompt: prompt.trim(),
      });
      toast.error(errMsg);
      return;
    }

    if (!res?.taskId && !res?.id && !res?.dbId) {
      const errMsg = m['landing.hero.generation_failed']();
      persistHomeHeroTaskId(null);
      setGenerationResult({
        status: 'failed',
        error: errMsg,
      });
      toast.error(errMsg);
      return;
    }

    const immediateUrl = extractMediaUrl(res);
    if (res?.taskStatus === 'success' && immediateUrl) {
      persistHomeHeroTaskId(targetId);
      saveLocalCreation({
        id: targetId,
        dbId,
        mediaType: 'video',
        mode,
        pageKey: 'home',
        prompt: prompt.trim(),
        model: selectedModelId,
        url: immediateUrl,
        status: 'success',
        resolution,
        duration: durationLabel,
      });
      setGenerationResult({
        id: targetId,
        status: 'success',
        videoUrl: immediateUrl,
        prompt: prompt.trim(),
      });
      toast.success(m['stp.common.task_submitted_video']());
      return;
    }

    persistHomeHeroTaskId(targetId);
    saveLocalCreation({
      id: targetId,
      dbId,
      mediaType: 'video',
      mode,
      pageKey: 'home',
      prompt: prompt.trim(),
      model: selectedModelId,
      url: '',
      status: 'processing',
      resolution,
      duration: durationLabel,
    });
    setGenerationResult({
      id: targetId,
      taskId: res?.taskId,
      status: 'processing',
      prompt: prompt.trim(),
    });
    toast.success(m['stp.common.task_submitted_video']());
    pollPendingCreationTasks('video');
  } catch (err: any) {
    const message = err instanceof ApiError ? err.message : err?.message || '';
    const errMsg = formatLocalizedErrorMessage(message);
    persistHomeHeroTaskId(null);
    setGenerationResult({
      status: 'failed',
      error: errMsg,
    });
    toast.error(errMsg);
  } finally {
    setIsGenerating(false);
  }
}
