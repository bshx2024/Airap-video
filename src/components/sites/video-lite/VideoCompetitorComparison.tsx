'use client';

import { Link } from '@tanstack/react-router';
import { ArrowRight, Sparkles } from 'lucide-react';

export function VideoCompetitorComparison() {
  return (
    <section
      id="comparison"
      className="bg-slate-50 px-4 py-16 text-slate-900 transition-colors sm:px-6 sm:py-24 dark:bg-[#030712] dark:text-white"
    >
      <div className="mx-auto w-full max-w-6xl">
        <header className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.2)] backdrop-blur-md">
            <Sparkles className="size-3.5 text-amber-400" />
            <span>The All-in-One Benchmark</span>
          </div>
          <h2 className="mt-3 font-serif text-2xl leading-[1.1] font-normal tracking-[-0.03em] text-slate-900 sm:text-4xl lg:text-5xl dark:text-white">
            Why Creators Choose Airap Video Over Fragmented Tools
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-xs leading-6 text-slate-600 sm:text-sm dark:text-[#94a3b8]">
            Why juggle separate music, lip-sync, and editing apps? Airap Video
            unifies the entire rap cypher pipeline in 60s.
          </p>
        </header>

        {/* 3 Core Advantage Cards */}
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-amber-400/40 dark:border-white/10 dark:bg-[#080d19]">
            <span className="text-3xl">🎤</span>
            <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
              Two-Person Cypher in 1 Click
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Upload two separate photos. The AI positions both rappers in the
              iconic orange booth with alternating bars.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-purple-400/40 dark:border-white/10 dark:bg-[#080d19]">
            <span className="text-3xl">⚡</span>
            <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
              End-to-End Rap Studio in 60s
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Rhyming lyrics, rap vocals, 808 trap beats, and 128-point lip-sync
              unified in one 9:16 TikTok export.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-400/40 dark:border-white/10 dark:bg-[#080d19]">
            <span className="text-3xl">🛡️</span>
            <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
              No Subscription Trap & SLA
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Free 120 credits to start, single-use passes from $9.99, and
              instant 100% failure refund within 2s.
            </p>
          </div>
        </div>

        {/* Link to Full Benchmark Page */}
        <div className="mt-8 text-center">
          <Link
            to="/compare"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-2.5 text-xs font-bold text-slate-800 shadow-sm transition hover:border-amber-400 hover:text-amber-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:hover:border-amber-400"
          >
            <span>View Full 6-Dimension Benchmark Matrix & Checklist</span>
            <ArrowRight className="size-3.5 text-amber-400" />
          </Link>
        </div>
      </div>
    </section>
  );
}
