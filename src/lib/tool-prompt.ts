/**
 * Smart tool-prompt enrichment.
 *
 * Tool pages expose a free-text prompt. If the user never mentions the tool's
 * functional intent (e.g. "remove background"), we append a locale-aware
 * ensure phrase so image-to-image still performs the page's job — similar to
 * how edit-focused products inject task instructions when the brief is thin.
 */

import { getModelResolutionOptions } from '@/config/ai-models';
import type { ToolPageConfig } from '@/config/tools';

export type ToolPromptContext = {
  slug: string;
  prompt: string;
  optionValue?: string;
};

const INTENT_KEYWORDS: Record<string, string[]> = {
  'background-remover': [
    'remove background',
    'background removal',
    'cut out',
    'cutout',
    'transparent',
    'no background',
    'isolate',
    '抠图',
    '去背景',
    '移除背景',
    '去掉背景',
    '透明',
    '抠出',
    '清除背景',
    '彻底移除背景',
  ],
  'image-upscaler': [
    'upscale',
    'enlarge',
    'higher resolution',
    '2x',
    '4x',
    '2×',
    '4×',
    '放大',
    '超分',
    '提高分辨率',
    '变清晰',
    '增强细节',
  ],
  'image-expand': [
    'expand',
    'outpaint',
    'extend',
    'wider',
    'outpainting',
    'aspect ratio',
    '扩图',
    '扩展',
    '延展',
    '向外',
    '画幅',
    '比例',
  ],
  'transform-style': [
    'style',
    'illustration',
    'watercolor',
    'watercolour',
    'anime',
    '3d',
    'render',
    'restyle',
    '风格',
    '插画',
    '水彩',
    '动漫',
    '转换',
    '变成',
  ],
};

/** Locale-agnostic fallbacks when i18n lookup fails. */
const ENSURE_FALLBACKS: Record<string, string> = {
  'background-remover':
    'Thoroughly remove the background and return a clean transparent PNG. Preserve the subject, fine edges, colours, and full silhouette.',
  'image-upscaler.2':
    'Upscale this image 2×. Rebuild sharp detail and clean edges without soft blur; preserve the original subject, colours, and composition.',
  'image-upscaler.4':
    'Upscale this image 4×. Rebuild sharp detail and clean edges without soft blur; preserve the original subject, colours, and composition.',
  'image-expand':
    'Expand the canvas to {ratio} aspect ratio. Continue the scene beyond the original frame with matching lighting, perspective, and background. Do not crop or stretch the subject.',
  'transform-style.illustration':
    'Transform into a polished editorial illustration style while preserving the subject, identity, pose, and composition.',
  'transform-style.watercolor':
    'Transform into a soft watercolor painting style while preserving the subject, identity, pose, and composition.',
  'transform-style.anime':
    'Transform into a clean anime illustration style while preserving the subject, identity, pose, and composition.',
  'transform-style.3d':
    'Transform into a polished miniature 3D render style while preserving the subject, identity, pose, and composition.',
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function promptHasToolIntent(slug: string, prompt: string): boolean {
  const keywords = INTENT_KEYWORDS[slug];
  if (!keywords?.length) return true;
  const haystack = normalize(prompt);
  if (!haystack) return false;
  return keywords.some((keyword) => haystack.includes(normalize(keyword)));
}

/** Message key under landing.tools.prompt_ensure.* for the ensure phrase. */
export function getToolEnsureMessageKey(
  slug: string,
  optionValue?: string
): string {
  if (slug === 'image-upscaler') {
    const scale = optionValue === '2' ? '2' : '4';
    return `landing.tools.prompt_ensure.image-upscaler.${scale}`;
  }
  if (slug === 'transform-style') {
    const style = optionValue || 'illustration';
    return `landing.tools.prompt_ensure.transform-style.${style}`;
  }
  if (slug === 'image-expand') {
    return 'landing.tools.prompt_ensure.image-expand';
  }
  return `landing.tools.prompt_ensure.${slug}`;
}

export function getToolEnsureFallback(
  slug: string,
  optionValue?: string
): string {
  if (slug === 'image-upscaler') {
    const scale = optionValue === '2' ? '2' : '4';
    return ENSURE_FALLBACKS[`image-upscaler.${scale}`] || '';
  }
  if (slug === 'transform-style') {
    const style = optionValue || 'illustration';
    return ENSURE_FALLBACKS[`transform-style.${style}`] || '';
  }
  if (slug === 'image-expand') {
    return (ENSURE_FALLBACKS['image-expand'] || '').replace(
      /\{ratio\}/g,
      optionValue || '16:9'
    );
  }
  return ENSURE_FALLBACKS[slug] || '';
}

function promptHasSelectedScale(prompt: string, scale: string): boolean {
  const hay = normalize(prompt);
  return (
    hay.includes(normalize(`${scale}×`)) ||
    hay.includes(normalize(`${scale}x`)) ||
    hay.includes(`${scale} 倍`) ||
    hay.includes(`${scale}倍`)
  );
}

/**
 * Returns the prompt sent to the model. User text stays first; ensure phrase
 * is appended only when intent keywords are missing.
 */
export function enrichToolPrompt(
  ctx: ToolPromptContext,
  ensurePhrase: string
): string {
  const trimmed = ctx.prompt.trim();
  const phrase = ensurePhrase.trim();
  if (!phrase) return trimmed;

  if (promptHasToolIntent(ctx.slug, trimmed)) {
    // Still inject scale / target ratio / style when option-driven and absent.
    if (ctx.slug === 'image-upscaler' && ctx.optionValue) {
      if (!promptHasSelectedScale(trimmed, ctx.optionValue)) {
        return trimmed ? `${trimmed}\n\n${phrase}` : phrase;
      }
    }
    if (ctx.slug === 'image-expand' && ctx.optionValue) {
      if (!trimmed.includes(ctx.optionValue)) {
        return trimmed ? `${trimmed}\n\n${phrase}` : phrase;
      }
    }
    if (ctx.slug === 'transform-style' && ctx.optionValue) {
      const styleHints: Record<string, string[]> = {
        illustration: ['illustration', 'editorial', '插画'],
        watercolor: ['watercolor', 'watercolour', '水彩'],
        anime: ['anime', '动漫', '二次元'],
        '3d': ['3d', 'diorama', 'render', '微缩', '三维'],
      };
      const hints = styleHints[ctx.optionValue] || [ctx.optionValue];
      const hay = normalize(trimmed);
      if (!hints.some((hint) => hay.includes(normalize(hint)))) {
        return trimmed ? `${trimmed}\n\n${phrase}` : phrase;
      }
    }
    return trimmed || phrase;
  }

  return trimmed ? `${trimmed}\n\n${phrase}` : phrase;
}

/** Map upscaler 2×/4× to a model resolution the provider actually accepts. */
export function mapUpscaleScaleToResolution(
  scale: string,
  modelId: string
): string | undefined {
  const preferred = scale === '2' ? '2k' : scale === '4' ? '4k' : undefined;
  if (!preferred) return undefined;
  const supported = getModelResolutionOptions(modelId).map(
    (item) => item.value
  );
  if (supported.includes(preferred)) return preferred;
  const fallbackOrder = ['4k', '2k', '1.5k', '1k'];
  return fallbackOrder.find((value) => supported.includes(value));
}

/**
 * Assemble tool-specific request options (scale / aspect / style / resolution).
 * Previously tools forced resolution=auto and dropped scale from the payload.
 */
export function buildToolSubmitParams({
  tool,
  optionValue,
  modelId,
}: {
  tool: Pick<ToolPageConfig, 'slug' | 'optionKind'>;
  optionValue: string;
  modelId: string;
}): {
  aspectRatio: string;
  resolution: string;
  options: Record<string, unknown>;
} {
  const options: Record<string, unknown> = {};
  let aspectRatio = 'auto';
  let resolution = 'auto';
  const value = optionValue.trim();

  if (tool.optionKind === 'scale' && value) {
    options.scale = value;
    const mapped = mapUpscaleScaleToResolution(value, modelId);
    if (mapped) {
      resolution = mapped;
      options.resolution = mapped;
    }
  } else if (tool.optionKind === 'aspect_ratio' && value) {
    aspectRatio = value;
    options.aspect_ratio = value;
  } else if (tool.optionKind === 'style' && value) {
    options.style = value;
  }

  return { aspectRatio, resolution, options };
}
