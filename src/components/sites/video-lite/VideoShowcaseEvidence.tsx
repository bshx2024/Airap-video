'use client';

import React, { useRef, useState } from 'react';
import { CheckCircle2, Flame, Play, Sparkles, Volume2, VolumeX } from 'lucide-react';

interface EvidenceCase {
  id: string;
  exampleNum: string;
  title: string;
  tag: string;
  badge: string;
  description: string;
  inputDescription: string;
  inputThumbnails: string[];
  videoSrc: string;
  scene: string;
  music: string;
  duration: string;
  resolution: string;
  generationTime: string;
  creditsUsed: string;
}

const EVIDENCE_CASES: EvidenceCase[] = [
  {
    id: 'migos-orange-studio',
    exampleNum: 'Example 01',
    title: 'Migos Orange Studio Rap Battle',
    tag: 'Primary Showcase',
    badge: 'Official Verified Test Generation',
    description: 'Two separate individual selfies placed into an orange studio scene, alternating roast punchlines around a hanging microphone.',
    inputDescription: '2 individual selfies (different times & backgrounds)',
    inputThumbnails: [
      '/imgs/examples/hero/studio-portrait.webp',
      '/imgs/examples/hero/collectible-figurine.webp',
    ],
    videoSrc: '/videos/showcase/duo-generated-demo.mp4',
    scene: 'Migos Orange Studio (Hanging Mic)',
    music: 'Heavy 808 Trap (140 BPM)',
    duration: '15 seconds',
    resolution: '1080P (9:16 Vertical)',
    generationTime: '~45 seconds',
    creditsUsed: '360 Credits',
  },
  {
    id: 'friends-roast-battle',
    exampleNum: 'Example 02',
    title: 'Friends Roast Cypher Battle',
    tag: 'Social Humor',
    badge: 'AI Lyrics & Alternating Flow',
    description: 'Two friends trading hilarious banter over late habits and funny inside jokes, with authentic hip-hop head-bobs.',
    inputDescription: '2 friend portraits from camera roll',
    inputThumbnails: [
      '/imgs/scenes/friends-roast-cypher.jpg',
      '/imgs/scenes/hotel-lobby-studio.jpg',
    ],
    videoSrc: '/videos/friendsroast15_vertical.mp4',
    scene: 'Underground Battle Cypher',
    music: '90s Boom Bap (92 BPM)',
    duration: '15 seconds',
    resolution: '1080P (9:16 Vertical)',
    generationTime: '~45 seconds',
    creditsUsed: '360 Credits',
  },
  {
    id: 'pet-rap-flow',
    exampleNum: 'Example 03',
    title: 'Pet MC Chopper Rap Video',
    tag: 'Viral Meme',
    badge: 'Pet MC Animation',
    description: 'A single pet photo wearing a gold chain spitting high-speed chopper flow to energetic bouncy trap beats.',
    inputDescription: '1 pet photo (dog/cat portrait)',
    inputThumbnails: [
      '/imgs/scenes/cute-pet-rap.jpg',
    ],
    videoSrc: '/videos/cutepet15_vertical.mp4',
    scene: 'Neon Club Studio Stage',
    music: 'Chopper Flow Trap (155 BPM)',
    duration: '10 seconds',
    resolution: '720P (9:16 Vertical)',
    generationTime: '~30 seconds',
    creditsUsed: '240 Credits',
  },
];

export function VideoShowcaseEvidence() {
  const [activeMuted, setActiveMuted] = useState<{ [key: string]: boolean }>({
    'migos-orange-studio': true,
    'friends-roast-battle': true,
    'pet-rap-flow': true,
  });

  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  const toggleSound = (id: string) => {
    const video = videoRefs.current[id];
    if (video) {
      const nextMuted = !video.muted;
      video.muted = nextMuted;
      setActiveMuted((prev) => ({ ...prev, [id]: nextMuted }));
    }
  };

  return (
    <section
      id="showcase-evidence"
      className="bg-[#050813] px-4 py-20 text-white transition-colors sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300">
            <Sparkles className="size-3.5 text-amber-400" />
            <span>Product Evidence · Real Generations</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            See What Two Photos Can Create
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
            Real AI-generated rap battle examples with verified generation specifications, exact credit costs, and actual output quality.
          </p>
        </div>

        {/* 3 Detailed Evidence Cards */}
        <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {EVIDENCE_CASES.map((item) => (
            <article
              key={item.id}
              className="flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0c1322] shadow-xl transition-all duration-300 hover:border-amber-400/30 hover:shadow-2xl hover:shadow-amber-500/10"
            >
              {/* Card Header */}
              <div className="border-b border-white/10 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black tracking-wider text-amber-400 uppercase">
                    {item.exampleNum}
                  </span>
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
                    {item.badge}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-bold text-white">
                  {item.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-300">
                  {item.description}
                </p>
              </div>

              {/* Video Player Display */}
              <div className="relative aspect-[9/16] w-full bg-black">
                <video
                  ref={(el) => {
                    videoRefs.current[item.id] = el;
                  }}
                  src={item.videoSrc}
                  autoPlay
                  loop
                  muted={activeMuted[item.id] ?? true}
                  playsInline
                  className="size-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                {/* Sound Toggle Button */}
                <button
                  type="button"
                  onClick={() => toggleSound(item.id)}
                  className="absolute top-3 right-3 flex size-8 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-md transition hover:scale-110 hover:bg-black/80"
                  aria-label={activeMuted[item.id] ? 'Unmute video' : 'Mute video'}
                >
                  {activeMuted[item.id] ? (
                    <VolumeX className="size-4 text-white/70" />
                  ) : (
                    <Volume2 className="size-4 text-amber-300" />
                  )}
                </button>

                {/* Floating Inputs Preview */}
                <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-white/15 bg-black/75 p-2.5 backdrop-blur-md">
                  <div className="mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Input Photos:
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {item.inputThumbnails.map((thumb, idx) => (
                        <img
                          key={idx}
                          src={thumb}
                          alt="Input"
                          width={32}
                          height={32}
                          className="size-8 rounded-full border-2 border-amber-400 object-cover ring-1 ring-black"
                        />
                      ))}
                    </div>
                    <span className="text-[11px] font-medium text-white truncate">
                      {item.inputDescription}
                    </span>
                  </div>
                </div>
              </div>

              {/* Technical Specifications Table */}
              <div className="flex-1 border-t border-white/10 bg-[#090e1a] p-5">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  Verified Generation Specifications:
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Scene Preset</span>
                    <span className="font-semibold text-white">{item.scene}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Music Beat</span>
                    <span className="font-semibold text-white">{item.music}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Duration</span>
                    <span className="font-semibold text-amber-300">{item.duration}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Resolution</span>
                    <span className="font-semibold text-white">{item.resolution}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Generation Time</span>
                    <span className="font-semibold text-white">{item.generationTime}</span>
                  </div>
                  <div className="flex justify-between py-1 pt-1.5">
                    <span className="text-slate-400">Credits Used</span>
                    <span className="font-bold text-amber-400">{item.creditsUsed}</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
