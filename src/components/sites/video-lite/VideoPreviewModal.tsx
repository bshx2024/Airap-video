'use client';

import { useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileVideo2,
  WandSparkles,
  X,
} from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { type ShowcaseItem } from '@/config/video-landing-data';
import { m } from '@/paraglide/messages.js';

export function VideoPreviewModal({
  item,
  index,
  total,
  onClose,
  onNavigate,
  onUsePrompt,
  onUseVideo,
}: {
  item: ShowcaseItem | null;
  index: number;
  total: number;
  onClose: () => void;
  onNavigate?: (direction: number) => void;
  onUsePrompt?: (prompt: string, model: string, sourceImage?: string) => void;
  onUseVideo?: (prompt: string, model: string, mediaUrl: string) => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && onNavigate) {
        e.preventDefault();
        onNavigate(-1);
      }
      if (e.key === 'ArrowRight' && onNavigate) {
        e.preventDefault();
        onNavigate(1);
      }
    };
    if (item) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [item, onClose, onNavigate]);

  if (!item) return null;

  const prompt = tDynamic(`video.clone.prompts.${item.key}_text`);
  const title = tDynamic(`video.clone.prompts.${item.key}`);

  const handleApplyPrompt = () => {
    if (onUsePrompt) {
      // Prompt only — do not carry example media into the generator.
      onUsePrompt(prompt, item.model);
    }
    onClose();
    document.querySelector('#generator')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'start',
    });
  };

  const handleApplyVideo = () => {
    if (onUseVideo) {
      onUseVideo(prompt, item.model, item.video);
    } else if (onUsePrompt) {
      onUsePrompt(prompt, item.model, item.video);
    }
    onClose();
    document.querySelector('#generator')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'start',
    });
  };

  const hasNavigation = index >= 0 && total > 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="animate-in fade-in-0 fixed inset-0 top-0 left-0 z-50 grid h-dvh w-screen max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none bg-[#101116] p-0 text-sm text-white ring-0 duration-100 outline-none sm:max-w-none"
    >
      <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-1">
        <div className="relative flex min-h-[52dvh] items-center justify-center overflow-hidden bg-[#080b12]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(37,99,235,0.2),transparent_48%),linear-gradient(135deg,#0c1220_0%,#05070c_100%)]" />
          <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:32px_32px] opacity-20" />

          <button
            type="button"
            aria-label={m['showcase.dialog.close_player']()}
            onClick={onClose}
            className="focus-visible:ring-primary absolute top-4 right-4 z-30 flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/75 backdrop-blur-md transition-colors hover:bg-black/70 hover:text-white focus-visible:ring-2 focus-visible:outline-none lg:hidden"
          >
            <X className="size-4" />
          </button>

          <video
            key={item.video}
            src={item.video}
            controls
            autoPlay
            playsInline
            preload="auto"
            className="relative z-10 max-h-[calc(52dvh-4rem)] max-w-[calc(100%-5rem)] bg-black shadow-[0_28px_90px_rgba(0,0,0,0.55)] lg:max-h-[calc(100dvh-3rem)] lg:max-w-[calc(100%-8rem)]"
          />

          {hasNavigation && onNavigate && (
            <>
              <button
                type="button"
                aria-label={m['showcase.dialog.prev']()}
                onClick={() => onNavigate(-1)}
                className="focus-visible:ring-primary absolute left-3 z-20 flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/35 text-white/80 backdrop-blur-md transition-colors hover:bg-black/65 hover:text-white focus-visible:ring-2 focus-visible:outline-none sm:left-5"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                aria-label={m['showcase.dialog.next']()}
                onClick={() => onNavigate(1)}
                className="focus-visible:ring-primary absolute right-3 z-20 flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/35 text-white/80 backdrop-blur-md transition-colors hover:bg-black/65 hover:text-white focus-visible:ring-2 focus-visible:outline-none sm:right-5"
              >
                <ChevronRight className="size-5" />
              </button>
              <span className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] font-medium text-white/70 backdrop-blur-md">
                {index + 1} / {total}
              </span>
            </>
          )}
        </div>

        <aside className="relative z-20 flex max-h-[48dvh] min-h-0 flex-col overflow-hidden border-t border-white/10 bg-[#0b0b0d]/96 text-white backdrop-blur-xl lg:m-3 lg:ml-0 lg:max-h-none lg:rounded-[1.25rem] lg:border">
          <div className="flex items-center justify-between gap-3 border-b border-white/8 px-5 py-4">
            <a
              href={item.video}
              download
              className="focus-visible:ring-primary inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3.5 text-xs font-medium text-white transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:outline-none"
            >
              <Download className="size-3.5" />
              {m['showcase.dialog.download_master']()}
            </a>
            <button
              type="button"
              aria-label={m['showcase.dialog.close_player']()}
              onClick={onClose}
              className="focus-visible:ring-primary hidden size-9 cursor-pointer items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/8 hover:text-white focus-visible:ring-2 focus-visible:outline-none lg:flex"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <h2 className="text-xs font-medium tracking-[0.12em] text-white/45 uppercase">
              {m['showcase.dialog.video_heading']()}
            </h2>
            <p className="mt-2 text-sm leading-relaxed font-medium text-white/95">
              {title}
            </p>
            <div className="mt-7">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium tracking-[0.12em] text-white/45 uppercase">
                  {m['showcase.dialog.prompt_heading']()}
                </p>
              </div>
              <p className="mt-2 text-sm leading-6 text-white/90">{prompt}</p>
            </div>
          </div>

          <div className="border-t border-white/8 p-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <button
                type="button"
                onClick={handleApplyPrompt}
                className="focus-visible:ring-primary inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1d4ed8] focus-visible:ring-2 focus-visible:outline-none"
              >
                <WandSparkles className="size-4" />
                {m['showcase.dialog.use_prompt']()}
              </button>
              <button
                type="button"
                onClick={handleApplyVideo}
                className="focus-visible:ring-primary inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/12 bg-white/5 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:outline-none"
              >
                <FileVideo2 className="size-4" />
                {m['showcase.dialog.use_video']()}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
