'use client';

import { useState, type ComponentType, type RefObject } from 'react';
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  Gift,
  HelpCircle,
  Loader2,
  Mic,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Upload,
  User,
  Users,
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

type StudioMode = 'duo' | 'group' | 'solo';

const OCCASION_CHIPS = [
  {
    label: '🔥 Migos Orange Studio',
    tag: 'Viral TikTok',
    prompt:
      'Two rappers in an iconic bright orange background studio with a single hanging microphone, trading aggressive roast bars, heavy 808 trap beat, rhythmic head nods, hip-hop hand gestures, 9:16 vertical TikTok style',
  },
  {
    label: '🎂 Birthday Roast & Hype',
    tag: 'Gift & Surprise',
    prompt:
      'Two friends celebrating a milestone birthday in a golden hip-hop studio, hilarious witty birthday roast verses, concert-level hype, confetti and gold chains, high-energy delivery',
  },
  {
    label: '🥊 Friends Roast Battle',
    tag: 'Cypher Battle',
    prompt:
      'Two best friends roasting each other about always being late and ordering too much takeout, fast witty punchlines, underground cypher lighting, hyping crowd in background',
  },
  {
    label: '💍 Couples Melodic Duet',
    tag: 'Love & Romance',
    prompt:
      'A romantic duo trading melodic hip-hop verses in a moody neon city lounge, warm ambient lighting, expressive eyes, harmonized ad-libs, cinematic bokeh',
  },
  {
    label: '🐶 Cute Pet Chopper Flow',
    tag: 'Meme Rap',
    prompt:
      'Wearing iced-out gold chains and dark sunglasses, spitting hypersonic chopper rap flow, head-bobbing rhythm, flashing studio lasers, meme humor',
  },
  {
    label: '💼 Monday Work Vent',
    tag: 'Office Comedy',
    prompt:
      'Relatable comedy rap roasting endless Monday 9AM meetings, reply-all emails, and spreadsheet dread, expressive theatrical flow, viral meme cadence',
  },
];

const DEMO_DUO_PHOTOS = [
  {
    url: '/imgs/examples/hero/studio-portrait.webp',
    name: 'rapper-1-lead.png',
  },
  {
    url: '/imgs/examples/hero/collectible-figurine.webp',
    name: 'rapper-2-hype.png',
  },
];

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
  onSwapImages,
  onSetImages,
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
  onSwapImages?: () => void;
  onSetImages?: (urls: string[], names: string[]) => void;
}) {
  const [studioMode, setStudioMode] = useState<StudioMode>('duo');
  const [activeChip, setActiveChip] = useState<string | null>(OCCASION_CHIPS[0].label);

  const currentCredits = getVideoModelCredits(
    selectedModelId,
    duration,
    resolution
  );

  const handleApplyChip = (chip: typeof OCCASION_CHIPS[number]) => {
    setActiveChip(chip.label);
    onPromptChange(chip.prompt);
  };

  const handleLoadDemo = () => {
    if (onSetImages) {
      onSetImages(
        DEMO_DUO_PHOTOS.map((p) => p.url),
        DEMO_DUO_PHOTOS.map((p) => p.name)
      );
    }
  };

  const handleSlotUploadClick = (slot: VideoHeroUploadSlot) => {
    if (!sessionUser) {
      onRequireAuth();
      return;
    }
    onSetUploadSlot(slot);
    fileInputRef.current?.click();
  };

  const photo1 = imageUrls[0];
  const photo2 = imageUrls[1];

  return (
    <div className="w-full max-w-5xl" id="generator">
      {/* Studio Workbench Container */}
      <div className="pointer-events-auto relative rounded-3xl border border-white/12 bg-[#0d1527]/95 p-3.5 text-left shadow-[0_24px_80px_rgba(2,6,23,0.65)] backdrop-blur-2xl transition-all duration-200 hover:border-amber-400/20 sm:p-5">
        
        {/* Hidden Input for file upload */}
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

        {/* 1. Mode Selector Tabs */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="inline-flex rounded-xl bg-white/[0.06] p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setStudioMode('duo')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                studioMode === 'duo'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              )}
            >
              <Mic className="size-3.5" />
              <span>Duo Cypher (2 Photos)</span>
              <span className="hidden sm:inline-block rounded-full bg-slate-900/30 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-amber-950">
                Viral
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStudioMode('group')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                studioMode === 'group'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              )}
            >
              <Users className="size-3.5" />
              <span>Group (1 Photo)</span>
            </button>

            <button
              type="button"
              onClick={() => setStudioMode('solo')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                studioMode === 'solo'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              )}
            >
              <User className="size-3.5" />
              <span>Solo / Pet Rap</span>
            </button>
          </div>

          {/* Quick Demo Loader */}
          <button
            type="button"
            onClick={handleLoadDemo}
            className="flex items-center gap-1 text-[11px] font-medium text-amber-300/90 hover:text-amber-200 transition-colors cursor-pointer bg-amber-400/10 hover:bg-amber-400/20 px-2.5 py-1 rounded-full border border-amber-400/25"
          >
            <Sparkles className="size-3 text-amber-400" />
            <span>Try Sample Duo Photos</span>
          </button>
        </div>

        {/* 2. Visual Rap Staging Upload Area */}
        {studioMode === 'duo' && (
          <div className="mb-4">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              
              {/* Slot 1: Rapper 1 (Leads) */}
              <div className="relative rounded-2xl border border-amber-400/25 bg-amber-500/[0.04] p-3 transition hover:border-amber-400/40">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="flex size-5 items-center justify-center rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                      1
                    </span>
                    <span className="text-xs font-bold tracking-wide text-amber-300 uppercase">
                      Rapper 1 · Leads
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-amber-300/70">
                    Verse 1 & Hook
                  </span>
                </div>

                {photo1 ? (
                  <div className="relative flex items-center gap-2.5 rounded-xl border border-white/15 bg-slate-900/80 p-2">
                    {isVideoMediaUrl(photo1) ? (
                      <video
                        src={photo1}
                        muted
                        playsInline
                        className="size-14 rounded-lg object-cover ring-1 ring-amber-400/40"
                      />
                    ) : (
                      <img
                        src={photo1}
                        alt="Rapper 1"
                        className="size-14 rounded-lg object-cover ring-1 ring-amber-400/40"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white/90">
                        {imageNames[0] || 'rapper-1.png'}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleSlotUploadClick('first')}
                        className="mt-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
                      >
                        Change Photo
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove Rapper 1"
                      onClick={() => onRemoveImage(0)}
                      className="size-7 rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white flex items-center justify-center cursor-pointer"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSlotUploadClick('first')}
                    disabled={isUploading}
                    className="flex h-16 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-400/30 bg-white/[0.02] text-center transition hover:border-amber-400/60 hover:bg-amber-400/[0.04]"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-200">
                      <Upload className="size-3.5" />
                      <span>Upload Rapper 1 Photo</span>
                    </div>
                    <span className="text-[10px] text-white/45">Selfie, Portrait, or Mascot</span>
                  </button>
                )}
              </div>

              {/* Center Swap Action */}
              <div className="flex items-center justify-center py-1 sm:py-0">
                <button
                  type="button"
                  onClick={onSwapImages}
                  title="Swap Lead & Hype roles"
                  className="group flex size-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:scale-110 hover:border-amber-400 hover:bg-amber-500 hover:text-slate-950 cursor-pointer shadow-lg"
                >
                  <ArrowLeftRight className="size-4 transition group-hover:rotate-180 duration-300" />
                </button>
              </div>

              {/* Slot 2: Rapper 2 (Hypes) */}
              <div className="relative rounded-2xl border border-fuchsia-400/25 bg-fuchsia-500/[0.04] p-3 transition hover:border-fuchsia-400/40">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="flex size-5 items-center justify-center rounded-full bg-fuchsia-400 text-slate-950 text-[10px] font-black">
                      2
                    </span>
                    <span className="text-xs font-bold tracking-wide text-fuchsia-300 uppercase">
                      Rapper 2 · Hypes
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-fuchsia-300/70">
                    Roast & Backing
                  </span>
                </div>

                {photo2 ? (
                  <div className="relative flex items-center gap-2.5 rounded-xl border border-white/15 bg-slate-900/80 p-2">
                    {isVideoMediaUrl(photo2) ? (
                      <video
                        src={photo2}
                        muted
                        playsInline
                        className="size-14 rounded-lg object-cover ring-1 ring-fuchsia-400/40"
                      />
                    ) : (
                      <img
                        src={photo2}
                        alt="Rapper 2"
                        className="size-14 rounded-lg object-cover ring-1 ring-fuchsia-400/40"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white/90">
                        {imageNames[1] || 'rapper-2.png'}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleSlotUploadClick('last')}
                        className="mt-1 text-[11px] font-semibold text-fuchsia-400 hover:text-fuchsia-300 cursor-pointer"
                      >
                        Change Photo
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove Rapper 2"
                      onClick={() => onRemoveImage(1)}
                      className="size-7 rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white flex items-center justify-center cursor-pointer"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSlotUploadClick('last')}
                    disabled={isUploading}
                    className="flex h-16 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-fuchsia-400/30 bg-white/[0.02] text-center transition hover:border-fuchsia-400/60 hover:bg-fuchsia-400/[0.04]"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-medium text-fuchsia-200">
                      <Upload className="size-3.5" />
                      <span>Upload Rapper 2 Photo</span>
                    </div>
                    <span className="text-[10px] text-white/45">Friend, Partner, or Pet</span>
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

        {/* 2b. Single Slot Modes (Group or Solo) */}
        {studioMode !== 'duo' && (
          <div className="mb-4">
            <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold tracking-wide text-amber-300 uppercase">
                  {studioMode === 'group' ? '👥 Both Friends in 1 Group Photo' : '⚡ Solo MC / Pet Selfie'}
                </span>
                <span className="text-[10px] text-white/50">
                  {studioMode === 'group' ? 'AI separates both faces automatically' : 'Spits high-energy solo bars'}
                </span>
              </div>

              {photo1 ? (
                <div className="relative flex items-center gap-3 rounded-xl border border-white/15 bg-slate-900/80 p-2.5">
                  <img
                    src={photo1}
                    alt="Uploaded photo"
                    className="size-16 rounded-lg object-cover ring-1 ring-amber-400/40"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white/90">
                      {imageNames[0] || 'photo.png'}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSlotUploadClick('first')}
                      className="mt-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
                    >
                      Change Photo
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => onRemoveImage(0)}
                    className="size-7 rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white flex items-center justify-center cursor-pointer"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSlotUploadClick('first')}
                  disabled={isUploading}
                  className="flex h-20 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-400/30 bg-white/[0.02] text-center transition hover:border-amber-400/60 hover:bg-amber-400/[0.04]"
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium text-amber-200">
                    <Upload className="size-4" />
                    <span>Click to Upload Photo</span>
                  </div>
                  <span className="mt-0.5 text-[10px] text-white/45">
                    Clear lighting, faces visible · Supports JPG, PNG, WEBP
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 3. Occasion / Vibe Selector Chips */}
        <div className="mb-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold tracking-wider text-amber-400 uppercase">
            <Flame className="size-3" />
            Vibe & Occasion:
          </span>
          {OCCASION_CHIPS.map((chip) => {
            const isSelected = activeChip === chip.label;
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleApplyChip(chip)}
                className={cn(
                  'shrink-0 cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                  isSelected
                    ? 'border-amber-400 bg-amber-400/20 text-amber-200 shadow-sm'
                    : 'border-white/10 bg-white/5 text-white/75 hover:border-white/30 hover:bg-white/10 hover:text-white'
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* 4. Textarea Directing Field */}
        <textarea
          rows={4}
          maxLength={3000}
          value={prompt}
          onChange={(e) => {
            onPromptChange(e.target.value);
            setActiveChip(null);
          }}
          placeholder="Direct your rap scene (e.g. 'Two rappers in an iconic orange studio, hanging mic, roasting each other about being late, heavy 808s, rapid head nods, 9:16 vertical')..."
          suppressHydrationWarning
          className="max-h-36 min-h-24 w-full resize-none overflow-y-auto rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm leading-relaxed text-white outline-none placeholder:text-white/40 focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/50"
        />

        {/* 5. Parameter Controls & CTA Bar */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 pt-1">
          {/* Quick upload menu fallback */}
          <div className="relative shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={isUploading}
                aria-label="Add Media"
                className="flex size-9 cursor-pointer items-center justify-center rounded-xl border border-white/20 bg-white/[0.05] text-white/80 transition outline-none hover:border-white/40 hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="size-4 animate-spin text-amber-400" />
                ) : (
                  <Plus className="size-4" />
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                side="top"
                sideOffset={8}
                collisionPadding={HERO_MENU_COLLISION_PADDING}
                className="min-w-48 p-1 bg-[#111b31] border-white/12 text-white"
              >
                {mediaActions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem
                      key={item.key}
                      className="gap-2.5 text-xs cursor-pointer hover:bg-white/10"
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
          </div>

          {/* Model & Parameters Dropdowns & CTA Button */}
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            {/* AI Model Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-9 max-w-[150px] cursor-pointer items-center gap-1.5 rounded-xl bg-white/10 px-2.5 text-xs font-medium text-white transition outline-none hover:bg-white/20 sm:max-w-[190px] sm:px-3">
                <WandSparkles className="size-3.5 shrink-0 text-amber-400" />
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
                className="w-52 overflow-y-auto overscroll-contain rounded-[18px] border border-white/12 bg-[#111b31] p-1.5 text-white shadow-[0_22px_60px_rgba(2,6,23,0.62)] ring-0"
              >
                {VIDEO_MODELS.map((model) => (
                  <DropdownMenuItem
                    key={model.id}
                    className={cn(
                      'cursor-pointer rounded-xl px-3 py-2 text-xs transition-colors',
                      selectedModelId === model.id
                        ? 'bg-amber-500 font-semibold text-slate-950'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    )}
                    onClick={() => onApplyModel(model.id)}
                  >
                    <span className="truncate">{model.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Resolution & Aspect Ratio Settings */}
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
                className="w-[min(300px,calc(100vw-32px))] overflow-y-auto overscroll-contain rounded-[18px] border border-white/12 bg-[#111b31] p-4 text-white shadow-[0_22px_60px_rgba(2,6,23,0.62)] ring-0"
              >
                <p className="mb-2 text-xs font-medium text-white/80">
                  {m['landing.hero.resolution']()}
                </p>
                <div className="flex rounded-md bg-white/10 p-0.5 mb-3">
                  {supportedResolutions.map((value) => {
                    const active = resolution === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => onResolutionChange(value)}
                        className={cn(
                          'flex-1 rounded py-1 text-center text-xs font-medium transition cursor-pointer',
                          active
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-white/70 hover:text-white'
                        )}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>

                <p className="mb-2 text-xs font-medium text-white/80">
                  {m['landing.hero.aspect_ratio']()}
                </p>
                <div className="grid grid-cols-4 gap-1">
                  {aspectRatios.map((ratio) => {
                    const active = aspectRatio === ratio;
                    return (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => onAspectRatioChange(ratio)}
                        className={cn(
                          'flex flex-col items-center justify-center gap-1 rounded-lg border p-1.5 text-xs transition cursor-pointer',
                          active
                            ? 'border-amber-400 bg-amber-400/15 text-amber-200'
                            : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
                        )}
                      >
                        <VideoHeroRatioGlyph ratio={ratio} />
                        <span className="text-[10px]">{ratio}</span>
                      </button>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* High-Converting CTA Button */}
            <button
              type="button"
              onClick={sessionUser ? onGenerate : onRequireAuth}
              disabled={isGenerating || isUploading}
              className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 px-4 text-xs font-bold text-slate-950 shadow-[0_8px_24px_rgba(245,158,11,0.35)] transition duration-150 hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:px-5 sm:text-sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="size-4 animate-spin text-slate-950" />
                  <span>Directing Rap Cypher...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-4 fill-slate-950" />
                  <span>
                    {sessionUser
                      ? `Make Our Rap Video (${currentCredits} Credits)`
                      : 'Make Our Rap Video (Get 100 Free Credits)'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 6. Psychology Risk Reversal & De-Risking Footer Bar */}
      <div className="mt-3 grid grid-cols-2 gap-2 px-2 text-xs sm:grid-cols-4 sm:gap-3">
        <div className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-white/70">
          <Gift className="size-3.5 shrink-0 text-amber-400" />
          <span className="truncate text-[11px] font-medium">100 Free Credits</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-white/70">
          <ShieldCheck className="size-3.5 shrink-0 text-emerald-400" />
          <span className="truncate text-[11px] font-medium">100% Refund on Error</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-white/70">
          <Clock className="size-3.5 shrink-0 text-blue-400" />
          <span className="truncate text-[11px] font-medium">~2 Mins Fast Queue</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-white/70">
          <Sparkles className="size-3.5 shrink-0 text-purple-400" />
          <span className="truncate text-[11px] font-medium">Photos 100% Private</span>
        </div>
      </div>

      {showProcessingHint && (
        <p role="status" className="mt-2 text-center text-xs text-white/70">
          {m['landing.hero.processing_hint']()}
        </p>
      )}
    </div>
  );
}
