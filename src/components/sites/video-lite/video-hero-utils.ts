import {
  getVideoModelById,
  getVideoModelsList,
  isAutoVideoAspectRatio,
} from '@/config/ai-models';
import { m } from '@/paraglide/messages.js';

export const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;
export const VIDEO_MODELS = getVideoModelsList();
/** First/last frame form mode never exceeds 2 slots (aligned with template-pixany). */
export const MAX_FIRST_LAST_FRAMES = 2;
/** Keep popovers clear of the fixed VideoHeader. */
export const HERO_MENU_COLLISION_PADDING = {
  top: 72,
  bottom: 16,
  left: 8,
  right: 8,
} as const;

export function isVideoMediaUrl(url?: string | null): boolean {
  return /\.(mp4|webm|mov|m4v)(?:$|[?#])/i.test(url || '');
}

export function resolveModelId(nameOrId?: string | null): string {
  if (!nameOrId) return VIDEO_MODELS[0]?.id || 'minimax-h3';
  if (getVideoModelById(nameOrId)) return nameOrId;
  const byName = VIDEO_MODELS.find(
    (item) => item.name.toLowerCase() === nameOrId.toLowerCase()
  );
  return byName?.id || VIDEO_MODELS[0]?.id || 'minimax-h3';
}

export function parseDurationSeconds(value?: string | number | null): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = parseInt(String(value || '5'), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}

export function parsePresetParams(params: string): {
  resolution?: string;
  duration?: number;
} {
  const parts = params.split('·').map((part) => part.trim());
  const resolution = parts.find((part) =>
    /^(480|720|768|1080)[pP]$|^[24]K$/i.test(part)
  );
  const duration = parts.find((part) => /^\d+s$/i.test(part));
  return {
    resolution: resolution
      ? /k$/i.test(resolution)
        ? resolution.toUpperCase()
        : resolution.toUpperCase().replace(/p$/, 'P')
      : undefined,
    duration: duration ? parseDurationSeconds(duration) : undefined,
  };
}

export function formatAspectLabel(aspectRatio: string): string {
  return isAutoVideoAspectRatio(aspectRatio)
    ? m['landing.hero.auto']()
    : aspectRatio;
}

export function formatParamLabel(
  resolution: string,
  durationSeconds: number,
  aspectRatio: string
): string {
  return `${resolution} · ${durationSeconds}s · ${formatAspectLabel(aspectRatio)}`;
}
