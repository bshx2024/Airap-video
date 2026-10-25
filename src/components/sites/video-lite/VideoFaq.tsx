'use client';

import { tDynamic } from '@/core/i18n/dynamic';
import { m } from '@/paraglide/messages.js';

const FAQ_IDS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

export function VideoFaq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="bg-slate-50 px-5 pt-20 pb-28 text-slate-900 transition-colors sm:px-6 md:pt-32 md:pb-40 dark:bg-[#0b1220] dark:text-white"
    >
      <div className="mx-auto w-full max-w-7xl">
        <h2
          id="faq-title"
          className="text-center font-serif text-[36px] leading-[1.08] font-normal tracking-[-0.035em] text-slate-900 sm:text-[44px] md:text-[52px] dark:text-white"
        >
          {m['landing.video_faq.title']()}
        </h2>

        <div className="mt-14 grid gap-y-10 md:mt-20 md:grid-cols-2 md:gap-x-14 md:gap-y-16 lg:gap-x-20">
          {FAQ_IDS.map((id) => (
            <article
              key={id}
              className="grid grid-cols-[2rem_minmax(0,1fr)] gap-4 sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:gap-5"
            >
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-7 items-center justify-center border border-slate-300 font-mono text-[11px] leading-none text-slate-500 sm:size-8 sm:text-xs dark:border-[#334155] dark:text-[#64748b]"
              >
                {id.padStart(2, '0')}
              </span>
              <div>
                <h3 className="text-base leading-6 font-medium text-slate-900 sm:text-lg dark:text-[#f8fafc]">
                  {tDynamic(`landing.video_faq.${id}.question`)}
                </h3>
                <p className="mt-3 max-w-[34rem] text-sm leading-6 text-slate-600 sm:text-[15px] sm:leading-7 dark:text-[#94a3b8]">
                  {tDynamic(`landing.video_faq.${id}.answer`)}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
