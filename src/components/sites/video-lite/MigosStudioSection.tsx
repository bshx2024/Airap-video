'use client';

import React from 'react';
import { ArrowRight, CheckCircle2, Flame, Mic, Play, Sparkles, Video } from 'lucide-react';

export function MigosStudioSection() {
  const handleScrollToStudio = () => {
    const el = document.getElementById('studio-generator');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="migos-orange-studio"
      className="relative overflow-hidden bg-[#070b16] px-4 py-20 text-white sm:px-6 sm:py-28"
    >
      {/* Background ambient lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/4 -translate-y-1/2 h-96 w-96 rounded-full bg-amber-500/10 blur-[130px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-rose-500/10 blur-[120px]"
      />

      <div className="relative mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300 backdrop-blur-md">
            <Flame className="size-3.5 text-amber-400" />
            <span>P0 Flagship Studio Feature · Two-Photo Cypher</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Make Your Own{' '}
            <span className="bg-gradient-to-r from-amber-400 via-rose-500 to-purple-400 bg-clip-text text-transparent">
              Migos-Style Orange Studio
            </span>{' '}
            Rap Video
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
            You've seen the iconic orange studio rap trend take over TikTok and Instagram. Now create your own version using photos of yourself and your friends.
          </p>
        </div>

        {/* Feature Grid & Visual Preview */}
        <div className="mt-14 grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Core Value Propositions */}
          <div className="lg:col-span-7">
            <div className="space-y-4">
              <div className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-amber-400/30 hover:bg-white/[0.05]">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Upload two separate portrait photos
                  </h3>
                  <p className="mt-1 text-sm text-slate-300 leading-normal">
                    No joint photoshoot or video shoot required. Upload two individual selfies taken at completely different times and places.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-amber-400/30 hover:bg-white/[0.05]">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <Mic className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Place both people in an orange studio with a hanging mic
                  </h3>
                  <p className="mt-1 text-sm text-slate-300 leading-normal">
                    Airap automatically generates the signature monochrome vibrant orange aesthetic, complete with the iconic hanging studio condenser microphone.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-amber-400/30 hover:bg-white/[0.05]">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Generate original rap lyrics and 808 trap beats
                  </h3>
                  <p className="mt-1 text-sm text-slate-300 leading-normal">
                    Type a roast joke or celebration topic. AI automatically crafts rhyming verses, syncs heavy 808 sub-bass, and composes authentic trap cadences.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-amber-400/30 hover:bg-white/[0.05]">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <Video className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Alternating rap verses and battle-style performances
                  </h3>
                  <p className="mt-1 text-sm text-slate-300 leading-normal">
                    Watch Rapper 1 and Rapper 2 pass the mic with rhythmic head nods, shoulder rolls, and natural lip synchronization aligned to the beat.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleScrollToStudio}
                className="flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-amber-500/25 transition-all hover:scale-105 hover:shadow-rose-500/35 active:scale-95"
              >
                <Mic className="size-4" />
                <span>Create My Orange Studio Rap Video</span>
                <ArrowRight className="size-4" />
              </button>
              <span className="text-xs text-slate-400">
                ⚡ 60-second creation · 9:16 TikTok Export
              </span>
            </div>
          </div>

          {/* Right Column: Visual Demonstration (2 Photos -> Studio Video) */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-[320px] rounded-3xl border border-amber-400/30 bg-[#0a1020] p-4 shadow-[0_20px_60px_rgba(245,158,11,0.18)]">
              {/* Step indicator pills */}
              <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-amber-300">2 Input Photos</span>
                <span>➔</span>
                <span className="font-semibold text-white">1 Viral Video</span>
              </div>

              {/* Input Photos Row */}
              <div className="mb-4 grid grid-cols-2 gap-2">
                <div className="overflow-hidden rounded-xl border border-amber-400/40 bg-slate-900">
                  <img
                    src="/imgs/examples/hero/studio-portrait.webp"
                    alt="Rapper 1 Selfie"
                    width={140}
                    height={140}
                    className="size-full aspect-square object-cover"
                  />
                  <div className="bg-amber-500/20 py-1 text-center text-[10px] font-bold text-amber-300">
                    Selfie 1
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border border-rose-400/40 bg-slate-900">
                  <img
                    src="/imgs/examples/hero/collectible-figurine.webp"
                    alt="Rapper 2 Selfie"
                    width={140}
                    height={140}
                    className="size-full aspect-square object-cover"
                  />
                  <div className="bg-rose-500/20 py-1 text-center text-[10px] font-bold text-rose-300">
                    Selfie 2
                  </div>
                </div>
              </div>

              {/* Result Video Preview Container */}
              <div className="group relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-amber-400/40 bg-black shadow-inner">
                <video
                  src="/videos/showcase/duo-generated-demo.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="size-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full border border-amber-400/40 bg-black/60 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-md">
                  <Flame className="size-3 text-amber-400" />
                  <span>Migos Orange Studio</span>
                </div>
                <div className="absolute bottom-3 inset-x-3 text-center">
                  <p className="text-xs font-bold text-white drop-shadow">
                    Two Photos In · One Cypher Out
                  </p>
                  <p className="text-[10px] text-amber-300/80">
                    15s · 1080P · 808 Trap Beat
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="mx-auto mt-12 max-w-3xl rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center text-xs text-slate-400">
          <p>
            <strong className="text-slate-300">Disclaimer:</strong> Airap Video is an independent AI creation tool and is not affiliated with Migos, Quavo, Takeoff, or their record labels. The experience creates original AI-generated content inspired by a visual trend.
          </p>
        </div>
      </div>
    </section>
  );
}
