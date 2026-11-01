'use client';

import React from 'react';
import { ArrowRight, CheckCircle2, Cpu, FileVideo, Flame, Layers, Music, ShieldCheck, Sparkles, UserCheck } from 'lucide-react';

const PIPELINE_STAGES = [
  {
    stage: 'Stage 1',
    title: 'Photo Processing & Character Extraction',
    desc: 'The system prepares uploaded portraits for character animation, facial boundary landmarks, and scene composition.',
    tag: 'Input Analysis',
    icon: UserCheck,
  },
  {
    stage: 'Stage 2',
    title: 'Lyrics & 808 Audio Generation',
    desc: 'The system generates rhyming rap lyrics, vocal cadences, and heavy 808 sub-bass music based on your prompt and chosen genre.',
    tag: 'Audio Engine',
    icon: Music,
  },
  {
    stage: 'Stage 3',
    title: 'Character Animation & Scene Synthesis',
    desc: 'Specialized video diffusion models animate characters inside the requested 3D stage (such as the Migos Orange Studio).',
    tag: 'Video Models',
    icon: Sparkles,
  },
  {
    stage: 'Stage 4',
    title: 'Audio-Visual Synchronization',
    desc: 'Vocal phonemes are aligned to mouth shapes, head nods, and hip-hop hand gestures for tight, natural performance timing.',
    tag: 'Sync Engine',
    icon: Layers,
  },
  {
    stage: 'Stage 5',
    title: 'Final Video Rendering & Export',
    desc: 'The finished video is composited and exported in vertical 9:16 format with supported 720P / 1080P resolutions.',
    tag: 'Rendering',
    icon: FileVideo,
  },
];

export function TechTransparencySection() {
  return (
    <section
      id="technical-transparency"
      className="bg-[#030611] px-4 py-20 text-white transition-colors sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs font-semibold text-purple-300">
            <Cpu className="size-3.5 text-purple-400" />
            <span>Under The Hood · Technical Architecture</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            How Airap Creates AI Rap Videos
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
            Airap Video combines multiple specialized AI stages to turn portrait photos into synchronized rap performances.
          </p>
        </div>

        {/* 5-Stage Pipeline Flow */}
        <div className="mt-14 space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            {PIPELINE_STAGES.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.stage}
                  className="relative flex flex-col justify-between rounded-2xl border border-white/10 bg-[#080d1a] p-5 transition-all duration-200 hover:border-purple-400/40 hover:bg-[#0c1428]"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300 uppercase">
                        {s.stage}
                      </span>
                      <Icon className="size-4 text-purple-400" />
                    </div>
                    <h3 className="mt-4 text-sm font-bold text-white">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">
                      {s.desc}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-slate-400 font-medium">
                    {s.tag}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Technical Transparency Box */}
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-md">
          <div className="flex items-start gap-3.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Technical Transparency & Disclosure
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-300 sm:text-sm">
                For every generation mode, Airap explicitly discloses output specifications, estimated credit consumption, and generation times before confirmation. We avoid unsubstantiated marketing claims, ensuring creators receive predictable, reliable results for social publishing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
