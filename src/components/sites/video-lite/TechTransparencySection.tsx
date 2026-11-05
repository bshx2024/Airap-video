'use client';

import React from 'react';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  FileVideo,
  Layers,
  Music,
  Scale,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCheck,
  Video,
} from 'lucide-react';

// 1. Explicit Model Assignment Matrix per Generation Mode
const MODE_MODEL_ASSIGNMENTS = [
  {
    mode: '🎤 Duo Cypher (2-Photo Battle · Default)',
    musicEngine: 'Suno v4 Rap Engine (808 Trap / Boom Bap)',
    videoModel:
      'Kling 4.0 Studio (Multi-Character Face Tracking) / Seedance 2.5 Pro',
    nativeResolution: '1080P Full HD (1080×1920 @ 30 FPS)',
    durations: '5s / 10s / 15s',
    credits: '120 / 240 / 360 C',
    turnaround: '~45–75s',
  },
  {
    mode: '👤 Solo / Pet MC Mode (1 Avatar / Pet)',
    musicEngine: 'Suno v4 Rap Engine (Chopper / Meme Flow)',
    videoModel: 'Wan 2.6 Flash (Fast Render) / Kling 4.0 Studio',
    nativeResolution: '1080P Full HD (1080×1920 @ 30 FPS)',
    durations: '5s / 10s / 15s',
    credits: '80 / 160 / 240 C (0.67x Base)',
    turnaround: '~30–50s',
  },
  {
    mode: '👥 Group Rap Mode (3–4 Avatars)',
    musicEngine: 'Suno v4 Multi-Vocal Cypher Engine',
    videoModel: 'Kling 4.0 Studio (Multi-Avatar Spatial Coherence)',
    nativeResolution: '1080P Full HD (1080×1920 @ 30 FPS)',
    durations: '5s / 10s / 15s',
    credits: '180 / 360 / 540 C (1.5x Base)',
    turnaround: '~60–90s',
  },
  {
    mode: '🎬 Master Video Mimic Mode',
    musicEngine: 'Original Audio Track / Suno Remix',
    videoModel: 'Wan 2.6 Flash (Frame-by-Frame Pose Transfer)',
    nativeResolution: '1080P Full HD (1080×1920 @ 30 FPS)',
    durations: '5s / 10s / 15s',
    credits: '120 / 240 / 360 C',
    turnaround: '~40–70s',
  },
];

// 2. Production Quality Standards & Input Best Practices (Replaces unverified vanity numbers)
const QUALITY_BEST_PRACTICES = [
  {
    category: 'Optimal Facial Input Criteria (最佳人脸输入标准)',
    tag: 'Input Guidelines',
    icon: UserCheck,
    points: [
      {
        scenario: 'Frontal Angle (0° – 30° Face Angle)',
        detail:
          'Direct camera focus ensures optimal 128-point landmark tracking and responsive dual-character eye contact.',
        badge: 'Recommended',
      },
      {
        scenario: 'Even Lighting & Natural Expression',
        detail:
          'Balanced lighting without heavy dark sunglasses or occlusions yields natural, rhythmic lip-sync articulation.',
        badge: 'High Fidelity',
      },
      {
        scenario: 'Clear 512×512+ Source Selfies',
        detail:
          'Sharp input photos preserve skin textures and studio lighting, preventing generative motion blur.',
        badge: 'Sharp 1080P',
      },
    ],
  },
  {
    category: 'Vocal & Beat Synchronization (音画卡点与双人对位机制)',
    tag: 'Audio-Visual Sync',
    icon: Music,
    points: [
      {
        scenario: 'Transient 808 Beat Alignment',
        detail:
          'Suno v4 transient detection locks rhyming syllables and flow stress directly to sub-bass kicks and trap snares.',
        badge: 'Tight Beat Sync',
      },
      {
        scenario: 'Dynamic Cypher Mic Passing',
        detail:
          'Alternating lyric bars intelligently cue camera cutaways and head tilts between Rapper 1 and Rapper 2.',
        badge: 'Stage Presence',
      },
      {
        scenario: 'Expressive Viseme Articulation',
        detail:
          'Phoneme-to-mouth mapping coordinates rapid rap cadences with realistic jaw opening on plosive consonants.',
        badge: 'Natural Cadence',
      },
    ],
  },
  {
    category: 'Platform SLA & Zero-Risk Protection (系统可靠性与退款保障)',
    tag: '100% Automated SLA',
    icon: ShieldCheck,
    points: [
      {
        scenario: 'Native 1080P 30 FPS Rendering',
        detail:
          'Standard export is genuine 1080×1920 (9:16 vertical) without fake 4K upscaling interpolation.',
        badge: 'Native 1080P',
      },
      {
        scenario: 'Active GPU Pipeline Monitoring',
        detail:
          'Dedicated high-concurrency cloud GPU nodes eliminate silent queue drops and task stalls.',
        badge: 'Active Watchdog',
      },
      {
        scenario: 'Instant Automated Credit Refund',
        detail:
          'If a backend GPU timeout or occlusion error occurs (<1.8% edge cases), consumed credits auto-refund within 2s.',
        badge: '100% Refund SLA',
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
            <span>Technical Architecture & Quality Specifications</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Technical Parameters & Quality Standards
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
            Airap Video replaces marketing hype with objective technical
            disclosures: exact model roles, verified 1080P resolutions,
            audio-visual beat alignment mechanisms, and an automated refund
            guarantee.
          </p>
        </div>

        {/* 1. Core Technical Answers & Reality Check Callouts */}
        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Music vs Video Separation */}
          <div className="rounded-2xl border border-white/10 bg-[#080d1a] p-5 shadow-lg">
            <div className="flex items-center gap-2 text-amber-400">
              <Music className="size-4" />
              <h3 className="text-sm font-bold text-white">
                Audio Engine vs Video Models
              </h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              <strong className="text-amber-300">Music & Vocals:</strong>{' '}
              Powered by the{' '}
              <strong className="text-white">Suno v4 Rap Engine</strong>,
              generating multisyllabic rhymes, alternating male/female vocal
              stems, and 44.1kHz 808 trap sub-bass beats.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              <strong className="text-cyan-300">Video & Animation:</strong>{' '}
              Driven by <strong className="text-white">Kling 4.0 Studio</strong>{' '}
              (Cinema Lip-Sync),{' '}
              <strong className="text-white">Wan 2.6 Flash</strong> (Fast Rap),
              and <strong className="text-white">Seedance 2.5 Pro</strong>{' '}
              (Dynamic Motion).
            </p>
          </div>

          {/* Card 2: Resolution & 4K Clarification */}
          <div className="rounded-2xl border border-white/10 bg-[#080d1a] p-5 shadow-lg">
            <div className="flex items-center gap-2 text-cyan-400">
              <Video className="size-4" />
              <h3 className="text-sm font-bold text-white">
                Resolution & 4K Clarification
              </h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              <strong className="text-cyan-300">Native Output:</strong> Standard
              export is{' '}
              <strong className="text-white">
                1080P Full HD (1080×1920 9:16 and 1920×1080 16:9)
              </strong>{' '}
              at 30 FPS constant framerate.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              <strong className="text-white">Objective Note:</strong> We do not
              market misleading &quot;native 4K&quot; claims. Current diffusion
              models natively render at 1080P for fluid 30 FPS performance
              without generative hallucinations.
            </p>
          </div>

          {/* Card 3: Lip-Sync Engineering Mechanism */}
          <div className="rounded-2xl border border-white/10 bg-[#080d1a] p-5 shadow-lg">
            <div className="flex items-center gap-2 text-purple-400">
              <Layers className="size-4" />
              <h3 className="text-sm font-bold text-white">
                Lip-Sync Architecture Disclosure
              </h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              <strong className="text-purple-300">Engineering Pipeline:</strong>{' '}
              Lip synchronization is not a single black box. Suno vocal stems
              are decomposed into timestamped phonemes, mapped to 128 facial
              landmarks, and aligned via cross-attention layers in Kling 4.0
              Studio.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Real-time temporal phoneme mapping ensures plosive consonants
              (B/P/T) trigger natural mouth and jaw articulation.
            </p>
          </div>
        </div>

        {/* 2. Table: Explicit Model Assignment Per Generation Mode */}
        <div className="mt-14">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <h3 className="text-lg font-bold text-white sm:text-xl">
                1. Mode & Model Assignment Matrix (各生成模式与模型分工核准表)
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Transparent verification of models, resolutions, durations, and
                credit pricing for each mode.
              </p>
            </div>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
              Active Production Matrix
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#080d1a]/90 shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-white/[0.03] text-slate-400">
                <tr>
                  <th className="px-4 py-3.5 font-bold tracking-wider uppercase">
                    Generation Mode
                  </th>
                  <th className="px-4 py-3.5 font-bold tracking-wider uppercase">
                    Music & Vocals Engine
                  </th>
                  <th className="px-4 py-3.5 font-bold tracking-wider uppercase">
                    Video Diffusion Model
                  </th>
                  <th className="px-4 py-3.5 font-bold tracking-wider uppercase">
                    Output Resolution
                  </th>
                  <th className="px-4 py-3.5 font-bold tracking-wider uppercase">
                    Durations
                  </th>
                  <th className="px-4 py-3.5 font-bold tracking-wider uppercase">
                    Credit Cost
                  </th>
                  <th className="px-4 py-3.5 font-bold tracking-wider uppercase">
                    Turnaround SLA
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {MODE_MODEL_ASSIGNMENTS.map((row, idx) => (
                  <tr key={idx} className="transition hover:bg-white/[0.02]">
                    <td className="px-4 py-3.5 font-bold whitespace-nowrap text-white">
                      {row.mode}
                    </td>
                    <td className="px-4 py-3.5 font-medium whitespace-nowrap text-amber-300">
                      {row.musicEngine}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-cyan-300">
                      {row.videoModel}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-200">
                      {row.nativeResolution}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-white/90">
                      {row.durations}
                    </td>
                    <td className="px-4 py-3.5 font-bold whitespace-nowrap text-amber-400">
                      ⚡ {row.credits}
                    </td>
                    <td className="px-4 py-3.5 font-mono whitespace-nowrap text-cyan-300">
                      {row.turnaround}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Production Quality Standards & Input Best Practices (Replaces unverified pseudo-data) */}
        <div className="mt-14">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <h3 className="text-lg font-bold text-white sm:text-xl">
                2. Production Quality Standards & Best Input Practices
                (成片品质与输入标准)
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Actionable engineering guidelines to achieve cinematic
                dual-character rap battles. Real cases replace unverified vanity
                metrics.
              </p>
            </div>
            <a
              href="#showcase-evidence"
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20"
            >
              <span>View Real Video Demos</span>
              <ArrowRight className="size-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {QUALITY_BEST_PRACTICES.map((group, idx) => {
              const Icon = group.icon;
              return (
                <div
                  key={idx}
                  className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#080d1a] p-5 shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <h4 className="text-sm font-bold text-white">
                        {group.category}
                      </h4>
                      <Icon className="size-4 text-emerald-400" />
                    </div>
                    <span className="mt-2 block text-[10px] font-medium text-slate-400">
                      {group.tag}
                    </span>

                    <div className="mt-4 space-y-3">
                      {group.points.map((pt, pIdx) => (
                        <div
                          key={pIdx}
                          className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-200">
                              {pt.scenario}
                            </span>
                            <span className="shrink-0 rounded border border-emerald-500/20 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                              {pt.badge}
                            </span>
                          </div>
                          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                            {pt.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-1.5 border-t border-white/5 pt-3 text-[10px] font-semibold text-emerald-400/90">
                    <CheckCircle2 className="size-3.5" />
                    <span>Verified Production Standard</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Technical Assurance & Refund SLA Guarantee */}
        <div className="mt-12 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-slate-900/60 to-purple-950/30 p-6 backdrop-blur-md">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white sm:text-lg">
                Technical Disclosure & Automated Credit Protection
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-300 sm:text-sm">
                Airap Video does not use deceptive 4K labels or promise flawless
                zero-defect generation. If your AI rap video encounters a
                backend timeout, GPU allocation failure, or facial detection
                error (&lt;1.8% occurrence), consumed credits are 100% refunded
                to your balance automatically within 2 seconds.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
