'use client';

import React from 'react';
import {
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  FileVideo,
  Layers,
  Music,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCheck,
  Video,
} from 'lucide-react';

const PIPELINE_STAGES = [
  {
    stage: 'Stage 1',
    title: 'Character Landmarks & Feature Extraction',
    desc: 'Input portrait selfies are scanned with 128 facial landmark points, preserving genuine identity, hair texture, and natural gaze.',
    tag: 'Input Engine',
    icon: UserCheck,
  },
  {
    stage: 'Stage 2',
    title: 'Rhyme Generation & 808 Beat Composition',
    desc: 'LLM rhymes are matched to trap / boom-bap cadences; heavy 32Hz sub-bass and percussion tracks are synthesized at 44.1kHz Stereo.',
    tag: 'Audio Engine',
    icon: Music,
  },
  {
    stage: 'Stage 3',
    title: 'Multi-Avatar Diffusion & Scene Rendering',
    desc: 'Specialized video diffusion models animate alternating rappers inside the 3D scene (Migos orange studio, underground cypher, etc.).',
    tag: 'Video Models',
    icon: Sparkles,
  },
  {
    stage: 'Stage 4',
    title: 'Phoneme-to-Viseme Acoustic Lip-Sync',
    desc: 'AI aligns vocal syllables to mouth opening shapes and rhythmic head nods within a strict <15ms audio-visual sync window.',
    tag: 'Sync Engine',
    icon: Layers,
  },
  {
    stage: 'Stage 5',
    title: 'H.264 Encoding & 1080P Social Export',
    desc: 'Composited video is rendered at 1080P @ 30 FPS with broadcast-grade color grading, optimized for instant TikTok & Shorts sharing.',
    tag: 'Encoding Engine',
    icon: FileVideo,
  },
];

interface SpecCategory {
  category: string;
  badge: string;
  items: {
    label: string;
    value: string;
    standard: string;
  }[];
}

const TECHNICAL_SPECIFICATIONS: SpecCategory[] = [
  {
    category: '1. Input Media Standards (输入媒体规范)',
    badge: 'Inputs',
    items: [
      {
        label: 'Supported Image Formats',
        value: 'JPEG, JPG, PNG, WEBP',
        standard: 'Standard RGB / sRGB color profile, uncompressed or compressed',
      },
      {
        label: 'Max File Size & Resolution',
        value: 'Up to 20MB per photo · Min 512×512px up to 4096×4096px',
        standard: 'Optimal aspect: 3:4 portrait or 1:1 square',
      },
      {
        label: 'Face Detection Boundary',
        value: 'Minimum 80×80px facial bounding box with >95% landmark confidence',
        standard: 'Clear front or semi-profile headshots without extreme occlusion',
      },
      {
        label: 'Multi-Photo Mode Support',
        value: '1 Photo (Solo) · 2 Photos (Duo Battle · Default) · 3–4 Photos (Group)',
        standard: 'Individual selfies can be taken at completely different times/places',
      },
    ],
  },
  {
    category: '2. Audio & Beat Engine (音频与伴奏工程参数)',
    badge: 'Audio Engine',
    items: [
      {
        label: 'Acoustic Master Format',
        value: '44.1 kHz, 16-bit Stereo PCM / AAC 192 kbps',
        standard: 'Studio acoustics with dynamic range compression (-14 LUFS integrated)',
      },
      {
        label: 'Genre Cadence & BPM',
        value: '75 – 160 BPM Adaptive Tempo',
        standard: 'Migos Trap (140 BPM) · Boom Bap (92 BPM) · Drill (142 BPM) · Chopper (155 BPM)',
      },
      {
        label: '808 Sub-Bass Synthesis',
        value: 'Frequency range: 32 Hz – 18,000 Hz',
        standard: 'Heavy tuned sine sub-bass with harmonic saturation for phone & headphone punch',
      },
      {
        label: 'Audio-Visual Sync Latency',
        value: '< 15 ms Viseme Alignment Tolerance',
        standard: 'Real-time phoneme matching guaranteeing zero visual lip drift during 15s',
      },
    ],
  },
  {
    category: '3. Video Rendering & Export (视频渲染与输出标准)',
    badge: 'Output Video',
    items: [
      {
        label: 'Container & Video Codec',
        value: 'MP4 Container (MPEG-4 Part 14) · H.264 / AVC (High Profile Level 4.2)',
        standard: 'Maximum cross-device compatibility across iOS, Android, and Web',
      },
      {
        label: 'Resolution Standards',
        value: '9:16 Vertical (1080×1920) · 16:9 Widescreen (1920×1080)',
        standard: 'Crisp 1080P Full HD without upscaling artifacts',
      },
      {
        label: 'Framerate & Bitrate',
        value: '30 FPS Constant Framerate (CFR) · 8.5 Mbps target (12 Mbps peak)',
        standard: 'Optimized for TikTok, Instagram Reels, YouTube Shorts, and X (Twitter)',
      },
      {
        label: 'Available Clip Durations',
        value: '5 seconds · 10 seconds · 15 seconds (Master Cypher)',
        standard: 'Full intro, punchline bars, and 808 beat drop loop',
      },
    ],
  },
  {
    category: '4. AI Model Architecture & Cloud SLA (模型架构与生成时效)',
    badge: 'AI Cloud Infrastructure',
    items: [
      {
        label: 'Supported Video Engines',
        value: 'Kling 4.0 Studio · Wan 2.6 Flash · Seedance 2.5 Pro',
        standard: 'High-throughput NVIDIA H100 / L40S GPU inference clusters',
      },
      {
        label: 'Generation Turnaround SLA',
        value: '5s clip: ~25–35s · 10s clip: ~35–50s · 15s clip: ~45–75s',
        standard: 'Real-time SSE progress streaming with automatic retry failover',
      },
      {
        label: 'Credit Consumption Matrix',
        value: 'Solo: 80–240 C · Duo Battle: 120–360 C · Group: 180–540 C',
        standard: '100% transparent billing calculated live before generation button is clicked',
      },
    ],
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
            <span>Under The Hood · Technical Architecture & Engineering Standards</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Technical Parameters & Architecture
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
            Airap Video operates on an end-to-end multi-modal pipeline adhering to strict broadcast encoding, audio-visual lip-synchronization, and transparent compute consumption standards.
          </p>
        </div>

        {/* 5-Stage Pipeline Flow */}
        <div className="mt-14">
          <div className="mb-4 text-xs font-bold uppercase tracking-wider text-purple-300">
            5-Stage Real-Time Pipeline Architecture
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {PIPELINE_STAGES.map((s) => {
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
                  <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-purple-300/80 font-medium">
                    {s.tag}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Full Comprehensive Technical Specifications Table */}
        <div className="mt-14">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-xl font-bold text-white sm:text-2xl">
                Engineering Specification Standards (技术参数标准表)
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Verifiable input, audio, video encoding, and latency specifications.
              </p>
            </div>
            <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-300">
              Verified Production Spec
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {TECHNICAL_SPECIFICATIONS.map((cat) => (
              <div
                key={cat.category}
                className="overflow-hidden rounded-2xl border border-white/10 bg-[#080d1a]/90 p-5 shadow-lg backdrop-blur-md"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h4 className="text-sm font-bold text-white">
                    {cat.category}
                  </h4>
                  <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                    {cat.badge}
                  </span>
                </div>

                <div className="mt-4 space-y-3.5">
                  {cat.items.map((item, idx) => (
                    <div key={idx} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="font-semibold text-slate-400">
                          {item.label}:
                        </span>
                        <strong className="font-bold text-amber-300 text-right">
                          {item.value}
                        </strong>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400/90 leading-relaxed">
                        {item.standard}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Transparency & Credit Assurance Box */}
        <div className="mt-12 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/30 via-slate-900/60 to-purple-950/30 p-6 backdrop-blur-md">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white sm:text-lg">
                Technical Transparency & SLA Assurance
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-300 sm:text-sm">
                Every generation on Airap explicitly discloses output resolution, audio format, expected turnaround time, and exact credit consumption upfront. If an AI task fails due to server interruption or boundary error, credits are automatically refunded to your balance in real-time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
