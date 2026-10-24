'use client';

import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { SHOWCASE_ITEMS, type ShowcaseItem } from '@/config/video-landing-data';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';

import { VideoPreviewModal } from './VideoPreviewModal';

function ShowcaseCard({
  item,
  onClick,
}: {
  item: ShowcaseItem;
  onClick: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { rootMargin: '240px', threshold: 0.01 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleMouseEnter = () => {
    videoRef.current?.play().catch(() => {});
  };

  const promptText = tDynamic(`video.clone.prompts.${item.key}_text`);

  return (
    <article className="group relative mb-2 block break-inside-avoid overflow-hidden rounded-xl bg-[#e5e5e5]">
      <div
        ref={containerRef}
        className="relative flex w-full items-center justify-center overflow-hidden"
        style={{ aspectRatio: item.aspectRatio }}
        onMouseEnter={handleMouseEnter}
      >
        <video
          ref={videoRef}
          loop
          muted
          playsInline
          preload="metadata"
          poster={item.sourceImage}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none"
          src={`${item.video}#t=0.001`}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10 opacity-45 transition-opacity group-hover:opacity-80" />
        <span className="pointer-events-none absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white opacity-0 shadow-lg backdrop-blur-md transition group-focus-within:opacity-100 group-hover:scale-105 group-hover:opacity-100 motion-reduce:transition-none">
          <Play className="ml-0.5 size-4 fill-current" />
        </span>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col px-3 pt-12 pb-3 text-white opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
          <p className="line-clamp-3 text-sm">{promptText}</p>
        </div>
      </div>
      <button
        type="button"
        aria-label={`${m['showcase.dialog.play']()}: ${promptText}`}
        onClick={onClick}
        className="focus-visible:ring-primary absolute inset-0 cursor-pointer focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
      />
    </article>
  );
}

export function VideoShowcase({
  onUsePrompt,
  onUseVideo,
}: {
  onUsePrompt?: (prompt: string, model: string, sourceImage?: string) => void;
  onUseVideo?: (prompt: string, model: string, mediaUrl: string) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const selectedItem =
    selectedIndex !== null ? SHOWCASE_ITEMS[selectedIndex] || null : null;

  const handleNavigate = (direction: number) => {
    setSelectedIndex((prev) => {
      if (prev === null) return null;
      return (prev + direction + SHOWCASE_ITEMS.length) % SHOWCASE_ITEMS.length;
    });
  };

  return (
    <section
      id="showcase"
      className="relative overflow-hidden bg-slate-50 px-4 pt-24 pb-28 text-slate-900 transition-colors sm:px-6 md:pt-36 dark:bg-[#060a13] dark:text-white"
    >
      <header className="mx-auto w-full max-w-7xl text-center">
        <h2 className="font-serif text-[34px] leading-[1.05] font-normal tracking-tight text-slate-900 md:text-[48px] lg:text-[56px] dark:text-white">
          {m['landing.showcase.title']()}
        </h2>
        <p className="mx-auto mt-4 max-w-[42rem] text-base leading-[1.625] text-slate-600 dark:text-[#94a3b8]">
          {m['landing.showcase.desc']()}
        </p>
      </header>

      <div
        className={cn(
          'relative mx-auto mt-8 w-full max-w-7xl md:mt-10',
          isExpanded
            ? 'pb-14'
            : 'h-[580px] overflow-hidden md:h-[680px] lg:h-[760px]'
        )}
      >
        <div className="columns-2 gap-2 rounded-[24px] sm:columns-3 lg:columns-4">
          {SHOWCASE_ITEMS.map((item, index) => (
            <ShowcaseCard
              key={item.id}
              item={item}
              onClick={() => setSelectedIndex(index)}
            />
          ))}
        </div>

        {!isExpanded && (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-52 bg-gradient-to-b from-[#060a13]/0 via-[#060a13]/80 to-[#060a13] md:h-64 lg:h-72" />
            <div className="absolute right-0 bottom-8 left-0 z-30 flex justify-center md:bottom-12">
              <button
                type="button"
                aria-expanded={isExpanded}
                onClick={() => setIsExpanded(true)}
                className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[#2563eb] px-6 py-3 text-sm font-medium text-white shadow-[0_12px_32px_rgba(37,99,235,0.3)] transition-[scale,box-shadow] duration-200 hover:scale-[1.03] hover:shadow-xl"
              >
                {m['landing.showcase.browse_all']()}
              </button>
            </div>
          </>
        )}
      </div>

      {selectedItem && (
        <VideoPreviewModal
          item={selectedItem}
          index={selectedIndex ?? 0}
          total={SHOWCASE_ITEMS.length}
          onClose={() => setSelectedIndex(null)}
          onNavigate={handleNavigate}
          onUsePrompt={onUsePrompt}
          onUseVideo={onUseVideo}
        />
      )}
    </section>
  );
}
