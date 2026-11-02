import { createFileRoute } from '@tanstack/react-router';
import { eq } from 'drizzle-orm';

import {
  AITaskStatus,
  extractMediaUrl,
  sanitizeUserErrorMessage,
} from '@/core/ai/types';
import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { envConfigs } from '@/config';
import {
  clampVideoDuration,
  getImageModelCredits,
  getImageModelMaxImages,
  getModelSupportedAspectRatios,
  getVideoModelAspectRatios,
  getVideoModelById,
  getVideoModelCredits,
  getVideoModelMaxImages,
  getVideoModelSupportedResolutions,
  IMAGE_MODELS,
  pickAiProvider,
} from '@/config/ai-models';
import { aiTask } from '@/config/db/schema';
import { expireTimedOutTasks } from '@/modules/ai-tasks/service';
import { generateMediaWithProviderFailover } from '@/modules/ai/media-generate-failover';
import {
  createMockGenerateResult,
  getActiveAIProvider,
} from '@/modules/ai/service';
import { getAllConfigs, isMockMode } from '@/modules/config/service';
import { consume, getBalance, revoke } from '@/modules/credits/service';
import { createAIWebhookToken } from '@/lib/ai-webhook';
import { scanPromptSafety } from '@/lib/content-safety';
import { getUuid } from '@/lib/hash';
import { respData, respErr } from '@/lib/resp';

import { getPublicTaskErrorCode, toPublicTaskResult } from './-task-utils';
import { reclaimUserGhostSlots } from './task';

const MAX_ACTIVE_TASKS_PER_USER = 10;
const MAX_PROMPT_LENGTH = 2000;

function isActiveSlotConflict(error: unknown) {
  const message = String((error as any)?.message || error);
  return /uq_ai_task_user_active_slot|ai_task.*active_slot/i.test(message);
}

function isUnsafeImageUrl(value: string) {
  try {
    const { protocol, hostname } = new URL(value);
    if (!['http:', 'https:'].includes(protocol)) return true;
    const host = hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === 'localhost.localdomain' ||
      host === '::1' ||
      host === '0.0.0.0' ||
      /^(10|127)\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      /^169\.254\./.test(host)
    );
  } catch {
    return true;
  }
}

async function POST({ request }: { request: Request }) {
  let consumedCreditId: string | null = null;
  let dbTaskId: string | null = null;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized');

    await expireTimedOutTasks(MAX_ACTIVE_TASKS_PER_USER, session.user.id);

    const body = await request.json().catch(() => ({}));
    const {
      mediaType = 'image',
      prompt = '',
      model,
      mode,
      scene,
      options: rawOptions,
      imageUrl,
      imageUrls,
    } = body;

    if (mediaType !== 'image' && mediaType !== 'video') {
      return respErr('Unsupported media type');
    }

    const isVideo = mediaType === 'video';
    const effectiveMode = mode || scene || rawOptions?.mode;
    const options =
      rawOptions && typeof rawOptions === 'object' ? { ...rawOptions } : {};
    delete options.image_url;
    delete options.image_urls;
    delete options.image_input;
    if (!isVideo) {
      delete options.duration;
      delete options.video_urls;
      delete options.video_url;
      delete options.video_input;
      if (
        options.resolution &&
        ['480p', '720p', '1080p', '4k_video'].includes(
          String(options.resolution).toLowerCase()
        )
      ) {
        delete options.resolution;
      }
    }
    if (effectiveMode) options.mode = effectiveMode;

    const normalizedImageUrls = (
      Array.isArray(imageUrls) ? imageUrls : imageUrl ? [imageUrl] : []
    ).filter((url): url is string => typeof url === 'string' && Boolean(url));

    const normalizedVideoUrls = [
      ...(Array.isArray(options.video_urls) ? options.video_urls : []),
      ...(Array.isArray(options.video_input) ? options.video_input : []),
      ...(options.video_url ? [options.video_url] : []),
    ].filter((url): url is string => typeof url === 'string' && Boolean(url));

    const isMock = await isMockMode();

    if (typeof prompt !== 'string') {
      return respErr('Invalid generation request');
    }

    if (normalizedImageUrls.some((url) => isUnsafeImageUrl(url))) {
      return respErr('Invalid image URL');
    }

    if (
      !prompt.trim() &&
      normalizedImageUrls.length === 0 &&
      normalizedVideoUrls.length === 0
    ) {
      return respErr('Prompt or image is required');
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return respErr('Prompt is too long for this model');
    }

    // Pre-screen prompt with Waffo Content Safety API before reserving slots or deducting credits
    if (prompt.trim()) {
      const safetyCheck = await scanPromptSafety(prompt);
      if (!safetyCheck.allowed) {
        return respErr(
          safetyCheck.reason ||
            'Content safety check failed. Please adjust your prompt.',
          { status: 400 }
        );
      }
    }

    if (isVideo) {
      const selectedVideoModel = model ? getVideoModelById(model) : undefined;
      if (!selectedVideoModel) {
        return respErr('Unsupported model');
      }

      const supported = getVideoModelSupportedResolutions(model);
      const matched = supported.find(
        (r) =>
          r.toLowerCase() === String(options.resolution || '').toLowerCase()
      );
      options.resolution =
        matched ||
        selectedVideoModel.defaultResolution ||
        supported[0] ||
        '720P';

      const requestedDuration = parseInt(String(options.duration || ''), 10);
      const defaultDurationSeconds = parseInt(
        String(selectedVideoModel.defaultDuration || '5'),
        10
      );
      options.duration = clampVideoDuration(
        model,
        Number.isFinite(requestedDuration) && requestedDuration > 0
          ? requestedDuration
          : Number.isFinite(defaultDurationSeconds) &&
              defaultDurationSeconds > 0
            ? defaultDurationSeconds
            : 5
      );

      const supportedAspects = getVideoModelAspectRatios(model);
      const rawAspect = options.aspect_ratio
        ? String(options.aspect_ratio)
        : '';
      if (rawAspect) {
        const matchedAspect = supportedAspects.find(
          (ratio) => ratio.toLowerCase() === rawAspect.toLowerCase()
        );
        options.aspect_ratio =
          matchedAspect ||
          selectedVideoModel.defaultAspectRatio ||
          supportedAspects[0] ||
          'adaptive';
      } else {
        options.aspect_ratio =
          selectedVideoModel.defaultAspectRatio ||
          supportedAspects[0] ||
          'adaptive';
      }

      if (normalizedImageUrls.length > getVideoModelMaxImages(model)) {
        return respErr('Too many input images for this model');
      }

      const isSeedance =
        typeof model === 'string' && model.includes('seedance');
      if (
        isSeedance &&
        normalizedImageUrls.length > 0 &&
        effectiveMode !== 'reference-to-video'
      ) {
        options.aspect_ratio = 'adaptive';
      }

      if (normalizedImageUrls.length > 0) {
        options.image_urls = normalizedImageUrls;
        options.image_url = normalizedImageUrls[0];
        options.image_input = normalizedImageUrls;
      }
      if (normalizedVideoUrls.length > 0) {
        options.video_urls = normalizedVideoUrls;
      }
    } else {
      const selectedModel = model ? IMAGE_MODELS[model] : undefined;
      if (!selectedModel) {
        return respErr('Unsupported model');
      }

      const supported = selectedModel.supportedResolutions || ['1K', '2K'];
      if (
        options.resolution &&
        String(options.resolution).toLowerCase() !== 'auto'
      ) {
        const matched = supported.find(
          (r) => r.toLowerCase() === String(options.resolution).toLowerCase()
        );
        options.resolution = matched || selectedModel.defaultResolution || '1K';
      } else {
        options.resolution = selectedModel.defaultResolution || '1K';
      }

      const supportedAspects = getModelSupportedAspectRatios(model);
      const isFluxModel = model === 'flux-2';
      const rawAspect = options.aspect_ratio
        ? String(options.aspect_ratio)
        : '';
      if (!rawAspect) {
        delete options.aspect_ratio;
      } else if (rawAspect.toLowerCase() === 'auto') {
        if (isFluxModel && normalizedImageUrls.length > 0) {
          options.aspect_ratio = 'auto';
        } else if (isFluxModel) {
          options.aspect_ratio = '1:1';
        } else {
          delete options.aspect_ratio;
        }
      } else {
        const matchedAspect = supportedAspects
          .filter((ratio) => ratio.toLowerCase() !== 'auto')
          .find((ratio) => ratio.toLowerCase() === rawAspect.toLowerCase());
        if (matchedAspect) {
          options.aspect_ratio = matchedAspect;
        } else {
          delete options.aspect_ratio;
        }
      }

      if (
        normalizedImageUrls.length > 0 &&
        selectedModel.supportsImageToImage !== true
      ) {
        return respErr(
          'The selected model does not support image input. Please select another supported model.'
        );
      }

      if (normalizedImageUrls.length > getImageModelMaxImages(model)) {
        return respErr('Too many input images for this model');
      }

      if (normalizedImageUrls.length > 0) {
        options.image_urls = normalizedImageUrls;
        options.image_url = normalizedImageUrls[0];
        options.image_input = normalizedImageUrls;
      }
    }

    const configs = await getAllConfigs();
    const providerName = pickAiProvider(configs);
    const provider = await getActiveAIProvider();
    if (!provider && !isMock) {
      return respErr('No AI Provider configured');
    }

    const costCredits = isVideo
      ? getVideoModelCredits(
          model,
          String(options.duration || ''),
          String(options.resolution || '')
        )
      : getImageModelCredits(model, String(options.resolution || ''));

    const taskScene =
      effectiveMode ||
      (isVideo
        ? normalizedImageUrls.length > 0
          ? 'image-to-video'
          : 'text-to-video'
        : 'ai_image');
    const creditScene = isVideo ? 'ai_video' : 'ai_image';
    const initialProvider = isMock ? 'mock' : provider?.name || providerName;

    dbTaskId = getUuid();
    let reserved = false;
    for (
      let activeSlot = 0;
      activeSlot < MAX_ACTIVE_TASKS_PER_USER;
      activeSlot++
    ) {
      try {
        await db()
          .insert(aiTask)
          .values({
            id: dbTaskId,
            userId: session.user.id,
            mediaType,
            provider: initialProvider,
            model: model || 'default',
            prompt: prompt || (isVideo ? 'Image to video' : 'Image to image'),
            options: JSON.stringify(options),
            status: 'pending',
            activeSlot,
            costCredits,
            scene: taskScene,
          });
        reserved = true;
        break;
      } catch (error) {
        if (!isActiveSlotConflict(error)) throw error;
      }
    }

    if (!reserved) {
      await reclaimUserGhostSlots(session.user.id);
      for (
        let activeSlot = 0;
        activeSlot < MAX_ACTIVE_TASKS_PER_USER;
        activeSlot++
      ) {
        try {
          await db()
            .insert(aiTask)
            .values({
              id: dbTaskId,
              userId: session.user.id,
              mediaType,
              provider: initialProvider,
              model: model || 'default',
              prompt: prompt || (isVideo ? 'Image to video' : 'Image to image'),
              options: JSON.stringify(options),
              status: 'pending',
              activeSlot,
              costCredits,
              scene: taskScene,
            });
          reserved = true;
          break;
        } catch (error) {
          if (!isActiveSlotConflict(error)) throw error;
        }
      }
    }

    if (!reserved) {
      return respErr(
        `You already have ${MAX_ACTIVE_TASKS_PER_USER} active generation tasks. Please wait for one to finish before submitting another.`
      );
    }

    // Pre-flight failures never started a provider job — drop the reservation
    // instead of leaving empty "failed" rows that settings/creations show as
    // "generation failed".
    const releaseReservedTask = async () => {
      await db().delete(aiTask).where(eq(aiTask.id, dbTaskId!));
    };

    const balance = await getBalance(session.user.id);
    if (balance < costCredits) {
      await releaseReservedTask();
      dbTaskId = null;
      return respErr(
        `Insufficient credits (requires ${costCredits} credits, current balance: ${balance}). Please purchase credits to continue.`
      );
    }

    if (costCredits > 0) {
      try {
        const txResult = await db().transaction(async (tx: any) => {
          const res = await consume({
            userId: session.user.id,
            userEmail: session.user.email,
            credits: costCredits,
            scene: creditScene,
            description: `AI ${isVideo ? 'video' : 'image'} generation (${model || 'default'})`,
            metadata: JSON.stringify({ taskId: dbTaskId }),
            tx,
          });

          if (!res.success || !res.consumedCredit) {
            throw new Error('Failed to deduct credits');
          }

          const [linkedTask] = await tx
            .update(aiTask)
            .set({ creditId: res.consumedCredit.id })
            .where(eq(aiTask.id, dbTaskId!))
            .returning({ id: aiTask.id });

          if (!linkedTask) {
            throw new Error('Failed to link consumed credits to AI task');
          }

          return res.consumedCredit.id;
        });
        consumedCreditId = txResult;
      } catch (error: any) {
        await releaseReservedTask();
        dbTaskId = null;
        if (error?.message === 'Failed to deduct credits') {
          return respErr('Failed to deduct credits, please try again.');
        }
        throw error;
      }
    }

    try {
      const callbackUrlObj = new URL(
        '/api/ai/task',
        envConfigs.app_url && !envConfigs.app_url.includes('localhost')
          ? envConfigs.app_url
          : request.url
      );
      if (dbTaskId) {
        callbackUrlObj.searchParams.set('dbTaskId', dbTaskId);
        callbackUrlObj.searchParams.set(
          'token',
          await createAIWebhookToken(dbTaskId, envConfigs.auth_secret)
        );
      }

      let result: any;
      let winningProvider = initialProvider;

      if (isMock) {
        result = createMockGenerateResult(dbTaskId, mediaType);
      } else {
        const outcome = await generateMediaWithProviderFailover({
          configs,
          mediaType,
          modelId: String(model || ''),
          credits: costCredits,
          prompt,
          options,
          imageUrl: normalizedImageUrls[0],
          imageUrls: normalizedImageUrls,
          callbackUrl: callbackUrlObj.toString(),
        });
        result = outcome.result;
        winningProvider = outcome.provider;
      }

      const hasMedia = Boolean(extractMediaUrl(result));
      const isFinished = result.taskStatus === AITaskStatus.SUCCESS && hasMedia;
      const isFailed =
        result.taskStatus === AITaskStatus.FAILED ||
        result.taskStatus === AITaskStatus.CANCELED ||
        (result.taskStatus === AITaskStatus.SUCCESS && !hasMedia);

      if (dbTaskId) {
        try {
          if (isFailed && consumedCreditId) {
            await revoke(consumedCreditId);
            consumedCreditId = null;
          }
          await db()
            .update(aiTask)
            .set({
              provider: winningProvider,
              taskId: isFinished ? null : result.taskId || null,
              status: isFinished
                ? 'success'
                : result.taskStatus === AITaskStatus.CANCELED
                  ? 'canceled'
                  : isFailed
                    ? 'failed'
                    : 'processing',
              taskInfo: result.taskInfo
                ? JSON.stringify(result.taskInfo)
                : null,
              taskResult: JSON.stringify(result),
              activeSlot: isFinished || isFailed ? null : undefined,
              creditId: isFailed ? null : undefined,
            })
            .where(eq(aiTask.id, dbTaskId));
        } catch (dbUpdateErr) {
          console.error('Failed to update aiTask status:', dbUpdateErr);
        }
      }

      const remainingBalance = await getBalance(session.user.id);
      const publicResult = toPublicTaskResult({
        ...result,
        taskStatus: isFailed ? AITaskStatus.FAILED : result.taskStatus,
        id: dbTaskId,
        mediaType,
      });

      return respData({
        id: dbTaskId,
        dbId: dbTaskId,
        ...publicResult,
        provider: winningProvider,
        taskId:
          result.taskStatus === AITaskStatus.SUCCESS
            ? dbTaskId
            : result.taskId || dbTaskId,
        costCredits,
        remainingBalance,
      });
    } catch (generateErr: any) {
      if (consumedCreditId) {
        try {
          await revoke(consumedCreditId);
          consumedCreditId = null;
        } catch (revokeErr) {
          console.error(
            'Failed to revoke credits after AI generation error:',
            revokeErr
          );
        }
      }

      if (dbTaskId) {
        try {
          await db()
            .update(aiTask)
            .set({
              status: 'failed',
              activeSlot: null,
              creditId: consumedCreditId ? undefined : null,
              taskResult: JSON.stringify({
                error: generateErr?.message || 'Generation failed',
              }),
            })
            .where(eq(aiTask.id, dbTaskId));
        } catch (dbFailErr) {
          console.error('Failed to mark aiTask failed:', dbFailErr);
        }
      }

      throw new Error(
        getPublicTaskErrorCode(generateErr?.message || generateErr)
      );
    }
  } catch (error: any) {
    console.error('AI generation request failed:', error);
    return respErr(sanitizeUserErrorMessage(error?.message));
  }
}

export const Route = createFileRoute('/api/ai/generate')({
  server: {
    handlers: { POST },
  },
});
