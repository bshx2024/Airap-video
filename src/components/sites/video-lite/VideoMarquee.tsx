'use client';

import { useState } from 'react';
import { Volume2, VolumeX, Sparkles, Play } from 'lucide-react';

export interface MarqueeClip {
  id: string;
  title: string;
  tag: string;
  video: string;
  badge: string;
  description: string;
}

export const MARQUEE_CLIPS: MarqueeClip[] = [
  {
    id: 'orange-studio',
    title: 'Migos Orange Studio',
    tag: 'Hotel Lobby Duo',
    video: '/videos/showcase/generated/web-acrobat.mp4',
    badge: '🔥 Viral Trend',
    description: 'Iconic bright orange booth, trading bars on the hanging mic.',
  },
  {
    id: 'roast-battle',
    title: 'Friends Roast Cypher',
    tag: 'Underground Battle',
    video: '/videos/showcase/generated/monster-commuter.mp4',
    badge: '🥊 Roast Cypher',
    description: 'Two best friends roasting each other with rapid-fire delivery.',
  },
  {
    id: 'birthday-bday',
    title: 'Birthday Surprise Duet',
    tag: 'Party Hype',
    video: '/videos/showcase/generated/glacier-titan.mp4',
    badge: '🎂 Birthday',
    description: 'Custom birthday lyrics that turn the party into a hip-hop concert.',
  },
  {
    id: 'pet-rap',
    title: 'Gold Chain Pet Rap',
    tag: 'Meme Rap Chopper',
    video: '/videos/showcase/generated/monster-bakery.mp4',
    badge: '🐶 Meme Rap',
    description: 'Fast chopper flow and head-bobbing swagger for pets and characters.',
  },
  {
    id: 'choreo-drill',
    title: 'Drill & Choreo Duet',
    tag: 'UK Drill / 808',
    video: '/videos/showcase/generated/airglide-remake.mp4',
    badge: '⚡ High Energy',
    description: 'Sharp choreography, synced head nods, and sliding 808 bass.',
  },
  {
    id: 'night-neon',
    title: 'Neon Street Session',
    tag: 'Boombap Freestyle',
    video: '/videos/showcase/generated/night-conservatory.mp4',
    badge: '🌃 Night Cypher',
    description: 'Late-night street cypher vibes with warm reflections and deep rhythm.',
  },
];

export function VideoMarquee({
  onSelectPrompt,
}: {
  onSelectPrompt?: (prompt: string, videoUrl: string) => void;
}) {
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);

  // Duplicate items for continuous seamless loop
  const displayClips = [...MARQUEE_CLIPS, ...MARQUEE_CLIPS];

  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-[#060a13] py-14 text-white sm:py-20">
      {/* Background Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-[48rem] rounded-full bg-amber-500/10 blur-[130px]"
      />

      <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-xs font-semibold text-amber-300">
          <Sparkles className="size-3.5" />
          <span>REAL AI DUO OUTPUTS</span>
        </div>

        <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-4xl">
          Every Stage, In Motion
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
          All clips started with one or two ordinary selfies. No filming, no recording — photos in, viral rap video out.
        </p>
      </div>

      {/* Marquee Track */}
      <div className="relative mt-8 w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] sm:mt-12">
        <div className="flex w-max animate-marquee-slow gap-5 px-4 hover:[animation-play-state:paused]">
          {displayClips.map((clip, idx) => {
            const isUnmuted = activeAudioId === `${clip.id}-${idx}`;

            return (
              <figure
                key={`${clip.id}-${idx}`}
                className="group relative flex w-60 shrink-0 cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f172a] shadow-lg transition-all duration-300 hover:border-amber-400/50 hover:shadow-[0_0_28px_rgba(251,191,36,0.2)] sm:w-72"
                onClick={() => {
                  if (onSelectPrompt) {
                    onSelectPrompt(clip.description, clip.video);
                  }
                }}
              >
                <div className="relative aspect-[9/16] w-full overflow-hidden bg-black">
                  <video
                    src={clip.video}
                    autoPlay
                    loop
                    muted={!isUnmuted}
                    playsInline
                    preload="metadata"
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Gradient Overlay */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#060a13] via-transparent to-black/30" />

                  {/* Top Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full border border-white/20 bg-black/60 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300 backdrop-blur-md">
                    <span>{clip.badge}</span>
                  </div>

                  {/* Sound Toggle Button */}
                  <button
                    type="button"
                    aria-label={isUnmuted ? 'Mute audio' : 'Unmute audio'}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveAudioId(isUnmuted ? null : `${clip.id}-${idx}`);
                    }}
                    className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition hover:bg-black/90 hover:scale-110"
                  >
                    {isUnmuted ? (
                      <Volume2 className="size-4 text-amber-300" />
                    ) : (
                      <VolumeX className="size-4 text-white/70" />
                    )}
                  </button>

                  {/* Quick Action Prompt Overlay */}
                  <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 rounded-xl border border-white/15 bg-black/75 p-2 backdrop-blur-md transition group-hover:border-amber-400/40">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white">
                        {clip.title}
                      </p>
                      <p className="truncate text-[10px] text-white/60">
                        {clip.tag}
                      </p>
                    </div>
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-amber-400 text-black text-xs font-bold transition group-hover:scale-110">
                      <Play className="size-3 fill-current ml-0.5" />
                    </span>
                  </div>
                </div>

                <figcaption className="p-3">
                  <p className="line-clamp-2 text-xs leading-relaxed text-white/70">
                    {clip.description}
                  </p>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-white/50">
        <span className="flex size-1.5 rounded-full bg-amber-400" />
        <span>Tap any video to copy style or preview beat · Works with any selfie</span>
      </div>
    </section>
  );
}
