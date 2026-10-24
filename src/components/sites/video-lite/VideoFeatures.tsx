'use client';

import {
  Files,
  Images,
  Layers,
  Library,
  MessageSquareText,
  SlidersHorizontal,
} from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { VIDEO_FEATURES } from '@/config/video-landing-data';
import { m } from '@/paraglide/messages.js';

const FEATURE_ICONS = [
  MessageSquareText,
  Images,
  Files,
  Layers,
  SlidersHorizontal,
  Library,
];

export function VideoFeatures() {
  return (
    <section
      id="features"
      className="bg-white px-4 py-20 text-slate-900 transition-colors sm:px-6 sm:py-24 lg:py-28 dark:bg-[#030712] dark:text-white"
    >
      <div className="mx-auto w-full max-w-7xl">
        <h2 className="mx-auto max-w-5xl text-center font-serif text-4xl leading-[1.08] tracking-[-0.025em] text-slate-900 sm:text-5xl lg:text-[56px] dark:text-[#f8fafc]">
          {m['landing.features.section_title']()}
        </h2>

        <div className="mt-10 grid gap-px overflow-hidden rounded-[24px] border border-slate-200 bg-slate-200 md:mt-12 md:grid-cols-2 lg:grid-cols-3 dark:border-[#1e293b] dark:bg-[#1e293b]">
          {VIDEO_FEATURES.map((item, index) => {
            const Icon = FEATURE_ICONS[index % FEATURE_ICONS.length];
            return (
              <article
                key={item.id}
                className="min-h-52 bg-white p-7 transition-colors duration-300 hover:bg-slate-50/80 sm:p-8 dark:bg-[#080d19] dark:hover:bg-[#0b1222]"
              >
                <Icon
                  className="size-5 text-slate-700 dark:text-[#e2e8f0]"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <h3 className="mt-7 text-[15px] font-medium text-slate-900 sm:text-base dark:text-[#f8fafc]">
                  {tDynamic(item.titleKey)}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-[15px] sm:leading-7 dark:text-[#94a3b8]">
                  {tDynamic(item.descKey)}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
