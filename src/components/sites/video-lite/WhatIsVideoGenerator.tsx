'use client';

import { ArrowRight, Film, Sparkles } from 'lucide-react';

import { m } from '@/paraglide/messages.js';

export function WhatIsVideoGenerator() {
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

        <div className="mt-14 grid overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl sm:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] dark:border-[#1e293b] dark:bg-[#080b12]">
          <div className="flex min-h-80 flex-col bg-blue-50/60 p-6 sm:p-10 lg:min-h-[28rem] lg:p-12 dark:bg-[#111b31]">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-blue-600 uppercase dark:text-[#60a5fa]">
              <Sparkles className="size-3.5" />
              {m['landing.what_is.prompt_badge']()}
            </div>
            <blockquote className="mt-7 max-w-xl text-xl leading-[1.55] font-medium tracking-[-0.01em] text-slate-800 sm:text-2xl lg:text-[28px] lg:leading-[1.45] dark:text-[#dbe4f0]">
              {m['landing.what_is.prompt_quote']()}
            </blockquote>
            <div className="mt-auto flex items-center gap-3 pt-10 text-xs text-slate-500 dark:text-[#94a3b8]">
              <span>{m['landing.what_is.prompt_hint']()}</span>
              <ArrowRight className="hidden size-4 sm:block" />
            </div>
          </div>

          <figure className="relative min-h-80 overflow-hidden bg-black sm:min-h-full">
            <video
              src="/videos/showcase/woman.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className="absolute inset-0 size-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <figcaption className="absolute right-4 bottom-4 flex items-center gap-2 rounded-full border border-white/20 bg-black/65 px-3.5 py-1.5 text-xs text-white backdrop-blur-md">
              <Film className="size-3.5" />
              {m['landing.what_is.video_badge']()}
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
