'use client';

import { Images, Sparkles } from 'lucide-react';

import { m } from '@/paraglide/messages.js';

export function VideoCta() {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="bg-slate-50 px-4 py-12 text-slate-900 transition-colors md:py-16 dark:bg-[#060a13] dark:text-white">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center text-center">
        <h2 className="max-w-3xl font-serif text-[28px] leading-[1.12] font-normal tracking-[-0.035em] sm:text-[32px] md:text-[40px]">
          {m['landing.cta.title']()}
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 md:text-base dark:text-[#94a3b8]">
          {m['landing.cta.desc']()}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => scrollToSection('generator')}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-5 text-sm font-medium whitespace-nowrap text-white shadow-[0_10px_24px_rgba(37,99,235,0.28)] transition-colors duration-200 hover:bg-[#1d4ed8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3b82f6] md:h-11 md:px-6"
          >
            <Sparkles className="size-4" />
            <span>{m['landing.cta.btn_generate']()}</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('showcase')}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-transparent px-5 text-sm font-medium whitespace-nowrap text-slate-800 transition-colors duration-200 hover:border-slate-400 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-400 md:h-11 md:px-6 dark:border-[#334155] dark:text-white dark:hover:border-[#475569] dark:hover:bg-[#1e293b] dark:focus-visible:outline-[#64748b]"
          >
            <Images className="size-4" />
            <span>{m['landing.cta.btn_examples']()}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
