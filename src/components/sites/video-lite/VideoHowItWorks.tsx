'use client';

import { tDynamic } from '@/core/i18n/dynamic';
import { HOW_STEPS } from '@/config/video-landing-data';
import { m } from '@/paraglide/messages.js';

export function VideoHowItWorks() {
  return (
    <section
      id="intro-section"
      className="bg-white px-4 pt-20 pb-24 text-slate-900 transition-colors sm:px-6 sm:pt-28 sm:pb-32 dark:bg-[#060a13] dark:text-white"
    >
      <div className="mx-auto max-w-7xl">
        <header className="mx-auto max-w-5xl text-center">
          <h2 className="font-serif text-[32px] leading-[1.08] font-normal tracking-[-0.8px] text-slate-900 md:text-[48px] md:tracking-[-1.12px] dark:text-white">
            {m['landing.how_to.title']()}
          </h2>
          <p className="mx-auto mt-4 text-base leading-[1.65] text-slate-600 dark:text-[#94a3b8]">
            {m['landing.how_to.desc']()}
          </p>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-3 md:mt-12 md:grid-cols-2 md:gap-4 lg:grid-cols-4">
          {HOW_STEPS.map((step) => (
            <article
              key={step.step}
              className="grid h-full grid-rows-[auto_auto_1fr] rounded-[22px] border border-slate-200 bg-slate-50/70 p-6 shadow-sm transition hover:border-blue-500/30 sm:p-7 dark:border-[#1e293b] dark:bg-[#0f172a]"
            >
              <p className="text-xs leading-normal font-semibold tracking-[0.16em] text-blue-600 uppercase dark:text-[#60a5fa]">
                {m['landing.how_to.step_label']({ step: step.step })}
              </p>
              <h3 className="mt-4 text-lg leading-6 font-semibold text-slate-900 lg:min-h-12 dark:text-white">
                {tDynamic(step.titleKey)}
              </h3>
              <p className="mt-3 text-sm leading-[1.65] text-slate-600 sm:text-[15px] dark:text-[#94a3b8]">
                {tDynamic(step.descKey)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
