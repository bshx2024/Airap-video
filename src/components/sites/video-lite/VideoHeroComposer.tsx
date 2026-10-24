'use client';

import type { ComponentType, RefObject } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  SlidersHorizontal,
  Sparkles,
  WandSparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  clampVideoDuration,
  getVideoModelCredits,
  isAutoVideoAspectRatio,
  type VideoModelConfig,
} from '@/config/ai-models';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  formatParamLabel,
  HERO_MENU_COLLISION_PADDING,
  isVideoMediaUrl,
  VIDEO_MODELS,
} from './video-hero-utils';
import { VideoHeroRatioGlyph } from './VideoHeroRatioGlyph';

export type VideoHeroUploadSlot = 'first' | 'last' | 'reference';

type MediaAction = {
  key: 'first' | 'last' | 'library';
  label: string;
  icon: ComponentType<{ className?: string }>;
  enabled: boolean;
};

export function VideoHeroComposer({
  prompt,
  promptPlaceholder,
  onPromptChange,
  imageUrls,
  imageNames,
  onRemoveImage,
  isFirstLastFrameMode,
  isUploading,
  isGenerating,
  sessionUser,
  onRequireAuth,
  mediaActions,
  libraryMaxSelect,
  frameLimit,
  onOpenLibrary,
  onSetUploadSlot,
  uploadSlot,
  fileInputRef,
  onUploadFile,
  selectedModel,
  selectedModelId,
  onApplyModel,
  paramsMenuOpen,
  onParamsMenuOpenChange,
  resolution,
  onResolutionChange,
  supportedResolutions,
  duration,
  onDurationChange,
  durationRange,
  durationProgress,
  aspectRatio,
  onAspectRatioChange,
  aspectRatios,
  onGenerate,
  showProcessingHint,
  referenceMode = false,
  userBalance,
}: {
  prompt: string;
  promptPlaceholder: string;
  onPromptChange: (value: string) => void;
  imageUrls: string[];
  imageNames: string[];
  onRemoveImage: (index: number) => void;
  isFirstLastFrameMode: boolean;
  isUploading: boolean;
  isGenerating: boolean;
  sessionUser: unknown;
  onRequireAuth: () => void;
  mediaActions: MediaAction[];
  libraryMaxSelect: number;
  frameLimit: number;
  onOpenLibrary: () => void;
  onSetUploadSlot: (slot: VideoHeroUploadSlot) => void;
  uploadSlot: VideoHeroUploadSlot;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onUploadFile: (file: File, slot: VideoHeroUploadSlot) => void;
  selectedModel: VideoModelConfig | undefined;
  selectedModelId: string;
  onApplyModel: (modelId: string) => void;
  paramsMenuOpen: boolean;
  onParamsMenuOpenChange: (open: boolean) => void;
  resolution: string;
  onResolutionChange: (value: string) => void;
  supportedResolutions: string[];
  duration: number;
  onDurationChange: (value: number) => void;
  durationRange: { min: number; max: number };
  durationProgress: number;
  aspectRatio: string;
  onAspectRatioChange: (value: string) => void;
  aspectRatios: string[];
  onGenerate: () => void;
  showProcessingHint: boolean;
  referenceMode?: boolean;
  userBalance?: number | null;
}) {
  const currentCredits = getVideoModelCredits(
    selectedModelId,
    duration,
    resolution
  );
  const RAP_QUICK_PILLS = [
    {
      label: '🔥 Migos Orange Studio',
      prompt:
        'Two rappers in an iconic bright orange background studio with a single hanging microphone, trading aggressive roast bars, heavy 808 trap beat, rhythmic head nods, hip-hop hand gestures, 9:16 vertical TikTok style',
    },
    {
      label: '🥊 Friends Roast Battle',
      prompt:
        'Two best friends roasting each other about always being late, hilarious witty punchlines, fast flow, underground cypher, crowd hyping in background',
    },
    {
      label: '💃 Choreo & Dance Drill',
      prompt:
        'Full-body hip-hop choreography and energetic dance moves, sharp isolations and footwork to a heavy drill beat, confident facial expressions, fluid motion',
    },
    {
      label: '📜 Deep Soul (《过来人》Style)',
      prompt:
        'Historical master delivering emotional, reflective rap verses about perseverance and modern life struggles, moody cinematic lighting, slow push-in, soulful boombap',
    },
    {
      label: '💼 Workplace Grievances',
      prompt:
        'Relatable rap venting about endless Monday meetings, deadlines, and corporate jargon, witty punchlines, expressive comedic delivery, 9:16 vertical',
    },
  ];

  return (
    <div className="w-full max-w-5xl">
      <div className="pointer-events-auto relative rounded-3xl border border-white/10 bg-[#0f172acc] p-3 text-left shadow-[0_22px_70px_rgba(2,6,23,0.42)] backdrop-blur-3xl [backdrop-filter:blur(24px)] transition-colors duration-200 hover:bg-[#0f172ae6] sm:p-4">
        {/* Quick Rap Style & Topic Pills */}
        <div className="mb-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 flex items-center gap-1 text-[11px] font-semibold tracking-wider text-amber-400 uppercase">
            <Sparkles className="size-3" />
            Hot Styles:
          </span>
          {RAP_QUICK_PILLS.map((pill) => (
            <button
              key={pill.label}
              type="button"
              onClick={() => onPromptChange(pill.prompt)}
              className="shrink-0 cursor-pointer rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-white/80 transition hover:border-amber-400/50 hover:bg-white/15 hover:text-white"
            >
              {pill.label}
            </button>
          ))}
        </div>

        <textarea
          rows={5}
          maxLength={3000}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={promptPlaceholder}
          suppressHydrationWarning
          className="max-h-40 min-h-28 w-full resize-none overflow-y-auto border-0 bg-transparent pr-2 pl-1 text-base leading-6 text-white outline-none [scrollbar-color:rgba(148,163,184,0.42)_transparent] [scrollbar-gutter:stable] [scrollbar-width:thin] placeholder:text-white/45 focus:ring-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/25 [&::-webkit-scrollbar-thumb:hover]:bg-white/40 [&::-webkit-scrollbar-track]:bg-transparent"
        />

        {imageUrls.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {imageUrls.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="flex max-w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.08] p-1.5 pr-2.5"
              >
                {isVideoMediaUrl(url) ? (
                  <video
                    src={url}
                    muted
                    playsInline
                    preload="metadata"
                    className="size-9 rounded-lg object-cover"
                  />
                ) : (
                  <img
                    src={url}
                    alt={m['common.reference_frame_alt']()}
                    className="size-9 rounded-lg object-cover"
                  />
                )}
                <span className="min-w-0">
                  <span className="block max-w-36 truncate text-xs font-medium text-white/90 sm:max-w-48">
                    {imageNames[index] || `frame-${index + 1}.png`}
                  </span>
                  <span className="block text-[10px] text-white/50">
                    {isVideoMediaUrl(url) || referenceMode
                      ? m['landing.hero.upload_reference_video']()
                      : isFirstLastFrameMode
                        ? index === 0
                          ? m['landing.hero.upload_first_frame']()
                          : m['landing.hero.upload_last_frame']()
                        : m['landing.hero.upload_first_frame']()}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={m['landing.hero.remove_image']()}
                  onClick={() => onRemoveImage(index)}
                  className="ml-1 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/50 transition hover:bg-white/15 hover:text-white"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end justify-between gap-2 pt-1">
          <div className="relative shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={isUploading}
                aria-label={m['landing.hero.reference_media']()}
                className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/[0.05] text-white/80 transition outline-none hover:border-white/40 hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                side="top"
                sideOffset={8}
                collisionPadding={HERO_MENU_COLLISION_PADDING}
                className="min-w-48 p-1"
              >
                {mediaActions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem
                      key={item.key}
                      className="gap-2.5 text-xs"
                      onClick={() => {
                        if (!sessionUser) {
                          onRequireAuth();
                          return;
                        }
                        if (item.key === 'library') {
                          if (libraryMaxSelect <= 0) {
                            toast.info(
                              m['landing.hero.upload_limit_reached']({
                                max: frameLimit,
                              })
                            );
                            return;
                          }
                          onOpenLibrary();
                          return;
                        }
                        onSetUploadSlot(item.key);
                        fileInputRef.current?.click();
                      }}
                    >
                      <Icon className="size-3.5 shrink-0 opacity-80" />
                      <span>{item.label}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadFile(file, uploadSlot);
              }}
            />
          </div>

          <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-9 max-w-[132px] cursor-pointer items-center gap-1.5 rounded-xl bg-white/10 px-2.5 text-xs font-medium text-white transition outline-none hover:bg-white/20 sm:max-w-[180px] sm:px-3">
                <WandSparkles className="size-3.5 shrink-0" />
                <span className="min-w-0 truncate">
                  {selectedModel?.name || selectedModelId}
                </span>
                <ChevronDown className="size-3 shrink-0 text-white/60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="top"
                sideOffset={8}
                collisionPadding={HERO_MENU_COLLISION_PADDING}
                className="w-48 overflow-y-auto overscroll-contain rounded-[18px] border border-white/12 bg-[#111b31] p-1.5 text-white shadow-[0_22px_60px_rgba(2,6,23,0.62)] ring-0 [scrollbar-color:rgba(148,163,184,0.35)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 hover:[&::-webkit-scrollbar-thumb]:bg-white/40 [&::-webkit-scrollbar-track]:bg-transparent"
                style={{
                  maxHeight: 'min(var(--available-height, 16rem), 16rem)',
                }}
              >
                {VIDEO_MODELS.map((model) => (
                  <DropdownMenuItem
                    key={model.id}
                    className={cn(
                      'cursor-pointer rounded-xl px-3 py-2 text-xs transition-colors not-data-[variant=destructive]:focus:**:!text-white',
                      selectedModelId === model.id
                        ? 'bg-blue-600 font-medium text-white focus:bg-blue-600 focus:text-white'
                        : 'text-white/80 hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white'
                    )}
                    onClick={() => onApplyModel(model.id)}
                  >
                    <span className="truncate">{model.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu
              open={paramsMenuOpen}
              onOpenChange={onParamsMenuOpenChange}
            >
              <DropdownMenuTrigger className="flex h-9 max-w-[150px] cursor-pointer items-center gap-1.5 rounded-xl bg-white/10 px-2.5 text-xs font-medium text-white transition outline-none hover:bg-white/20 sm:max-w-[220px] sm:px-3">
                <SlidersHorizontal className="size-3.5 shrink-0" />
                <span className="min-w-0 truncate">
                  {formatParamLabel(resolution, duration, aspectRatio)}
                </span>
                {paramsMenuOpen ? (
                  <ChevronUp className="size-3 shrink-0 text-white/60" />
                ) : (
                  <ChevronDown className="size-3 shrink-0 text-white/60" />
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="top"
                sideOffset={8}
                collisionPadding={HERO_MENU_COLLISION_PADDING}
                className="w-[min(300px,calc(100vw-32px))] overflow-y-auto overscroll-contain rounded-[18px] border border-white/12 bg-[#111b31] p-4 text-white shadow-[0_22px_60px_rgba(2,6,23,0.62)] ring-0 [scrollbar-color:rgba(148,163,184,0.35)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 hover:[&::-webkit-scrollbar-thumb]:bg-white/40 [&::-webkit-scrollbar-track]:bg-transparent"
                style={{
                  maxHeight:
                    'min(var(--available-height, calc(100svh - 96px)), calc(100svh - 96px))',
                }}
              >
                <p className="mb-2 text-xs font-medium text-white/80">
                  {m['landing.hero.resolution']()}
                </p>
                <div className="flex rounded-md bg-white/10 p-0.5">
                  {supportedResolutions.map((value) => {
                    const active = resolution === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => onResolutionChange(value)}
                        className={cn(
                          'flex-1 cursor-pointer rounded-[5px] py-1.5 text-xs transition-colors',
                          active
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-white/60 hover:text-white'
                        )}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-white/80">
                    {m['landing.hero.duration']()}
                  </p>
                  <output
                    htmlFor="hero-video-duration"
                    className="min-w-10 rounded-full bg-blue-500/20 px-2 py-1 text-center text-xs font-semibold text-blue-400"
                  >
                    {m['landing.hero.duration_seconds']({
                      seconds: duration,
                    })}
                  </output>
                </div>
                <div className="relative mt-3 flex h-5 items-center">
                  <div className="pointer-events-none absolute inset-x-0 h-1.5 rounded-full bg-white/10" />
                  <div
                    className="pointer-events-none absolute left-0 h-1.5 rounded-full bg-blue-500"
                    style={{ width: `${durationProgress}%` }}
                  />
                  <input
                    id="hero-video-duration"
                    type="range"
                    min={durationRange.min}
                    max={durationRange.max}
                    step={1}
                    value={duration}
                    disabled={durationRange.min === durationRange.max}
                    onChange={(event) =>
                      onDurationChange(
                        clampVideoDuration(
                          selectedModelId,
                          Number(event.currentTarget.value)
                        )
                      )
                    }
                    className="[&::-moz-range-thumb]:border-background [&::-webkit-slider-thumb]:border-background absolute inset-x-0 h-5 w-full cursor-pointer appearance-none bg-transparent accent-blue-500 disabled:cursor-default [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:bg-blue-500 [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:bg-blue-500"
                  />
                </div>
                <div className="mt-1 flex justify-between text-[10px] font-medium text-white/50">
                  <span>{durationRange.min}s</span>
                  <span>{durationRange.max}s</span>
                </div>

                <p className="mt-4 mb-2 text-xs font-medium text-white/80">
                  {m['landing.hero.frame']()}
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {aspectRatios.map((ratio) => {
                    const active = aspectRatio === ratio;
                    const isAuto = isAutoVideoAspectRatio(ratio);
                    return (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => onAspectRatioChange(ratio)}
                        className={cn(
                          'flex h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border text-[11px] transition-colors',
                          active
                            ? 'border-blue-500/50 bg-blue-500/20 text-blue-400'
                            : 'border-white/10 text-white/60 hover:bg-white/[0.06] hover:text-white'
                        )}
                      >
                        {isAuto ? (
                          <span className="text-xs">
                            {m['landing.hero.auto']()}
                          </span>
                        ) : (
                          <>
                            <VideoHeroRatioGlyph ratio={ratio} />
                            <span>{ratio}</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              onClick={sessionUser ? onGenerate : onRequireAuth}
              disabled={isGenerating || isUploading}
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-blue-600 px-0 text-xs font-semibold text-white shadow-[0_8px_24px_rgba(37,99,235,0.38)] transition duration-150 hover:scale-[1.02] hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 sm:size-auto sm:h-9 sm:rounded-xl sm:px-4 sm:text-sm"
            >
              {isGenerating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              <span className="hidden sm:inline">
                {referenceMode
                  ? m['landing.hero.generate_reference_video']()
                  : sessionUser
                    ? m['landing.hero.btn_generate_with_credits']({ credits: currentCredits })
                    : m['landing.hero.btn_signin_generate']({ credits: currentCredits })}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Credit quota & login status banner */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 px-3 text-xs">
        <div className="flex items-center gap-1.5 text-white/70">
          <span className="inline-flex items-center gap-1 rounded-md border border-blue-500/30 bg-blue-500/15 px-2 py-0.5 text-[11px] font-medium text-blue-300">
            <Sparkles className="size-3 text-blue-400" />
            {m['landing.hero.cost_per_gen']({ credits: currentCredits })}
          </span>
          <span className="text-white/30">·</span>
          <span className="text-[11px] text-white/60">
            {selectedModel?.name || 'Wan 2.6 Flash'} ({duration}s / {resolution})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {sessionUser ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {m['landing.hero.signed_in_balance']({ balance: userBalance ?? 0 })}
            </span>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-white/60">
              <span>{m['landing.hero.auth_compose_hint']()}</span>
              <button
                type="button"
                onClick={onRequireAuth}
                className="cursor-pointer font-semibold text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors"
              >
                {m['landing.hero.login_to_claim']()}
              </button>
            </div>
          )}
        </div>
      </div>

      {showProcessingHint && (
        <p role="status" className="mt-2 text-xs text-white/70">
          {m['landing.hero.processing_hint']()}
        </p>
      )}
    </div>
  );
}
