'use client';

import { Shuffle } from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { HERO_PRESETS } from '@/config/video-landing-data';
import { m } from '@/paraglide/messages.js';

export function VideoHeroPresetStrip({
  activePresetIndex,
  onSelectPreset,
  onRandomSelect,
}: {
  activePresetIndex: number | null;
  onSelectPreset: (index: number) => void;
  onRandomSelect: () => void;
}) {
  return (
    <div className="absolute inset-x-0 bottom-7 z-20 sm:bottom-10">
      <div className="mx-auto mb-3 flex max-w-7xl items-center justify-center gap-3 px-5 sm:px-8">
        <h2 className="text-sm font-medium text-white sm:text-base">
          {m['landing.hero.examples']()}
        </h2>
        <button
          type="button"
          onClick={onRandomSelect}
          className="flex cursor-pointer items-center gap-1.5 text-xs text-white/65 transition-colors duration-150 hover:text-white disabled:opacity-40"
        >
          <Shuffle className="size-3.5" />
          {m['landing.hero.random']()}
        </button>
      </div>

      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-[max(20px,calc((100vw-1280px)/2))] pt-1.5 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {HERO_PRESETS.map((preset, idx) => {
          const active = idx === activePresetIndex;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(idx)}
              className={`relative h-16 w-28 shrink-0 cursor-pointer snap-start overflow-hidden rounded-[10px] bg-white/10 transition duration-150 hover:scale-[1.02] sm:h-20 sm:w-32 lg:h-24 lg:w-[10.75rem] ${
                active
                  ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#020617]'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              <video
                src={preset.video}
                muted
                playsInline
                preload="metadata"
                className="size-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <span
                suppressHydrationWarning
                className="absolute bottom-1 left-2 max-w-[90%] truncate text-[10px] font-medium text-white/90"
              >
                {tDynamic(`video.clone.prompts.${preset.key}`)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
