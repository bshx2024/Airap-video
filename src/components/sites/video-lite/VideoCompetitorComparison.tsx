'use client';

import { Check, Minus, Sparkles, X, Zap } from 'lucide-react';

interface ComparisonRow {
  dimension: string;
  airap: string;
  templateApps: string;
  videoAnimators: string;
  musicGenerators: string;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    dimension: 'Two-Person Cypher (Duo Photos)',
    airap:
      'Upload 2 separate individual selfies OR 1 group pic. AI places both in the booth.',
    templateApps: 'Requires joint photos or limited fixed template slots.',
    videoAnimators:
      'Single avatar only. Requires manual stitching across video tools.',
    musicGenerators: 'Audio only. No photo or video generation capabilities.',
  },
  {
    dimension: 'Personalized Roasts & Rhyme Writing',
    airap:
      'Type friend’s name, quirks, or inside jokes. AI writes multisyllabic punchlines.',
    templateApps: 'Generic pre-baked rhymes with little personalization.',
    videoAnimators: 'None. You must write and record your own external audio.',
    musicGenerators:
      'Generates lyrics, but cannot sync to two specific visual characters.',
  },
  {
    dimension: '808 Beat Variety & Custom Audio',
    airap:
      '5 built-in styles (Heavy 808 Trap, Boom Bap, UK Drill, etc.) + Upload custom MP3.',
    templateApps: 'Rigid selection of 1 or 2 standard loops.',
    videoAnimators: 'No built-in music engine. Audio must be provided by user.',
    musicGenerators: 'Excellent audio variety, but zero visual rendering.',
  },
  {
    dimension: 'Dynamic Hip-Hop Swag & Head Nods',
    airap:
      'Rhythmic head bobs, shoulder bounces, and authentic hip-hop hand gestures.',
    templateApps: 'Basic lip-sync with minimal body movement.',
    videoAnimators:
      'Good facial lip-sync, but lacks authentic rap dance groove.',
    musicGenerators: 'No video output.',
  },
  {
    dimension: 'Zero-Editing All-in-One Workflow',
    airap:
      '4 clicks in your browser. Complete 9:16 vertical MV delivered in under 60 seconds.',
    templateApps: 'Relatively simple, but long processing queues.',
    videoAnimators:
      'Complex 3-app pipeline (Suno ➔ Hedra ➔ CapCut) taking 30+ minutes.',
    musicGenerators: 'Requires combining with external video tools.',
  },
  {
    dimension: 'Transparent Single-Use Pricing',
    airap:
      'Free welcome credits + instant single-use passes from $9.99. No forced subscriptions.',
    templateApps: 'Expensive credit packs with opaque token deduction.',
    videoAnimators:
      'Priced as recurring $29–$89/mo monthly SaaS subscriptions.',
    musicGenerators: 'Monthly recurring subscription tiers.',
  },
];

export function VideoCompetitorComparison() {
  return (
    <section
      id="comparison"
      className="bg-slate-50 px-4 py-20 text-slate-900 transition-colors sm:px-6 sm:py-28 dark:bg-[#030712] dark:text-white"
    >
      <div className="mx-auto w-full max-w-7xl">
        <header className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.2)] backdrop-blur-md">
            <Sparkles className="size-3.5 text-amber-400" />
            <span>The All-in-One Benchmark</span>
          </div>
          <h2 className="mt-4 font-serif text-3xl leading-[1.08] font-normal tracking-[-0.03em] text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
            Why Creators Choose Airap Video Over Fragmented Tools
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base dark:text-[#94a3b8]">
            Why juggle Suno for music, Hedra for lip-sync, and Premiere for
            editing? Airap Video unifies the entire pipeline into one effortless
            60-second studio.
          </p>
        </header>

        {/* Comparison Matrix Table */}
        <div className="mt-14 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-xl dark:border-[#1e293b] dark:bg-[#080d19]">
          <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-xs font-bold tracking-wider text-slate-700 uppercase dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                  <th scope="col" className="w-[22%] p-4 sm:p-5">
                    Feature Dimension
                  </th>
                  <th
                    scope="col"
                    className="w-[28%] border-x border-amber-500/20 bg-amber-500/10 p-4 text-amber-400 sm:p-5"
                  >
                    <div className="flex items-center gap-1.5">
                      <Zap className="size-4 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-extrabold text-white">
                        Airap Video
                      </span>
                      <span className="ml-auto rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                        All-in-One
                      </span>
                    </div>
                  </th>
                  <th scope="col" className="w-[18%] p-4 sm:p-5">
                    Template Apps (RapVideo, WakePix)
                  </th>
                  <th scope="col" className="w-[16%] p-4 sm:p-5">
                    Video Animators (Hedra)
                  </th>
                  <th scope="col" className="w-[16%] p-4 sm:p-5">
                    Music AI (Suno)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm dark:divide-white/5">
                {COMPARISON_ROWS.map((row, idx) => (
                  <tr
                    key={row.dimension}
                    className={
                      idx % 2 === 0
                        ? 'bg-transparent'
                        : 'bg-slate-50/50 dark:bg-white/[0.015]'
                    }
                  >
                    <td className="p-4 font-semibold text-slate-900 sm:p-5 dark:text-white">
                      {row.dimension}
                    </td>
                    <td className="border-x border-amber-500/20 bg-amber-500/[0.04] p-4 font-medium text-slate-800 sm:p-5 dark:text-amber-100">
                      <div className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                        <span>{row.airap}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 sm:p-5 dark:text-slate-400">
                      <div className="flex items-start gap-2">
                        <Minus className="mt-0.5 size-4 shrink-0 text-amber-400" />
                        <span>{row.templateApps}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 sm:p-5 dark:text-slate-400">
                      <div className="flex items-start gap-2">
                        <X className="mt-0.5 size-4 shrink-0 text-rose-400" />
                        <span>{row.videoAnimators}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 sm:p-5 dark:text-slate-400">
                      <div className="flex items-start gap-2">
                        <X className="mt-0.5 size-4 shrink-0 text-rose-400" />
                        <span>{row.musicGenerators}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4 Super-Power Selling Point Cards Absorbed From Top Competitors */}
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-amber-400/40 dark:border-white/10 dark:bg-[#080d19]">
            <span className="text-2xl">🔥</span>
            <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
              Viral Orange Studio Specialist
            </h3>
            <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
              High-fidelity staging of the iconic orange booth with hanging
              studio condenser microphone, alternating punchlines, and 808 beat
              drops.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-purple-400/40 dark:border-white/10 dark:bg-[#080d19]">
            <span className="text-2xl">🎭</span>
            <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
              Personalized Roasts & Names
            </h3>
            <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
              Unlike rigid templates, enter friends' names and funny real-life
              habits to generate witty multisyllabic roast battles and birthday
              banter.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-400/40 dark:border-white/10 dark:bg-[#080d19]">
            <span className="text-2xl">🎵</span>
            <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
              Suno 808 Engine or Custom MP3
            </h3>
            <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
              Generate fresh 808 Trap, Boom Bap, and Drill beats with auto vocal
              melodies via Suno v4, or upload your own favorite audio track for
              instant lip-sync.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-400/40 dark:border-white/10 dark:bg-[#080d19]">
            <span className="text-2xl">📱</span>
            <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
              Mobile Direct & 9:16 TikTok
            </h3>
            <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
              Upload photos directly from your phone camera. Pre-formatted in
              9:16 vertical resolution with animated subtitles and 100%
              royalty-free commercial rights.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
