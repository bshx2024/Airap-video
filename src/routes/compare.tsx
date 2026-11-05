import { createFileRoute, Link } from '@tanstack/react-router';
import {
  ArrowRight,
  Check,
  Cpu,
  Layers,
  Minus,
  Music,
  ShieldCheck,
  Sparkles,
  Video,
  X,
  Zap,
} from 'lucide-react';

import { envConfigs } from '@/config';
import { getLocale, localizeUrl } from '@/paraglide/runtime.js';
import { VideoFooter } from '@/components/sites/video-lite/VideoFooter';
import { VideoHeader } from '@/components/sites/video-lite/VideoHeader';

interface ComparisonRow {
  dimension: string;
  airap: string;
  templateApps: string;
  videoAnimators: string;
  musicGenerators: string;
}

const BENCHMARK_MATRIX: ComparisonRow[] = [
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
    dimension: 'Transparent Pricing & SLA',
    airap:
      'Free 120 welcome credits + single-use passes from $9.99. 100% automated refund SLA.',
    templateApps: 'Expensive credit packs with opaque token deduction.',
    videoAnimators:
      'Priced as recurring $29–$89/mo monthly SaaS subscriptions.',
    musicGenerators: 'Monthly recurring subscription tiers.',
  },
];

const FEATURE_CHECKLIST = [
  {
    feature: 'Supports 2 Separate Photos (No Joint Pic Required)',
    airap: true,
    sunoHedra: false,
    genericVideo: false,
    templateApps: false,
  },
  {
    feature: 'Alternating Dual-Character Rap Verses',
    airap: true,
    sunoHedra: false,
    genericVideo: false,
    templateApps: true,
  },
  {
    feature: 'Integrated Multisyllabic AI Lyric Writer',
    airap: true,
    sunoHedra: true,
    genericVideo: false,
    templateApps: false,
  },
  {
    feature: 'Built-in 808 Trap & Boom Bap Beat Synthesizer',
    airap: true,
    sunoHedra: true,
    genericVideo: false,
    templateApps: false,
  },
  {
    feature: 'Automated Rap Lip-Sync & Head-Bob Alignment',
    airap: true,
    sunoHedra: true,
    genericVideo: false,
    templateApps: true,
  },
  {
    feature: 'Native 9:16 Vertical Export for TikTok & Shorts',
    airap: true,
    sunoHedra: false,
    genericVideo: true,
    templateApps: true,
  },
  {
    feature: 'No Video Editing Software Needed (Under 60s Render)',
    airap: true,
    sunoHedra: false,
    genericVideo: false,
    templateApps: true,
  },
  {
    feature: '100% Automated Failure Credit Refund SLA',
    airap: true,
    sunoHedra: false,
    genericVideo: false,
    templateApps: false,
  },
];

export const Route = createFileRoute('/compare')({
  loader: () => {
    const locale = getLocale();
    return {
      locale,
      appUrl: envConfigs.app_url,
    };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const appUrl = loaderData?.appUrl || envConfigs.app_url;
    const url = localizeUrl(`${appUrl}/compare`, {
      locale: locale as any,
    }).href;

    const title =
      locale === 'zh'
        ? '2026 最佳 AI 说唱视频生成器对比：Airap vs 常见工具测评 | Airap'
        : 'Best AI Rap Video Generators in 2026: Airap vs Alternatives | Airap';
    const description =
      locale === 'zh'
        ? '2026 年最新 AI 说唱对决视频生成器全方位评测。对比 Airap Video、多工具拼接工作流（Suno+Hedra+剪映）与通用视频大模型在双人照片支持、自动填词、对口型精度及价格上的优缺点。'
        : 'Objective 2026 benchmark of the top AI rap video generators. Compare Airap Video vs multi-tool pipelines (Suno + Hedra + CapCut) and generic AI video tools across dual-character support, auto lyrics, lip sync, and price.';

    return {
      meta: [
        { title },
        { name: 'description', content: description },
        {
          name: 'keywords',
          content:
            'best ai rap video generator, airap alternatives, ai rap video comparison, ai rap battle generator review, suno hedra alternative, ai rap maker 2026',
        },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'article' },
        { property: 'og:url', content: url },
      ],
      links: [{ rel: 'canonical', href: url }],
    };
  },
  component: ComparePage,
});

function ComparePage() {
  return (
    <div className="bg-background text-foreground min-h-screen font-sans antialiased transition-colors dark:bg-[#020617] dark:text-white">
      <VideoHeader />
      <main className="pt-24 pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* Header */}
          <header className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.2)] backdrop-blur-md">
              <Sparkles className="size-3.5 text-amber-400" />
              <span>2026 Objective Market Benchmark</span>
            </div>
            <h1 className="mt-4 font-serif text-3xl leading-[1.1] font-normal tracking-[-0.03em] text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
              Best AI Rap Video Generators in 2026
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base dark:text-[#94a3b8]">
              An objective comparison of end-to-end AI rap battle studios versus
              fragmented multi-tool stacks and generic video diffusion
              generators.
            </p>
          </header>

          {/* Quick Summary Recommendation Box */}
          <div className="mt-12 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-purple-500/10 p-6 shadow-xl backdrop-blur-md sm:p-8">
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
              Executive Summary: Which Rap Generator Should You Choose?
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/50 p-4 dark:bg-black/30">
                <span className="text-xs font-bold text-amber-400 uppercase">
                  Best for Viral Rap Battles
                </span>
                <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  Airap Video
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  Choose if you want to turn two separate photos into an
                  alternating rap battle MV with 808 beats, witty lyrics, and
                  auto lip-sync in 60 seconds.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/50 p-4 dark:bg-black/30">
                <span className="text-xs font-bold text-blue-400 uppercase">
                  Best for Complex Music Editing
                </span>
                <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  Suno + Hedra + Premiere
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  Choose if you are an experienced audio engineer and video
                  editor willing to spend 30+ minutes manually slicing stems and
                  timelines.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/50 p-4 dark:bg-black/30">
                <span className="text-xs font-bold text-purple-400 uppercase">
                  Best for Cinematic Landscapes
                </span>
                <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  Runway Gen-3 / Sora
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  Choose if you need generic cinematic b-roll with complex
                  physics, not multi-character rap performances or lip-sync
                  audio alignment.
                </p>
              </div>
            </div>
          </div>

          {/* 1. Feature Checklist Matrix */}
          <div className="mt-14">
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">
              Feature-by-Feature Capability Checklist
            </h2>
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#080d19]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/70 text-xs font-bold text-slate-700 uppercase dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                      <th className="p-4">Key Capability</th>
                      <th className="border-x border-amber-500/20 bg-amber-500/10 p-4 text-amber-400">
                        Airap Video
                      </th>
                      <th className="p-4">Multi-Tool Stack</th>
                      <th className="p-4">Generic AI Video</th>
                      <th className="p-4">Template Apps</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {FEATURE_CHECKLIST.map((item, idx) => (
                      <tr
                        key={item.feature}
                        className={
                          idx % 2 === 0
                            ? 'bg-transparent'
                            : 'bg-slate-50/50 dark:bg-white/[0.015]'
                        }
                      >
                        <td className="p-4 font-medium text-slate-900 dark:text-white">
                          {item.feature}
                        </td>
                        <td className="border-x border-amber-500/20 bg-amber-500/[0.04] p-4 font-bold text-emerald-400">
                          {item.airap ? (
                            <div className="flex items-center gap-1.5">
                              <Check className="size-4" />
                              <span>Yes (Native)</span>
                            </div>
                          ) : (
                            <X className="size-4 text-rose-400" />
                          )}
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400">
                          {item.sunoHedra ? (
                            <span className="text-amber-400">
                              Requires 3 Apps
                            </span>
                          ) : (
                            <X className="size-4 text-rose-400" />
                          )}
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400">
                          {item.genericVideo ? (
                            <Check className="size-4 text-emerald-400" />
                          ) : (
                            <X className="size-4 text-rose-400" />
                          )}
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400">
                          {item.templateApps ? (
                            <span className="text-amber-400">Rigid Slots</span>
                          ) : (
                            <X className="size-4 text-rose-400" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 2. Detailed 6-Dimension Comparison Matrix */}
          <div className="mt-14">
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">
              6-Dimension Benchmark Matrix
            </h2>
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#080d19]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/70 font-bold uppercase dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                      <th className="w-[20%] p-4">Dimension</th>
                      <th className="w-[28%] border-x border-amber-500/20 bg-amber-500/10 p-4 text-amber-400">
                        <div className="flex items-center gap-1.5">
                          <Zap className="size-4 fill-amber-400 text-amber-400" />
                          <span className="font-extrabold text-white">
                            Airap Video
                          </span>
                        </div>
                      </th>
                      <th className="w-[18%] p-4">Template Apps</th>
                      <th className="w-[17%] p-4">Video Animators (Hedra)</th>
                      <th className="w-[17%] p-4">Music AI (Suno)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {BENCHMARK_MATRIX.map((row, idx) => (
                      <tr
                        key={row.dimension}
                        className={
                          idx % 2 === 0
                            ? 'bg-transparent'
                            : 'bg-slate-50/50 dark:bg-white/[0.015]'
                        }
                      >
                        <td className="p-4 font-semibold text-slate-900 dark:text-white">
                          {row.dimension}
                        </td>
                        <td className="border-x border-amber-500/20 bg-amber-500/[0.04] p-4 font-medium text-slate-800 dark:text-amber-100">
                          <div className="flex items-start gap-2">
                            <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                            <span>{row.airap}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400">
                          <div className="flex items-start gap-2">
                            <Minus className="mt-0.5 size-4 shrink-0 text-amber-400" />
                            <span>{row.templateApps}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400">
                          <div className="flex items-start gap-2">
                            <X className="mt-0.5 size-4 shrink-0 text-rose-400" />
                            <span>{row.videoAnimators}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400">
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
          </div>

          {/* CTA Box */}
          <div className="mt-16 text-center">
            <div className="inline-flex flex-col items-center rounded-3xl border border-white/10 bg-[#080d19] p-8 shadow-2xl sm:p-12">
              <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
                Ready to Create Your First AI Rap Battle?
              </h2>
              <p className="mt-3 max-w-lg text-sm text-slate-300 sm:text-base">
                Get 120 free welcome credits. Upload two photos and generate
                your viral orange studio rap video in under 60 seconds.
              </p>
              <Link
                to="/"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-amber-500/25 transition hover:scale-105 active:scale-95"
              >
                <span>Create My Rap Battle Now</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
      <VideoFooter />
    </div>
  );
}
