/**
 * Image model catalog for APIMart / KIE.
 *
 * Credit costs use max(APIMart, KIE) vendor USD cost and a floor sell price of
 * ~$0.005/credit (plans keep ≥ that). Target ≥2× cost coverage so KIE routing
 * still profits. Typical 1K / 1–2MP reference costs (USD / image):
 * - gpt-image-2: APIMart ~$0.0085 · KIE $0.03 / $0.05 / $0.08 (1K/2K/4K)
 * - nano-banana-2: APIMart ~$0.0125 · KIE $0.04 / $0.06 / $0.09
 * - nano-banana-pro: KIE $0.09 (1–2K) / $0.12 (4K)
 * - qwen-image-3.0: ~$0.021–0.025
 * - flux-2: APIMart ~$0.036 (2MP) · KIE ~$0.025
 * - seedream-5.0-pro: APIMart $0.045 (1K) / $0.09 (2K)
 */

export type ImageModelConfig = {
  id: string;
  name: string;
  icon: string;
  credits: number;
  supportsImageToImage?: boolean;
  maxImages?: number;
  supportedResolutions?: string[];
  defaultResolution?: string;
  /** Aspect ratios shown in the generator UI (`auto` allowed). */
  supportedAspectRatios?: string[];
};

/** Full generator aspect catalog (model configs allowlist from this set). */
export const DEFAULT_ASPECT_RATIOS = [
  'auto',
  '1:1',
  '4:3',
  '3:4',
  '16:9',
  '9:16',
  '3:2',
  '2:3',
  '21:9',
  '9:21',
] as const;

/**
 * FLUX.2 product intersection of APIMart `size` and KIE flex `aspect_ratio`.
 * KIE flex has no 21:9 / 9:21; i2i supports `auto`, t2i uses fixed ratios.
 */
const FLUX_ASPECT_RATIOS = [
  'auto',
  '1:1',
  '4:3',
  '3:4',
  '16:9',
  '9:16',
  '3:2',
  '2:3',
] as const;

const STANDARD_ASPECT_RATIOS = [...DEFAULT_ASPECT_RATIOS];

export const IMAGE_MODELS: Record<string, ImageModelConfig> = {
  'gpt-image-2': {
    id: 'gpt-image-2',
    name: 'GPT Image 2',
    icon: '/imgs/models/icons/gpt-image.webp',
    credits: 12,
    supportsImageToImage: true,
    // APIMart 15 / KIE 16; product cap 8 (UI upload strip)
    maxImages: 8,
    supportedResolutions: ['1K', '2K', '4K'],
    defaultResolution: '1K',
    supportedAspectRatios: STANDARD_ASPECT_RATIOS,
  },
  'gpt-image-2-5-flare': {
    id: 'gpt-image-2-5-flare',
    name: 'GPT Image 2.5 Flare',
    icon: '/imgs/models/icons/gpt-image.webp',
    credits: 16,
    supportsImageToImage: true,
    // vendors 16; product cap 8
    maxImages: 8,
    supportedResolutions: ['1K', '2K', '4K'],
    defaultResolution: '1K',
    supportedAspectRatios: STANDARD_ASPECT_RATIOS,
  },
  'gpt-image-2-5-sunburst': {
    id: 'gpt-image-2-5-sunburst',
    name: 'GPT Image 2.5 Sunburst',
    icon: '/imgs/models/icons/gpt-image.webp',
    credits: 16,
    supportsImageToImage: true,
    // vendors 16; product cap 8
    maxImages: 8,
    supportedResolutions: ['1K', '2K', '4K'],
    defaultResolution: '1K',
    supportedAspectRatios: STANDARD_ASPECT_RATIOS,
  },
  'nano-banana-2': {
    id: 'nano-banana-2',
    name: 'Nano Banana 2',
    icon: '/imgs/models/icons/nano-banana.webp',
    credits: 16,
    supportsImageToImage: true,
    // vendors 14; product UI cap 8
    maxImages: 8,
    supportedResolutions: ['1K', '2K', '4K'],
    defaultResolution: '1K',
    supportedAspectRatios: STANDARD_ASPECT_RATIOS,
  },
  'qwen-image-3-0': {
    id: 'qwen-image-3-0',
    name: 'Qwen Image 3.0',
    icon: '/imgs/models/icons/qwen.svg',
    credits: 12,
    supportsImageToImage: true,
    // APIMart 1–3 / KIE 3
    maxImages: 3,
    supportedResolutions: ['1K', '2K'],
    defaultResolution: '1K',
    supportedAspectRatios: STANDARD_ASPECT_RATIOS,
  },
  'flux-2': {
    id: 'flux-2',
    name: 'FLUX.2',
    icon: '/imgs/models/icons/flux.svg',
    credits: 16,
    supportsImageToImage: true,
    // APIMart 8 / KIE flex 8
    maxImages: 8,
    // KIE flex: 1K/2K only; APIMart maps 1K→2MP, 2K→3MP (also has 1MP–4MP).
    supportedResolutions: ['1K', '2K'],
    defaultResolution: '1K',
    supportedAspectRatios: [...FLUX_ASPECT_RATIOS],
  },
  'nano-banana-pro': {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    icon: '/imgs/models/icons/nano-banana.webp',
    credits: 36,
    supportsImageToImage: true,
    // APIMart 14 / KIE edit 10 → dual intersection 8
    maxImages: 8,
    supportedResolutions: ['1K', '2K', '4K'],
    defaultResolution: '1K',
    supportedAspectRatios: STANDARD_ASPECT_RATIOS,
  },
  'seedream-5-0-pro': {
    id: 'seedream-5-0-pro',
    name: 'Seedream 5.0 Pro',
    icon: '/imgs/models/icons/bytedance.webp',
    credits: 20,
    supportsImageToImage: true,
    // vendors 10; product UI cap 8
    maxImages: 8,
    supportedResolutions: ['1K', '1.5K', '2K'],
    defaultResolution: '1K',
    supportedAspectRatios: STANDARD_ASPECT_RATIOS,
  },
};

const GENERATOR_MODEL_IDS = [
  'gpt-image-2',
  'gpt-image-2-5-flare',
  'gpt-image-2-5-sunburst',
  'nano-banana-2',
  'qwen-image-3-0',
  'flux-2',
  'nano-banana-pro',
  'seedream-5-0-pro',
] as const;

function sortByCredits(models: ImageModelConfig[]): ImageModelConfig[] {
  return [...models].sort(
    (a, b) => a.credits - b.credits || a.name.localeCompare(b.name)
  );
}

/** Homepage / generator models supported by both APIMart and KIE. */
export const GENERATOR_IMAGE_MODELS: ImageModelConfig[] = sortByCredits(
  GENERATOR_MODEL_IDS.map((id) => IMAGE_MODELS[id])
);

export function getGeneratorModels(
  mode: 'text' | 'image' = 'text'
): ImageModelConfig[] {
  if (mode === 'image') {
    return sortByCredits(
      GENERATOR_IMAGE_MODELS.filter((model) => model.supportsImageToImage)
    );
  }
  return GENERATOR_IMAGE_MODELS;
}

export function getImageModelMaxImages(modelId?: string): number {
  if (modelId && IMAGE_MODELS[modelId]?.maxImages !== undefined) {
    return IMAGE_MODELS[modelId].maxImages!;
  }
  return 3;
}

export function getImageModelCredits(
  modelId: string,
  resolution?: string
): number {
  const r = String(resolution || '').toUpperCase();
  const base = IMAGE_MODELS[modelId]?.credits ?? IMAGE_MODELS['flux-2'].credits;

  if (modelId === 'gpt-image-2') {
    if (r === '2K') return 20;
    if (r === '4K') return 32;
    return 12;
  }
  if (
    modelId === 'gpt-image-2-5-flare' ||
    modelId === 'gpt-image-2-5-sunburst'
  ) {
    if (r === '1K') return 16;
    if (r === '4K') return 36;
    return 24;
  }
  if (modelId === 'nano-banana-2') {
    if (r === '2K') return 24;
    if (r === '4K') return 36;
    return 16;
  }
  if (modelId === 'nano-banana-pro') {
    if (r === '4K') return 48;
    return 36;
  }
  if (modelId === 'qwen-image-3-0') {
    if (r === '2K') return 16;
    return 12;
  }
  if (modelId === 'flux-2') {
    if (r === '2K') return 24;
    return 16;
  }
  if (modelId === 'seedream-5-0-pro') {
    if (r === '2K') return 36;
    return 20;
  }
  return base;
}

export function getImageModelById(
  modelId?: string | null
): ImageModelConfig | undefined {
  if (!modelId) return undefined;
  return IMAGE_MODELS[modelId];
}

/** Resolutions for UI (`auto` first). Values keep catalog casing (1K / 1.5K). */
export function getModelSupportedResolutions(
  modelId?: string | null
): string[] {
  const model = getImageModelById(modelId);
  const list = model?.supportedResolutions || ['1K', '2K'];
  return ['auto', ...list];
}

/** UI resolution option values (`auto` / lowercase catalog values). */
export function getModelResolutionOptions(
  modelId?: string | null
): { value: string }[] {
  return getModelSupportedResolutions(modelId).map((value) => ({
    value: value === 'auto' ? 'auto' : value.toLowerCase(),
  }));
}

/** Aspect ratios for UI (`auto` first). */
export function getModelSupportedAspectRatios(
  modelId?: string | null
): string[] {
  const model = getImageModelById(modelId);
  const list = model?.supportedAspectRatios || [...DEFAULT_ASPECT_RATIOS];
  return list[0] === 'auto' ? [...list] : ['auto', ...list];
}

/** GPT 黑白图标在暗色背景上需反色才看得清 */
export function needsModelIconInvert(icon?: string): boolean {
  return Boolean(icon?.includes('gpt-image'));
}

// ─── Video models (APIMart / KIE) ───────────────────────────────────────────
//
// Credit economy matches shipany-pixany-agent (`creditsPerSecond` + resolution
// multipliers, rounded up to 10). Agent only catalogs MiniMax H3 / Seedance 2.5;
// other models keep template-pixany relative costs, scaled onto those two anchors
// (minimax family × 550/30, seedance family × 1000/90) because video-lite /
// pixany-agent packs grant fewer credits per dollar than template-pixany.

export type VideoModelConfig = {
  id: string;
  name: string;
  icon: string;
  /** Credits charged for defaultDuration @ defaultResolution (display / fallback). */
  credits: number;
  /** Agent-style rate used by getVideoModelCredits. */
  creditsPerSecond: number;
  resolutionCreditMultipliers?: Record<string, number>;
  maxImages?: number;
  supportsFirstLastFrame?: boolean;
  supportsReferenceToVideo?: boolean;
  supportedResolutions?: string[];
  /** Discrete labels kept for presets / legacy; prefer durationMin/Max for slider. */
  supportedDurations?: string[];
  durationMin?: number;
  durationMax?: number;
  aspectRatios?: string[];
  defaultAspectRatio?: string;
  defaultResolution?: string;
  defaultDuration?: string;
};

const DEFAULT_VIDEO_ASPECT_RATIOS = [
  'adaptive',
  '21:9',
  '16:9',
  '4:3',
  '1:1',
  '3:4',
  '9:16',
] as const;

/** Default multipliers aligned with template-pixany VIDEO_RES_STD / agent. */
const VIDEO_RES_MULTIPLIERS_STD: Record<string, number> = {
  '480p': 0.5,
  '480P': 0.5,
  '720p': 1,
  '720P': 1,
  '768p': 1,
  '768P': 1,
  '1080p': 2,
  '1080P': 2,
  '2K': 1.7,
  '4K': 3.5,
  '4k': 3.5,
};

/** Pixany-agent catalog multipliers for the two anchor models. */
const MINIMAX_H3_RES_MULTIPLIERS: Record<string, number> = {
  '768P': 0.75,
  '768p': 0.75,
  '2K': 1,
  '4K': 1.5,
  '4k': 1.5,
};

const SEEDANCE_25_RES_MULTIPLIERS: Record<string, number> = {
  '480p': 0.75,
  '480P': 0.75,
  '720p': 1,
  '720P': 1,
  '1080p': 2,
  '1080P': 2,
};

function videoCreditsAt(
  creditsPerSecond: number,
  durationSeconds: number,
  multiplier: number
): number {
  return Math.ceil((creditsPerSecond * durationSeconds * multiplier) / 10) * 10;
}

export const VIDEO_MODELS: Record<string, VideoModelConfig> = {
  'wan-3-0': {
    id: 'wan-3-0',
    name: 'Wan 2.6 Flash (Fast Rap)',
    icon: '/imgs/models/icons/wan-80.webp',
    // Kie cost ~$0.10/5s @ 720p. 100 credits = $0.55 revenue (>81% margin).
    credits: 100,
    creditsPerSecond: 20,
    resolutionCreditMultipliers: {
      '720p': 1,
      '720P': 1,
      '1080p': 1.5,
      '1080P': 1.5,
    },
    supportsFirstLastFrame: true,
    maxImages: 2,
    supportedDurations: ['5s'],
    durationMin: 5,
    durationMax: 5,
    supportedResolutions: ['720P', '1080P'],
    aspectRatios: [...DEFAULT_VIDEO_ASPECT_RATIOS],
    defaultAspectRatio: 'adaptive',
    defaultResolution: '720P',
    defaultDuration: '5s',
  },
  'kling-3-0-turbo': {
    id: 'kling-3-0-turbo',
    name: 'Kling 4.0 Studio (Cinema Grade)',
    icon: '/imgs/models/icons/kling.svg',
    // Kie cost $0.085/s ($0.425/5s 720p). 250 credits = $1.375 revenue (>69% margin).
    // 1080p: $0.1275/s ($0.6375/5s). 380 credits = $2.09 revenue (>69% margin).
    credits: 250,
    creditsPerSecond: 50,
    resolutionCreditMultipliers: {
      '720p': 1,
      '720P': 1,
      '1080p': 1.52,
      '1080P': 1.52,
    },
    maxImages: 1,
    supportedDurations: ['5s', '10s'],
    durationMin: 5,
    durationMax: 10,
    supportedResolutions: ['720P', '1080P'],
    aspectRatios: [...DEFAULT_VIDEO_ASPECT_RATIOS],
    defaultAspectRatio: 'adaptive',
    defaultResolution: '720P',
    defaultDuration: '5s',
  },
  'seedance-2-5': {
    id: 'seedance-2-5',
    name: 'Seedance 2.5 (Choreo Dance)',
    icon: '/imgs/models/icons/bytedance.webp',
    // Kie cost $0.190-$0.475/s. 5s @ 720p = 500 credits ($2.75 revenue, ~60% margin).
    credits: 500,
    creditsPerSecond: 100,
    resolutionCreditMultipliers: {
      '480p': 0.75,
      '480P': 0.75,
      '720p': 1,
      '720P': 1,
      '1080p': 2,
      '1080P': 2,
    },
    supportsFirstLastFrame: true,
    supportsReferenceToVideo: true,
    maxImages: 2,
    supportedDurations: ['5s', '10s'],
    durationMin: 4,
    durationMax: 30,
    supportedResolutions: ['480P', '720P', '1080P'],
    aspectRatios: ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    defaultAspectRatio: 'auto',
    defaultResolution: '720P',
    defaultDuration: '5s',
  },
  'minimax-h3': {
    id: 'minimax-h3',
    name: 'MiniMax H3',
    icon: '/imgs/models/icons/hailuo.svg',
    credits: 250,
    creditsPerSecond: 50,
    resolutionCreditMultipliers: MINIMAX_H3_RES_MULTIPLIERS,
    supportsFirstLastFrame: true,
    supportsReferenceToVideo: true,
    maxImages: 2,
    supportedDurations: ['5s', '10s', '15s'],
    durationMin: 5,
    durationMax: 15,
    supportedResolutions: ['768P', '2K', '4K'],
    aspectRatios: [...DEFAULT_VIDEO_ASPECT_RATIOS],
    defaultAspectRatio: 'adaptive',
    defaultResolution: '768P',
    defaultDuration: '5s',
  },
  'minimax-hailuo-2-3': {
    id: 'minimax-hailuo-2-3',
    name: 'Hailuo 2.3',
    icon: '/imgs/models/icons/hailuo.svg',
    // same cps family as MiniMax H3; default 6s → 660
    credits: 660,
    creditsPerSecond: 110,
    resolutionCreditMultipliers: VIDEO_RES_MULTIPLIERS_STD,
    maxImages: 1,
    supportedDurations: ['6s'],
    durationMin: 6,
    durationMax: 10,
    supportedResolutions: ['720P', '1080P'],
    aspectRatios: [...DEFAULT_VIDEO_ASPECT_RATIOS],
    defaultAspectRatio: 'adaptive',
    defaultResolution: '720P',
    defaultDuration: '6s',
  },
  'wan-2-7': {
    id: 'wan-2-7',
    name: 'Wan 2.7',
    icon: '/imgs/models/icons/wan-80.webp',
    // template base 21 @5s → ×(550/30) ≈ 385 → 77/s
    credits: 390,
    creditsPerSecond: 77,
    resolutionCreditMultipliers: VIDEO_RES_MULTIPLIERS_STD,
    supportsFirstLastFrame: true,
    maxImages: 2,
    supportedDurations: ['5s'],
    durationMin: 5,
    durationMax: 5,
    supportedResolutions: ['720P', '1080P'],
    aspectRatios: [...DEFAULT_VIDEO_ASPECT_RATIOS],
    defaultAspectRatio: 'adaptive',
    defaultResolution: '720P',
    defaultDuration: '5s',
  },
  'doubao-seedance-2-0': {
    id: 'doubao-seedance-2-0',
    name: 'Seedance 2.0',
    icon: '/imgs/models/icons/bytedance.webp',
    // template base 85 @5s → ×(1000/90) ≈ 944 → use 188/s → 940
    credits: 940,
    creditsPerSecond: 188,
    resolutionCreditMultipliers: SEEDANCE_25_RES_MULTIPLIERS,
    supportsFirstLastFrame: true,
    maxImages: 2,
    supportedDurations: ['5s', '10s'],
    durationMin: 5,
    durationMax: 10,
    supportedResolutions: ['480P', '720P', '1080P'],
    aspectRatios: ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    defaultAspectRatio: 'auto',
    defaultResolution: '720P',
    defaultDuration: '5s',
  },
};

const GENERATOR_VIDEO_MODEL_IDS = [
  'wan-3-0',
  'kling-3-0-turbo',
  'seedance-2-5',
  'minimax-h3',
  'minimax-hailuo-2-3',
  'wan-2-7',
  'doubao-seedance-2-0',
] as const;

export const GENERATOR_VIDEO_MODELS: VideoModelConfig[] =
  GENERATOR_VIDEO_MODEL_IDS.map((id) => VIDEO_MODELS[id]);

export function getVideoModelsList(): VideoModelConfig[] {
  return GENERATOR_VIDEO_MODELS;
}

export function getVideoModelById(
  modelId?: string | null
): VideoModelConfig | undefined {
  if (!modelId) return undefined;
  return VIDEO_MODELS[modelId];
}

export function getVideoModelCredits(
  modelId: string,
  duration?: string | number,
  resolution?: string
): number {
  const model = VIDEO_MODELS[modelId];
  if (!model) return 550;

  const rawDuration =
    typeof duration === 'number'
      ? duration
      : parseInt(String(duration || model.defaultDuration || '5'), 10);
  const durationSeconds =
    Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 5;

  const resKey = String(resolution || model.defaultResolution || '');
  const multipliers = model.resolutionCreditMultipliers || {};
  const multiplier =
    multipliers[resKey] ??
    multipliers[resKey.toUpperCase()] ??
    multipliers[resKey.toLowerCase()] ??
    1;

  return videoCreditsAt(model.creditsPerSecond, durationSeconds, multiplier);
}

export function getVideoModelMaxImages(modelId?: string): number {
  if (modelId && VIDEO_MODELS[modelId]?.maxImages !== undefined) {
    return VIDEO_MODELS[modelId].maxImages!;
  }
  return 1;
}

export function getVideoModelSupportedResolutions(
  modelId?: string | null
): string[] {
  const model = getVideoModelById(modelId);
  return model?.supportedResolutions || ['720P', '1080P'];
}

export function getVideoModelSupportedDurations(
  modelId?: string | null
): string[] {
  const model = getVideoModelById(modelId);
  return model?.supportedDurations || ['5s'];
}

export function getVideoModelDurationRange(modelId?: string | null): {
  min: number;
  max: number;
} {
  const model = getVideoModelById(modelId);
  if (
    typeof model?.durationMin === 'number' &&
    typeof model?.durationMax === 'number'
  ) {
    return { min: model.durationMin, max: model.durationMax };
  }
  const seconds = (model?.supportedDurations || ['5s'])
    .map((item) => parseInt(item, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (seconds.length === 0) return { min: 5, max: 5 };
  return { min: Math.min(...seconds), max: Math.max(...seconds) };
}

export function clampVideoDuration(
  modelId: string | null | undefined,
  seconds: number
): number {
  const { min, max } = getVideoModelDurationRange(modelId);
  if (!Number.isFinite(seconds)) return min;
  return Math.min(max, Math.max(min, Math.round(seconds)));
}

export function getVideoModelAspectRatios(modelId?: string | null): string[] {
  const model = getVideoModelById(modelId);
  return model?.aspectRatios
    ? [...model.aspectRatios]
    : [...DEFAULT_VIDEO_ASPECT_RATIOS];
}

export function getVideoModelDefaultAspectRatio(
  modelId?: string | null
): string {
  const model = getVideoModelById(modelId);
  return (
    model?.defaultAspectRatio ||
    getVideoModelAspectRatios(modelId)[0] ||
    'adaptive'
  );
}

export function isAutoVideoAspectRatio(ratio?: string | null): boolean {
  const value = String(ratio || '').toLowerCase();
  return value === 'auto' || value === 'adaptive';
}

export type AiProviderName = 'apimart' | 'kie';

/** Prefer APIMart when its key is present; otherwise KIE. */
export function pickAiProvider(
  configs: Record<string, string | undefined>
): AiProviderName {
  if (configs.apimart_api_key?.trim()) return 'apimart';
  if (configs.kie_api_key?.trim()) return 'kie';
  return 'apimart';
}
