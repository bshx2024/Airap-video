import {
  AITaskStatus,
  extractAudioUrl,
  extractMediaUrl,
  type AITaskResult,
} from '@/core/ai/types';
import { pickAiProvider, type AiProviderName } from '@/config/ai-models';
import {
  attachFailoverToResult,
  buildMediaProviderFailoverChain,
  isMediaProviderFailoverError,
  listConfiguredMediaProviders,
  parseFailoverTrace,
  type MediaFailoverTraceEntry,
  type MediaProviderFailoverAttempt,
} from '@/lib/provider-failover';
import { consumeProviderSlidingWindowRateLimit } from '@/lib/rate-limit';

import { generateMedia, getAIProvider } from './service';

const PROVIDER_GENERATE_LIMIT = 20;
const PROVIDER_GENERATE_WINDOW_MS = 10_000;

export type MediaGenerateFailoverParams = {
  configs: Record<string, string | undefined>;
  mediaType: 'image' | 'video' | 'music';
  modelId: string;
  credits: number;
  prompt: string;
  options?: Record<string, any>;
  imageUrl?: string;
  imageUrls?: string[];
  callbackUrl?: string;
  priorFailover?: MediaFailoverTraceEntry[];
  excludeProviders?: string[];
  applyRateLimit?: boolean;
};

export type MediaGenerateFailoverOutcome = {
  result: AITaskResult & {
    failover?: MediaFailoverTraceEntry[];
    provider?: string;
  };
  provider: AiProviderName;
  upstreamModel: string;
  failover: MediaFailoverTraceEntry[];
  accepted: boolean;
  failed: boolean;
};

function failureMessage(result: AITaskResult): string {
  const info = result.taskInfo as Record<string, unknown> | undefined;
  const nested = result.taskResult as Record<string, unknown> | undefined;
  const raw =
    info?.error ||
    info?.message ||
    nested?.error ||
    nested?.message ||
    result.taskStatus ||
    'provider generation failed';
  return String(raw);
}

function extractResultMediaUrl(
  result: AITaskResult,
  mediaType: MediaGenerateFailoverParams['mediaType']
) {
  if (mediaType === 'music') {
    return extractAudioUrl(result) || extractMediaUrl(result);
  }
  return extractMediaUrl(result);
}

/**
 * Try media providers in priority order with the same catalog model (same credits).
 * Stops on first success or accepted async task; records failover steps when switching.
 */
export async function generateMediaWithProviderFailover(
  params: MediaGenerateFailoverParams
): Promise<MediaGenerateFailoverOutcome> {
  const available = listConfiguredMediaProviders(params.configs);
  const primary = pickAiProvider(params.configs);
  const prior = parseFailoverTrace(params.priorFailover);
  const exclude = [
    ...(params.excludeProviders || []),
    ...prior.map((p) => p.provider),
  ];
  const chain = buildMediaProviderFailoverChain({
    modelId: params.modelId,
    mediaType: params.mediaType,
    primaryProvider: primary,
    availableProviders: available,
    credits: params.credits,
    excludeProviders: exclude,
  });

  if (chain.length === 0) {
    throw new Error('No AI Provider configured');
  }

  const failover: MediaFailoverTraceEntry[] = [...prior];
  let lastError = '';
  const logTag = params.mediaType;

  for (let i = 0; i < chain.length; i++) {
    const attempt = chain[i]!;
    const step = failover.length + 1;
    const providerInstance = await getAIProvider(attempt.provider);
    if (!providerInstance) {
      lastError = `Provider ${attempt.provider} not available`;
      failover.push({
        step,
        provider: attempt.provider,
        modelKey: attempt.modelKey,
        concreteModel: attempt.upstreamModel,
        credits: attempt.credits,
        status: 'failed',
        error: lastError,
      });
      continue;
    }

    if (params.applyRateLimit !== false) {
      try {
        const rateLimit = await consumeProviderSlidingWindowRateLimit({
          key: `ai-provider-generate:${attempt.provider}`,
          limit: PROVIDER_GENERATE_LIMIT,
          windowMs: PROVIDER_GENERATE_WINDOW_MS,
        });
        if (!rateLimit.allowed) {
          lastError =
            'The AI generation service is busy. Please try again shortly.';
          failover.push({
            step,
            provider: attempt.provider,
            modelKey: attempt.modelKey,
            concreteModel: attempt.upstreamModel,
            credits: attempt.credits,
            status: 'failed',
            error: lastError,
          });
          continue;
        }
      } catch (rateErr: any) {
        lastError = String(rateErr?.message || rateErr);
        if (!isMediaProviderFailoverError(rateErr) || i === chain.length - 1) {
          throw rateErr;
        }
        failover.push({
          step,
          provider: attempt.provider,
          modelKey: attempt.modelKey,
          concreteModel: attempt.upstreamModel,
          credits: attempt.credits,
          status: 'failed',
          error: lastError,
        });
        continue;
      }
    }

    if (i > 0 || prior.length > 0) {
      console.warn(
        `[${logTag}] failover → ${attempt.provider}:${attempt.modelKey} (${lastError || 'previous attempt failed'})`
      );
    }

    try {
      const result = await generateMedia(
        {
          mediaType: params.mediaType,
          prompt: params.prompt,
          model: attempt.upstreamModel,
          options: params.options,
          imageUrl: params.imageUrl,
          imageUrls: params.imageUrls,
          callbackUrl: params.callbackUrl,
        },
        providerInstance
      );

      const mediaUrl = extractResultMediaUrl(result, params.mediaType);
      const hasMedia = Boolean(mediaUrl);
      const isFinished = result.taskStatus === AITaskStatus.SUCCESS && hasMedia;
      const isFailed =
        result.taskStatus === AITaskStatus.FAILED ||
        result.taskStatus === AITaskStatus.CANCELED ||
        (result.taskStatus === AITaskStatus.SUCCESS && !hasMedia);

      if (isFailed) {
        lastError = failureMessage(result);
        failover.push({
          step,
          provider: attempt.provider,
          modelKey: attempt.modelKey,
          concreteModel: attempt.upstreamModel,
          credits: attempt.credits,
          status: 'failed',
          error: lastError,
        });
        continue;
      }

      const status: MediaFailoverTraceEntry['status'] = isFinished
        ? 'success'
        : 'accepted';
      const nextTrace =
        failover.length > 0 || i > 0 || prior.length > 0
          ? [
              ...failover,
              {
                step,
                provider: attempt.provider,
                modelKey: attempt.modelKey,
                concreteModel: attempt.upstreamModel,
                credits: attempt.credits,
                status,
              },
            ]
          : [];

      const wrapped = attachFailoverToResult(
        { ...result } as Record<string, unknown>,
        nextTrace,
        attempt.provider
      ) as unknown as AITaskResult & {
        failover?: MediaFailoverTraceEntry[];
        provider?: string;
      };

      return {
        result: wrapped,
        provider: attempt.provider,
        upstreamModel: attempt.upstreamModel,
        failover: nextTrace,
        accepted: true,
        failed: false,
      };
    } catch (err: any) {
      lastError = String(err?.message || err);
      const canContinue =
        isMediaProviderFailoverError(err) && i < chain.length - 1;
      failover.push({
        step,
        provider: attempt.provider,
        modelKey: attempt.modelKey,
        concreteModel: attempt.upstreamModel,
        credits: attempt.credits,
        status: 'failed',
        error: lastError,
      });
      if (!canContinue) {
        const wrapped = attachFailoverToResult(
          {
            taskStatus: AITaskStatus.FAILED,
            taskId: '',
            taskResult: { error: lastError },
          } as Record<string, unknown>,
          failover,
          attempt.provider
        ) as unknown as AITaskResult & {
          failover?: MediaFailoverTraceEntry[];
          provider?: string;
        };
        return {
          result: wrapped,
          provider: attempt.provider,
          upstreamModel: attempt.upstreamModel,
          failover,
          accepted: false,
          failed: true,
        };
      }
    }
  }

  const last = chain[chain.length - 1] as MediaProviderFailoverAttempt;
  const wrapped = attachFailoverToResult(
    {
      taskStatus: AITaskStatus.FAILED,
      taskId: '',
      taskResult: {
        error: lastError || `All ${params.mediaType} providers failed`,
      },
    } as Record<string, unknown>,
    failover,
    last.provider
  ) as unknown as AITaskResult & {
    failover?: MediaFailoverTraceEntry[];
    provider?: string;
  };

  return {
    result: wrapped,
    provider: last.provider,
    upstreamModel: last.upstreamModel,
    failover,
    accepted: false,
    failed: true,
  };
}
