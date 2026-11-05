'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { m } from '@/paraglide/messages.js';

const INITIAL_FAQ_IDS = ['1', '2', '8'] as const;
const MORE_FAQ_IDS = ['3', '4', '5', '6', '7', '9', '10'] as const;

export function VideoFaq() {
  const [showAll, setShowAll] = useState(false);

  const visibleIds = showAll
    ? [...INITIAL_FAQ_IDS, ...MORE_FAQ_IDS]
    : INITIAL_FAQ_IDS;

  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="bg-slate-50 px-5 pt-16 pb-24 text-slate-900 transition-colors sm:px-6 md:pt-24 md:pb-32 dark:bg-[#0b1220] dark:text-white"
    >
      <div className="mx-auto w-full max-w-7xl">
        <h2
          id="faq-title"
          className="text-center font-serif text-[32px] leading-[1.08] font-normal tracking-[-0.035em] text-slate-900 sm:text-[40px] md:text-[48px] dark:text-white"
        >
          {m['landing.video_faq.title']()}
        </h2>

        <div className="mt-12 grid gap-y-8 md:mt-16 md:grid-cols-2 md:gap-x-12 md:gap-y-12 lg:gap-x-16">
          {visibleIds.map((id, index) => (
            <article
              key={id}
              className="grid grid-cols-[2rem_minmax(0,1fr)] gap-4 sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:gap-5"
            >
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-7 items-center justify-center border border-slate-300 font-mono text-[11px] leading-none text-slate-500 sm:size-8 sm:text-xs dark:border-[#334155] dark:text-[#64748b]"
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="text-base leading-6 font-medium text-slate-900 sm:text-lg dark:text-[#f8fafc]">
                  {tDynamic(`landing.video_faq.${id}.question`)}
                </h3>
                <p className="mt-2.5 max-w-[34rem] text-sm leading-6 text-slate-600 sm:text-[15px] sm:leading-7 dark:text-[#94a3b8]">
                  {tDynamic(`landing.video_faq.${id}.answer`)}
                </p>
              </div>
            </article>
          ))}
        </div>

        {!showAll && (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-amber-400 hover:text-amber-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:border-amber-400"
            >
              <span>View All 10 Questions</span>
              <ChevronDown className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
