import { normalizeAIModel } from '@/core/ai/types';
import {
  IMAGE_MODELS,
  VIDEO_MODELS,
  type AiProviderName,
} from '@/config/ai-models';

export type MediaFailoverTraceEntry = {
  step: number;
  provider: string;
  modelKey: string;
  concreteModel: string;
  credits: number;
  status: 'failed' | 'success' | 'accepted';
  error?: string;
};

export type MediaProviderFailoverAttempt = {
  provider: AiProviderName;
  modelKey: string;
  credits: number;
  upstreamModel: string;
};

/** Configured media providers in dispatch order: APIMart → KIE. */
export function listConfiguredMediaProviders(
  configs: Record<string, string | undefined>
): AiProviderName[] {
  const out: AiProviderName[] = [];
  if (configs.apimart_api_key?.trim()) out.push('apimart');
  if (configs.kie_api_key?.trim()) out.push('kie');
  return out;
}

function catalogSupportsModel(
  modelId: string,
  mediaType: 'image' | 'video' | 'music'
): boolean {
  if (mediaType === 'video') return Boolean(VIDEO_MODELS[modelId]);
  if (mediaType === 'image') return Boolean(IMAGE_MODELS[modelId]);
  return Boolean(IMAGE_MODELS[modelId] || VIDEO_MODELS[modelId]);
}

/**
 * Same catalog model (same billed credits) across configured providers.
 * Never upgrades to a higher-credit model.
 */
export function buildMediaProviderFailoverChain(params: {
  modelId: string;
  mediaType: 'image' | 'video' | 'music';
  primaryProvider: AiProviderName;
  availableProviders: AiProviderName[];
  /** Billed credits for this request (resolution/duration aware). */
  credits: number;
  /** Providers that advertise this catalog model; default = all available. */
  modelProviders?: AiProviderName[];
  excludeProviders?: string[];
}): MediaProviderFailoverAttempt[] {
  const modelId = String(params.modelId || '').trim();
  if (!modelId) return [];
  if (!catalogSupportsModel(modelId, params.mediaType)) return [];

  const available = [
    ...new Set(
      (params.availableProviders || []).filter((p): p is AiProviderName =>
        Boolean(p)
      )
    ),
  ];
  const supported = new Set(
    (params.modelProviders && params.modelProviders.length > 0
      ? params.modelProviders
      : available) as AiProviderName[]
  );
  const excluded = new Set(
    (params.excludeProviders || []).map((p) => String(p || '').trim())
  );

  const ordered: AiProviderName[] = [];
  if (available.includes(params.primaryProvider)) {
    ordered.push(params.primaryProvider);
  }
  for (const p of available) {
    if (p !== params.primaryProvider) ordered.push(p);
  }

  const upstreamModel = normalizeAIModel(
    modelId,
    params.mediaType === 'music' ? 'music' : params.mediaType
  );

  const chain: MediaProviderFailoverAttempt[] = [];
  for (const provider of ordered) {
    if (excluded.has(provider)) continue;
    if (!supported.has(provider)) continue;
    chain.push({
      provider,
      modelKey: modelId,
      credits: params.credits,
      upstreamModel,
    });
  }
  return chain;
}

export function parseFailoverTrace(value: unknown): MediaFailoverTraceEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is MediaFailoverTraceEntry =>
      !!item &&
      typeof item === 'object' &&
      typeof (item as MediaFailoverTraceEntry).step === 'number' &&
      typeof (item as MediaFailoverTraceEntry).provider === 'string'
  );
}

/** Provider-side failures that may move to the next same-credit provider. */
export function isMediaProviderFailoverError(error: unknown): boolean {
  const msg = String(
    (error as { message?: unknown })?.message || error || ''
  ).toLowerCase();
  if (!msg.trim()) return true;
  if (
    msg.includes('unauthorized') ||
    msg.includes('invalid generation') ||
    msg.includes('prompt is too long') ||
    msg.includes('unsupported model') ||
    msg.includes('invalid image url') ||
    msg.includes('does not support image input') ||
    msg.includes('too many input images') ||
    msg.includes('no ai provider configured')
  ) {
    return false;
  }
  return true;
}

export function attachFailoverToResult<T extends Record<string, unknown>>(
  result: T,
  failover: MediaFailoverTraceEntry[],
  provider: string
): T & { failover?: MediaFailoverTraceEntry[]; provider: string } {
  if (failover.length === 0) {
    return { ...result, provider };
  }
  return { ...result, provider, failover };
}
