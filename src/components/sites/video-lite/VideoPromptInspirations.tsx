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
      { rootMargin: '120px', threshold: 0.05 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <button
      type="button"
      data-prompt-card="true"
      aria-label={`${m['showcase.dialog.play']()}: ${title}`}
      onClick={onClick}
      className="group focus-visible:ring-primary w-[85vw] max-w-[960px] shrink-0 cursor-pointer snap-start overflow-hidden rounded-[24px] border border-[#1e293b] bg-[#0f172a] text-left shadow-[0_18px_55px_rgba(2,6,23,0.24)] focus-visible:ring-2 focus-visible:outline-none"
    >
      <div
        ref={containerRef}
        className="relative aspect-video w-full overflow-hidden bg-[#171717]"
      >
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="pointer-events-none absolute inset-0 size-full object-cover transition-transform duration-500 ease-out md:group-hover:scale-[1.03]"
          src={`${item.video}#t=0.001`}
        />
        <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-b from-transparent via-black/10 to-black/60 transition-opacity duration-300 group-hover:opacity-0 md:block" />
        <h3 className="pointer-events-none absolute right-6 bottom-5 left-6 hidden text-lg leading-[1.25] font-medium text-white transition-opacity duration-300 group-hover:opacity-0 md:block lg:text-xl">
          {title}
        </h3>
        <div className="pointer-events-none absolute inset-0 hidden flex-col justify-end bg-gradient-to-b from-black/25 via-black/55 to-black/90 p-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:flex">
          <p className="text-xs font-semibold tracking-[0.16em] text-white/50 uppercase">
            {m['video.clone.prompts.eyebrow']()}
          </p>
          <p className="mt-2 line-clamp-9 text-sm leading-[1.6] text-white/90 lg:text-base">
            {prompt}
          </p>
        </div>
      </div>

      <div className="p-5 md:hidden">
        <h3 className="text-lg leading-[1.25] font-medium text-white">
          {title}
        </h3>
        <p className="mt-2 line-clamp-4 text-sm leading-[1.6] text-[#94a3b8]">
          {prompt}
        </p>
      </div>
    </button>
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
      const scrollAmount = el.clientWidth * 0.75;
      el.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleCardClick = (prompt: string) => {
    onUsePrompt(prompt, 'MiniMax H3');
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
          className="flex w-full snap-x snap-mandatory [scroll-padding:0_1.5rem] gap-5 overflow-x-auto px-6 py-4 opacity-100 transition-opacity duration-150 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
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
