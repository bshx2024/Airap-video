'use client';

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
    video: '/videos/showcase/generated/airglide-remake.mp4',
    reverse: false,
  },
  {
    id: '02',
    badgeKey: 'landing.use_cases.2.badge',
    titleKey: 'landing.use_cases.2.title',
    descKey: 'landing.use_cases.2.desc',
    video: '/videos/showcase/generated/web-acrobat.mp4',
    reverse: true,
  },
  {
    id: '03',
    badgeKey: 'landing.use_cases.3.badge',
    titleKey: 'landing.use_cases.3.title',
    descKey: 'landing.use_cases.3.desc',
    video: '/videos/showcase/generated/monster-bakery.mp4',
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
              <div
                className={`${
                  item.reverse ? 'md:order-2' : ''
                } aspect-video overflow-hidden rounded-[28px] border-4 border-slate-200 shadow-[0_22px_60px_rgba(2,6,23,0.1)] dark:border-[#172033] dark:shadow-[0_22px_60px_rgba(2,6,23,0.34)]`}
              >
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
              </div>

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
