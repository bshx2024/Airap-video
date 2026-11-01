'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { m } from '@/paraglide/messages.js';

interface PromptCardItem {
  id: string;
  key: string;
  video: string;
}

const INSPIRATION_ITEMS: PromptCardItem[] = [
  {
    id: 'orange-studio',
    key: 'orange_studio',
    video: '/videos/showcase/generated/web-acrobat.mp4',
  },
  {
    id: 'choreo-dance',
    key: 'choreo_dance',
    video: '/videos/showcase/generated/airglide-remake.mp4',
  },
  {
    id: 'deep-narrative',
    key: 'deep_narrative',
    video: '/videos/showcase/generated/glacier-titan.mp4',
  },
  {
    id: 'freestyle-battle',
    key: 'freestyle_battle',
    video: '/videos/showcase/generated/monster-commuter.mp4',
  },
  {
    id: 'meme-pet-rap',
    key: 'meme_pet_rap',
    video: '/videos/showcase/generated/monster-bakery.mp4',
  },
  {
    id: 'neon-freestyle',
    key: 'neon_freestyle',
    video: '/videos/showcase/generated/night-conservatory.mp4',
  },
];

function InspirationCard({
  item,
  title,
  prompt,
  onClick,
}: {
  item: PromptCardItem;
  title: string;
  prompt: string;
  onClick: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    video.defaultMuted = true;
    video.muted = true;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { rootMargin: '120px', threshold: 0.1 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="group relative w-[240px] sm:w-[260px] 2xl:w-[275px] shrink-0 aspect-[9/16] snap-start overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-900 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/50 hover:shadow-2xl hover:shadow-amber-500/10 dark:border-white/10 dark:bg-[#0a0f1d]"
    >
      {/* 9:16 Video Background */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className="pointer-events-none absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        src={`${item.video}#t=0.001`}
      />

      {/* Top 9:16 Vertical badge */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-[11px] font-medium text-amber-300 backdrop-blur-md shadow-sm">
        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>9:16 Short</span>
      </div>

      {/* Ambient gradient overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-300" />

      {/* Bottom Info & Action */}
      <div className="absolute inset-x-0 bottom-0 p-4 transition-transform duration-300 group-hover:translate-y-[-2px]">
        <h3 className="text-base font-bold leading-tight text-white line-clamp-1 drop-shadow-md">
          {title}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-300/90 group-hover:line-clamp-4 transition-all">
          {prompt}
        </p>

        {/* Action Button */}
        <button
          type="button"
          onClick={onClick}
          className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-md transition-all hover:brightness-110 active:scale-95"
        >
          <span>🎤</span>
          <span>Use This Prompt</span>
        </button>
      </div>
    </div>
  );
}

export function VideoPromptInspirations({
  onUsePrompt,
}: {
  onUsePrompt: (prompt: string, model: string, sourceImage?: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    updateScrollButtons();
  }, []);

  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 10);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
    }
  };

  const scrollByDirection = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (el) {
      const scrollAmount = Math.min(el.clientWidth * 0.8, 600);
      el.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleCardClick = (prompt: string) => {
    onUsePrompt(prompt, 'Kling 4.0 Studio');
    const generatorEl = document.getElementById('generator');
    if (generatorEl) {
      generatorEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="prompt-examples"
      className="w-full bg-white py-20 text-slate-900 transition-colors sm:py-28 dark:bg-[#0b1220] dark:text-white"
    >
      <header className="mx-auto max-w-5xl px-6 text-center">
        <h2 className="font-serif text-[36px] leading-[1.08] font-normal tracking-[-0.8px] text-balance md:text-[48px] md:tracking-[-1.12px]">
          {m['landing.prompt_examples.title']()}
        </h2>
        <p className="mx-auto mt-4 text-base leading-[1.65] text-slate-600 md:text-lg dark:text-[#94a3b8]">
          {m['landing.prompt_examples.desc']()}
        </p>
      </header>

      <div className="relative mt-8 w-full md:mt-10">
        {canScrollLeft && (
          <button
            type="button"
            aria-label={m['common.table.previous']()}
            onClick={() => scrollByDirection('left')}
            className="absolute top-1/2 left-2 z-10 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white/90 text-slate-800 backdrop-blur-xl transition-colors hover:bg-slate-100 sm:left-4 dark:border-[#334155] dark:bg-[#0f172a]/90 dark:text-white dark:hover:bg-[#1e293b]"
          >
            <ChevronLeft className="size-[18px]" />
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={updateScrollButtons}
          aria-busy="false"
          className="flex w-full snap-x snap-mandatory gap-5 overflow-x-auto px-4 py-4 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex min-w-full items-center justify-start xl:justify-center gap-5">
            {INSPIRATION_ITEMS.map((item) => {
              const title = tDynamic(`video.clone.prompts.${item.key}`);
              const prompt = tDynamic(`video.clone.prompts.${item.key}_text`);

              return (
                <InspirationCard
                  key={item.id}
                  item={item}
                  title={title}
                  prompt={prompt}
                  onClick={() => handleCardClick(prompt)}
                />
              );
            })}
          </div>
        </div>

        {canScrollRight && (
          <button
            type="button"
            aria-label={m['common.table.next']()}
            onClick={() => scrollByDirection('right')}
            className="absolute top-1/2 right-2 z-10 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white/90 text-slate-800 backdrop-blur-xl transition-colors hover:bg-slate-100 dark:border-[#334155] dark:bg-[#0f172a]/90 dark:text-white dark:hover:bg-[#1e293b]"
          >
            <ChevronRight className="size-[18px]" />
          </button>
        )}
      </div>
    </section>
  );
}
