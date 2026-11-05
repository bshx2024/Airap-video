'use client';

import React from 'react';
import {
  Activity,
  Flame,
  Mic2,
  Music,
  Share2,
  Smartphone,
  Sparkles,
  Users,
} from 'lucide-react';

const RAP_FEATURES = [
  {
    id: 'lyrics-roasts',
    title: '1. AI Rap Lyrics & Roasts',
    desc: 'Original rhyming punchlines crafted from any topic or friend banter.',
    icon: Sparkles,
    gradient: 'from-amber-400 to-amber-600',
  },
  {
    id: 'music-beats',
    title: '2. AI Rap Music & 808 Beats',
    desc: 'Built-in hip-hop beats or upload your custom MP3 track.',
    icon: Music,
    gradient: 'from-rose-400 to-rose-600',
  },
  {
    id: 'lip-sync',
    title: '3. Synchronized Rap Lip-Sync',
    desc: 'Fast-cadence phoneme mapping locked to transient 808 kicks.',
    icon: Mic2,
    gradient: 'from-purple-400 to-purple-600',
  },
  {
    id: 'body-groove',
    title: '4. Dynamic Hip-Hop Movements',
    desc: 'Rhythmic head bobs, shoulder bounces, and natural stage gestures.',
    icon: Activity,
    gradient: 'from-blue-400 to-blue-600',
  },
  {
    id: 'two-photo-battle',
    title: '5. Two-Photo Rap Battle',
    desc: 'Upload two separate snapshots; AI stages both rappers face-to-face.',
    icon: Users,
    gradient: 'from-emerald-400 to-emerald-600',
  },
  {
    id: 'short-videos',
    title: '6. Ready-to-Share Short Videos',
    desc: 'Ready-to-post 9:16 vertical videos for TikTok, Reels, and Shorts.',
    icon: Smartphone,
    gradient: 'from-orange-400 to-rose-500',
  },
];

export function VideoFeatures() {
  return (
    <section
      id="features"
      className="bg-[#020617] px-4 py-16 text-white transition-colors sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-7xl">
        <header className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300">
            <Flame className="size-3.5 text-amber-400" />
            <span>AI Rap Studio Features</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Everything You Need to Create an AI Rap Video
          </h2>
          <p className="mx-auto mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
            From two photos to a fully animated rap performance in under 60
            seconds.
          </p>
        </header>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {RAP_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#080d1a] p-6 shadow-lg transition-all duration-300 hover:border-amber-400/40 hover:bg-[#0c1428] hover:shadow-2xl hover:shadow-amber-500/5"
              >
                <div>
                  <div
                    className={`flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} shadow-md`}
                  >
                    <Icon className="size-5 text-white" />
                  </div>
                  <h3 className="mt-5 text-base font-bold text-white transition-colors group-hover:text-amber-300">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
                    {feature.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
