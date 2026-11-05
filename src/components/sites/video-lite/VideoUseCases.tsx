'use client';

import { Sparkles } from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { m } from '@/paraglide/messages.js';

interface UseCaseItem {
  id: string;
  badgeKey: string;
  titleKey: string;
  descKey: string;
  video: string;
  reverse?: boolean;
}

const USE_CASE_DATA: UseCaseItem[] = [
  {
    id: '01',
    badgeKey: 'landing.use_cases.1.badge',
    titleKey: 'landing.use_cases.1.title',
    descKey: 'landing.use_cases.1.desc',
    video: '/videos/showcase/generated/web-acrobat.mp4',
    reverse: false,
  },
  {
    id: '02',
    badgeKey: 'landing.use_cases.2.badge',
    titleKey: 'landing.use_cases.2.title',
    descKey: 'landing.use_cases.2.desc',
    video: '/videos/showcase/generated/glacier-titan.mp4',
    reverse: true,
  },
  {
    id: '03',
    badgeKey: 'landing.use_cases.3.badge',
    titleKey: 'landing.use_cases.3.title',
    descKey: 'landing.use_cases.3.desc',
    video: '/videos/showcase/generated/airglide-remake.mp4',
    reverse: false,
  },
];

export function VideoUseCases() {
  return (
    <section
      id="use-cases"
      aria-label={m['landing.footer.use_cases']()}
      className="text-slate-900 transition-colors dark:text-white"
    >
      <div className="bg-white px-6 pt-20 pb-4 transition-colors md:pt-32 md:pb-8 dark:bg-[#060a13]">
        <header className="mx-auto max-w-5xl text-center">
          <h2 className="font-serif text-[36px] leading-[1.08] font-normal tracking-[-0.8px] text-slate-900 md:text-[48px] md:tracking-[-1.12px] dark:text-white">
            {m['landing.use_cases.title']()}
          </h2>
        </header>
      </div>

      {USE_CASE_DATA.map((item, idx) => {
        const isAlternate = idx === 1;
        return (
          <article
            key={item.id}
            className={`transition-colors ${
              isAlternate
                ? 'bg-slate-50 dark:bg-[#0b1220]'
                : 'bg-white dark:bg-[#060a13]'
            }`}
          >
            <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 py-12 md:grid-cols-2 md:gap-20 md:py-20 lg:gap-28">
              {/* 9:16 Vertical Video Preview Stage */}
              <div
                className={`relative flex items-center justify-center ${
                  item.reverse ? 'md:order-2' : ''
                }`}
              >
                {/* Backlight Ambient Glow */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute h-64 w-64 rounded-full bg-amber-500/15 blur-[90px]"
                />

                {/* 9:16 Vertical Mobile Stage Frame */}
                <figure className="group relative aspect-[9/16] w-full max-w-[260px] overflow-hidden rounded-[24px] border border-slate-200/80 bg-black shadow-[0_22px_60px_rgba(2,6,23,0.2)] ring-1 ring-slate-900/5 transition-transform duration-300 hover:scale-[1.02] sm:max-w-[290px] dark:border-white/15 dark:shadow-[0_22px_60px_rgba(2,6,23,0.6)] dark:ring-white/10">
                  <video
                    aria-hidden="true"
                    className="size-full object-cover"
                    src={item.video}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                  {/* Top Badge: 9:16 Vertical */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300 backdrop-blur-md">
                    <Sparkles className="size-3 text-amber-400" />
                    <span>9:16 Vertical</span>
                  </div>

                  {/* Bottom Stage Pill */}
                  <figcaption className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 rounded-xl border border-white/15 bg-black/75 p-2 backdrop-blur-md">
                    <span className="truncate text-xs font-semibold text-white">
                      {tDynamic(item.badgeKey)}
                    </span>
                    <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold text-slate-950">
                      TikTok / Shorts
                    </span>
                  </figcaption>
                </figure>
              </div>

              {/* Text Description */}
              <div className={item.reverse ? 'md:order-1' : ''}>
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="font-serif text-4xl leading-none font-normal tracking-[-0.04em] text-blue-500/30 lg:text-5xl dark:text-[#3b82f6]/30"
                  >
                    {item.id}
                  </span>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs leading-none font-medium text-blue-700 dark:bg-[#172554] dark:text-[#93c5fd]">
                    {tDynamic(item.badgeKey)}
                  </span>
                </div>

                <h3 className="mt-6 font-serif text-2xl leading-[1.12] font-normal tracking-[-0.035em] text-slate-900 md:text-4xl lg:text-[44px] dark:text-white">
                  {tDynamic(item.titleKey)}
                </h3>
                <p className="mt-4 max-w-lg text-base leading-[1.65] text-slate-600 dark:text-[#94a3b8]">
                  {tDynamic(item.descKey)}
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
