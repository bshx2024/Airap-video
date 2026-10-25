'use client';

import { useRef, useState } from 'react';
import { ArrowRight, Film, Sparkles, Volume2, VolumeX } from 'lucide-react';

import { m } from '@/paraglide/messages.js';

export function WhatIsVideoGenerator() {
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggleSound = () => {
    if (videoRef.current) {
      const nextMuted = !videoRef.current.muted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  return (
    <section
      id="what-is-an-ai-video-generator"
      className="bg-slate-50 px-4 py-20 text-slate-900 transition-colors sm:px-6 sm:py-28 dark:bg-[#0b1220] dark:text-white"
    >
      <div className="mx-auto w-full max-w-7xl">
        <header className="mx-auto max-w-5xl text-center">
          <h2 className="font-serif text-3xl leading-[1.05] font-normal tracking-[-0.03em] text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
            {m['landing.what_is.title']()}
          </h2>
          <p className="mx-auto mt-5 max-w-4xl text-sm leading-7 text-slate-600 sm:text-base dark:text-[#94a3b8]">
            {m['landing.what_is.desc']()}
          </p>
        </header>

        <div className="mt-14 grid overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl sm:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] dark:border-[#1e293b] dark:bg-[#080b12]">
          {/* Left: Prompt & Beat Recipe */}
          <div className="flex min-h-80 flex-col justify-between bg-blue-50/60 p-6 sm:p-10 lg:min-h-[30rem] lg:p-12 dark:bg-[#111b31]">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-blue-600 uppercase dark:text-[#60a5fa]">
                <Sparkles className="size-3.5" />
                {m['landing.what_is.prompt_badge']()}
              </div>

              <blockquote className="mt-6 max-w-xl text-xl leading-[1.55] font-medium tracking-[-0.01em] text-slate-800 sm:text-2xl lg:text-[26px] lg:leading-[1.45] dark:text-[#dbe4f0]">
                {m['landing.what_is.prompt_quote']()}
              </blockquote>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/60 pt-6 text-xs text-slate-500 dark:border-white/10 dark:text-[#94a3b8]">
              <span className="flex items-center gap-1.5 font-medium">
                <span>{m['landing.what_is.prompt_hint']()}</span>
                <ArrowRight className="size-3.5 text-amber-500" />
              </span>
              <span className="rounded-full bg-amber-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400 border border-amber-400/30">
                9:16 TikTok / Shorts Ready
              </span>
            </div>
          </div>

          {/* Right: Real 9:16 Vertical Migos Orange Studio Stage Preview */}
          <div className="relative flex min-h-[440px] items-center justify-center bg-[#050811] p-6 sm:p-8 lg:p-10 overflow-hidden">
            {/* Ambient orange-amber glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 rounded-full bg-amber-500/15 blur-[100px]"
            />

            {/* 9:16 Vertical Stage Card */}
            <figure className="group relative aspect-[9/16] w-full max-w-[240px] sm:max-w-[280px] overflow-hidden rounded-[22px] border border-amber-400/30 bg-black shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_35px_rgba(245,158,11,0.18)] ring-1 ring-white/10 transition-transform duration-300 hover:scale-[1.02]">
              <video
                ref={videoRef}
                src="/videos/showcase/generated/web-acrobat.mp4"
                autoPlay
                loop
                muted={isMuted}
                playsInline
                preload="metadata"
                className="size-full object-cover"
              />

              {/* Gradient vignette */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40" />

              {/* Top pill: 9:16 Vertical tag */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300 backdrop-blur-md">
                <Sparkles className="size-3 text-amber-400" />
                <span>9:16 Vertical</span>
              </div>

              {/* Sound Toggle */}
              <button
                type="button"
                onClick={toggleSound}
                aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                className="absolute top-3 right-3 flex size-8 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md transition hover:bg-black/90 hover:scale-110"
              >
                {isMuted ? (
                  <VolumeX className="size-4 text-white/75" />
                ) : (
                  <Volume2 className="size-4 text-amber-300" />
                )}
              </button>

              {/* Bottom stage badge */}
              <figcaption className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 rounded-xl border border-white/15 bg-black/75 p-2 backdrop-blur-md">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white">
                    Migos Orange Studio
                  </p>
                  <p className="truncate text-[10px] text-amber-300/80">
                    Auto Rap Lyrics & 808 Beat-Sync
                  </p>
                </div>
                <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-amber-400 text-black text-[10px] font-black">
                  9:16
                </span>
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
