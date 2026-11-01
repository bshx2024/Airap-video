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
    desc: 'Turn any topic, inside joke, or birthday message into original rap lyrics. Customize names, punchlines, and verses before generating your video.',
    icon: Sparkles,
    gradient: 'from-amber-400 to-amber-600',
  },
  {
    id: 'music-beats',
    title: '2. AI Rap Music & 808 Beats',
    desc: 'Choose from Trap, Boom Bap, UK Drill, and other hip-hop styles. Generate original rap audio or upload your own compatible music track.',
    icon: Music,
    gradient: 'from-rose-400 to-rose-600',
  },
  {
    id: 'lip-sync',
    title: '3. Synchronized Rap Lip-Sync',
    desc: 'Animate uploaded portraits to match the generated rap vocals. Designed for rhythmic performances and fast-paced rap delivery.',
    icon: Mic2,
    gradient: 'from-purple-400 to-purple-600',
  },
  {
    id: 'body-groove',
    title: '4. Dynamic Hip-Hop Movements',
    desc: 'Add rhythmic head nods, shoulder movements, and rap-inspired hand gestures to bring your characters to life.',
    icon: Activity,
    gradient: 'from-blue-400 to-blue-600',
  },
  {
    id: 'two-photo-battle',
    title: '5. Two-Photo Rap Battle',
    desc: 'Upload two separate selfies and place both people into the same rap battle scene. No joint photo or filming session required.',
    icon: Users,
    gradient: 'from-emerald-400 to-emerald-600',
  },
  {
    id: 'short-videos',
    title: '6. Ready-to-Share Short Videos',
    desc: 'Create vertical videos for TikTok, Instagram Reels, and YouTube Shorts, with supported export formats and optional animated lyrics.',
    icon: Smartphone,
    gradient: 'from-orange-400 to-rose-500',
  },
];

export function VideoFeatures() {
  return (
    <section
      id="features"
      className="bg-[#030712] px-4 py-20 text-white transition-colors sm:px-6 sm:py-24 lg:py-28"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300">
            <Flame className="size-3.5 text-amber-400" />
            <span>Vertical AI Rap Studio Suite</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Everything You Need to Create an AI Rap Battle
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
            Built specifically for hip-hop creators, viral social memes, and birthday roast battles.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {RAP_FEATURES.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0a101f] p-7 transition-all duration-300 hover:border-amber-400/30 hover:bg-[#0e162b] hover:shadow-xl hover:shadow-amber-500/5"
              >
                <div>
                  <div className={`inline-flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} text-white shadow-md`}>
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                    {item.desc}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
