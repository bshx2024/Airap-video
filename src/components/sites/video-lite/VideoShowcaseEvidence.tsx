'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  Flame,
  Layers,
  Mic,
  Music,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Video,
  Volume2,
  VolumeX,
  Wand2,
} from 'lucide-react';

import { cn } from '@/lib/utils';

interface CaseStudyItem {
  id: string;
  tag: string;
  tabTitle: string;
  badge: string;
  headline: string;
  description: string;
  inputPhoto1: {
    url: string;
    label: string;
    desc: string;
  };
  inputPhoto2?: {
    url: string;
    label: string;
    desc: string;
  };
  userInputPrompt: {
    topic: string;
    lyricsPrompt: string;
  };
  videoSrc: string;
  videoCaption: string;
  specs: {
    photoCount: string;
    mode: string;
    musicStyle: string;
    duration: string;
    resolution: string;
    credits: string;
    audioFeatures: string;
    videoModel: string;
    waitTime: string;
  };
}

const CASE_STUDIES: CaseStudyItem[] = [
  {
    id: 'orange-studio-battle',
    tag: 'Duo Battle',
    tabTitle: '🎤 Case 1: Orange Studio Cypher',
    badge: 'Real Production · 2 Selfies to Rap Battle',
    headline: 'Two Selfies to Orange Studio Rap Battle',
    description:
      'Two selfies transformed into an alternating orange studio rap battle with hanging mic and 808 trap beat.',
    inputPhoto1: {
      url: '/imgs/showcase/selfie-input-1.jpg',
      label: 'Input Photo 1',
      desc: 'Selfie (Person 1, indoor)',
    },
    inputPhoto2: {
      url: '/imgs/showcase/selfie-input-2.jpg',
      label: 'Input Photo 2',
      desc: 'Selfie (Person 2, outdoor)',
    },
    userInputPrompt: {
      topic: 'Orange Studio Rap Battle',
      lyricsPrompt:
        'Two rappers in an orange booth trading roast bars on a hanging mic, 808 sub-bass, 9:16 battle flow',
    },
    videoSrc: '/videos/hotellobby15.mp4?v=2',
    videoCaption: 'Generated Video — Orange Studio Rap Cypher',
    specs: {
      photoCount: '2 Selfies',
      mode: 'Duo Cypher (2 Photos)',
      musicStyle: '808 Trap Rap (140 BPM)',
      duration: '15 seconds',
      resolution: '1080P Full HD (9:16)',
      credits: '360 Credits',
      audioFeatures: 'Alternating Rhymes',
      videoModel: 'Kling 4.0 Studio',
      waitTime: '~50s',
    },
  },
  {
    id: 'friends-roast-battle',
    tag: 'Boom Bap',
    tabTitle: '🥊 Case 2: Friends Roast Cypher',
    badge: 'Bar-For-Bar Punchlines',
    headline: 'Two Friends into an Underground Cypher',
    description:
      'Two friends transformed into an underground cypher trading roast bars over 90s boom bap drums.',
    inputPhoto1: {
      url: '/imgs/showcase/friends-input-1.jpg',
      label: 'Input Photo 1',
      desc: 'Friend portrait (Daylight)',
    },
    inputPhoto2: {
      url: '/imgs/showcase/friends-input-2.jpg',
      label: 'Input Photo 2',
      desc: 'Friend selfie (Casual)',
    },
    userInputPrompt: {
      topic: 'Friends Roast Cypher · 90s Boom Bap Flow',
      lyricsPrompt:
        'Two best friends roasting each other about being late and ordering takeout, fast witty punchlines, underground cypher lighting',
    },
    videoSrc: '/videos/friendsroast15_vertical.mp4',
    videoCaption: 'Generated Video — Underground Cypher',
    specs: {
      photoCount: '2 Camera Roll Selfies',
      mode: 'Duo Cypher Roast Battle',
      musicStyle: '90s Boom Bap (92 BPM)',
      duration: '15 seconds',
      resolution: '1080P Full HD (9:16)',
      credits: '360 Credits',
      audioFeatures: 'Turn-Taking Vocals & Crowd Hype',
      videoModel: 'Kling 4.0 Studio',
      waitTime: '~50 seconds',
    },
  },
  {
    id: 'pet-rap-flow',
    tag: 'Pet MC',
    tabTitle: '🐶 Case 3: Pet MC Gold Chain Chopper',
    badge: 'Viral Meme Rap',
    headline: 'One Pet Photo to Hypersonic Chopper Flow',
    description:
      'A living room pet photo styled with gold chains and sunglasses, spitting fast chopper flow to bouncy trap drums.',
    inputPhoto1: {
      url: '/imgs/showcase/pet-input.jpg',
      label: 'Input Photo 1',
      desc: 'Domestic pet photo',
    },
    userInputPrompt: {
      topic: 'Pet MC Gold Chain Meme Rap · Chopper Flow',
      lyricsPrompt:
        'Cute domestic cat wearing heavy gold chain and sunglasses, spitting fast chopper flow to upbeat trap drums, energetic head-bobbing',
    },
    videoSrc: '/videos/cutepet15_vertical.mp4',
    videoCaption: 'Generated Video — Pet MC Chopper Rap',
    specs: {
      photoCount: '1 Photo (Single Pet / Solo Avatar)',
      mode: 'Solo / Pet MC Mode',
      musicStyle: 'Chopper Flow Trap (155 BPM)',
      duration: '10 seconds',
      resolution: '1080P Full HD (9:16)',
      credits: '160 Credits',
      audioFeatures: 'Double-Time Rap Cadence',
      videoModel: 'Wan 2.6 Flash / Kling 4.0',
      waitTime: '~35 seconds',
    },
  },
  {
    id: 'drill-choreo-stage',
    tag: 'Brooklyn Drill',
    tabTitle: '⚡ Case 4: Brooklyn Drill Stage (Duo)',
    badge: 'Heavy 808 Glides',
    headline: 'Two Photos into Brooklyn Drill Stage Cypher',
    description:
      'Two portrait photos placed in a dark booth, executing drill footwork glides and stage movement over sliding 808 bass.',
    inputPhoto1: {
      url: '/imgs/showcase/selfie-input-1.jpg',
      label: 'Input Photo 1',
      desc: 'Portrait selfie',
    },
    inputPhoto2: {
      url: '/imgs/showcase/selfie-input-2.jpg',
      label: 'Input Photo 2',
      desc: 'Portrait selfie',
    },
    userInputPrompt: {
      topic: 'Dark Studio Drill Stage · Sliding 808 Bass Drops',
      lyricsPrompt:
        'Two rappers in dark studio booth with green neon lights, aggressive drill freestyle, sliding 808 bass, rhythmic hand gestures',
    },
    videoSrc: '/videos/drill15_vertical.mp4',
    videoCaption: 'Generated Video — Brooklyn Drill Cypher',
    specs: {
      photoCount: '2 Photos',
      mode: 'Duo Drill Performance',
      musicStyle: 'Brooklyn Drill (142 BPM)',
      duration: '15 seconds',
      resolution: '1080P Full HD (9:16)',
      credits: '360 Credits',
      audioFeatures: 'Bass Drop Sync & Drill Ad-Libs',
      videoModel: 'Seedance 2.5 Pro / Kling 4.0',
      waitTime: '~50 seconds',
    },
  },
];

export function VideoShowcaseEvidence() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(
    CASE_STUDIES[0].id
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(15);

  const activeCase =
    CASE_STUDIES.find((c) => c.id === selectedCaseId) || CASE_STUDIES[0];
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Switch video when case changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [selectedCaseId]);

  // Video time update handler
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      const dur = videoRef.current.duration || 15;
      setCurrentTime(cur);
      setDuration(dur);
      setProgress((cur / dur) * 100);
    }
  };

  // Play / Pause toggle
  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  // Mute / Unmute toggle
  const handleToggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Seek bar click
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const pct = clickX / width;
    const newTime = pct * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress(pct * 100);
  };

  return (
    <section
      id="showcase-evidence"
      className="relative overflow-hidden bg-[#040815] px-4 py-20 text-white sm:px-6 sm:py-28"
    >
      {/* Background ambient lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/4 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[140px]"
      />

      <div className="relative mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300 backdrop-blur-md">
            <Flame className="size-3.5 text-amber-400" />
            <span>Verified Production Showcases</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Real Production Examples & Verified Specs
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
            Verified production pipeline: raw photos, prompt, playable 1080P
            video with audio, specs, and credits.
          </p>
        </div>

        {/* Case Switcher Tabs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {CASE_STUDIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCaseId(c.id)}
              className={cn(
                'cursor-pointer rounded-full px-4 py-2 text-xs font-bold transition-all sm:text-sm',
                selectedCaseId === c.id
                  ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white shadow-lg ring-2 shadow-amber-500/25 ring-amber-400/40'
                  : 'border border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:bg-white/10 hover:text-white'
              )}
            >
              {c.tabTitle}
            </button>
          ))}
        </div>

        {/* Main Showcase Container */}
        <div className="mt-12 overflow-hidden rounded-3xl border border-white/12 bg-[#090e1c]/95 p-5 shadow-[0_24px_80px_rgba(2,6,23,0.7)] backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Left Column: Visual Pipeline (Input Photos -> User Prompt -> Generated Video) */}
            <div className="flex flex-col items-center lg:col-span-7">
              {/* Headline */}
              <div className="mb-6 w-full text-left">
                <div className="inline-flex items-center gap-2 rounded-md bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300">
                  <CheckCircle2 className="size-3.5 text-amber-400" />
                  <span>{activeCase.badge}</span>
                </div>
                <h3 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                  {activeCase.headline}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-300 sm:text-sm">
                  {activeCase.description}
                </p>
              </div>

              {/* 1. Input Photos Row (Element 1) */}
              <div className="w-full">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-bold tracking-wider text-amber-300 uppercase">
                    Step 1: Raw Input Photo(s)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {activeCase.specs.photoCount}
                  </span>
                </div>

                <div
                  className={cn(
                    'grid gap-3 sm:gap-4',
                    activeCase.inputPhoto2
                      ? 'grid-cols-2'
                      : 'mx-auto max-w-[280px] grid-cols-1'
                  )}
                >
                  {/* Photo 1 Card */}
                  <div className="group overflow-hidden rounded-2xl border border-amber-400/40 bg-slate-950 p-2 shadow-lg transition-all hover:border-amber-400">
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-900">
                      <img
                        src={activeCase.inputPhoto1.url}
                        alt={activeCase.inputPhoto1.label}
                        width={320}
                        height={426}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <span className="absolute top-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-md">
                        {activeCase.inputPhoto1.label}
                      </span>
                    </div>
                    <div className="mt-2 px-1 text-center">
                      <span className="block text-xs font-bold text-white">
                        {activeCase.inputPhoto1.label}
                      </span>
                      <span className="line-clamp-1 text-[10px] text-slate-400">
                        {activeCase.inputPhoto1.desc}
                      </span>
                    </div>
                  </div>

                  {/* Photo 2 Card (if duo) */}
                  {activeCase.inputPhoto2 && (
                    <div className="group overflow-hidden rounded-2xl border border-rose-400/40 bg-slate-950 p-2 shadow-lg transition-all hover:border-rose-400">
                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-900">
                        <img
                          src={activeCase.inputPhoto2.url}
                          alt={activeCase.inputPhoto2.label}
                          width={320}
                          height={426}
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <span className="absolute top-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-rose-300 backdrop-blur-md">
                          {activeCase.inputPhoto2.label}
                        </span>
                      </div>
                      <div className="mt-2 px-1 text-center">
                        <span className="block text-xs font-bold text-white">
                          {activeCase.inputPhoto2.label}
                        </span>
                        <span className="line-clamp-1 text-[10px] text-slate-400">
                          {activeCase.inputPhoto2.desc}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. User Input Prompt & Topic (Element 2) */}
              <div className="mt-4 w-full rounded-2xl border border-amber-400/25 bg-amber-400/[0.04] p-3.5 shadow-md">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-bold tracking-wider text-amber-300 uppercase">
                    <Wand2 className="size-3.5 text-amber-400" />
                    <span>Step 2: User Input Prompt & Topic</span>
                  </span>
                  <span className="rounded border border-amber-400/20 bg-amber-400/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                    Verified User Input
                  </span>
                </div>
                <p className="text-xs font-bold text-white">
                  {activeCase.userInputPrompt.topic}
                </p>
                <p className="mt-1 rounded-lg border border-white/5 bg-black/45 p-2.5 font-mono text-[11px] leading-relaxed text-slate-300 italic">
                  &ldquo;{activeCase.userInputPrompt.lyricsPrompt}&rdquo;
                </p>
              </div>

              {/* Down Arrow Transition */}
              <div className="my-4 flex flex-col items-center">
                <div className="flex size-9 animate-bounce items-center justify-center rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-400 shadow-md">
                  <ArrowDown className="size-4.5" />
                </div>
                <span className="mt-1 text-[11px] font-bold tracking-widest text-amber-300 uppercase">
                  AI Rap Performance Synthesis
                </span>
              </div>

              {/* 3. Embedded Real Generated Video (Element 3) */}
              <div className="w-full">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-bold text-white">
                    Step 3: {activeCase.videoCaption}
                  </span>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    Playable 1080P Video with Sound
                  </span>
                </div>

                <div className="relative mx-auto aspect-[9/16] max-w-[340px] overflow-hidden rounded-2xl border-2 border-amber-500/40 bg-black shadow-2xl sm:max-w-[360px]">
                  {/* Real HTML5 Video */}
                  <video
                    ref={videoRef}
                    key={activeCase.videoSrc}
                    src={activeCase.videoSrc}
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    onTimeUpdate={handleTimeUpdate}
                    className="size-full object-cover"
                  />

                  {/* Gradient Overlay for controls */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />

                  {/* Top Bar: Scene Badge + Sound Toggle */}
                  <div className="absolute inset-x-3 top-3 flex items-center justify-between">
                    <span className="rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-[11px] font-bold text-amber-300 backdrop-blur-md">
                      {activeCase.specs.mode.split('(')[0]}
                    </span>

                    <button
                      type="button"
                      onClick={handleToggleMute}
                      className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-black/70 text-white backdrop-blur-md transition hover:scale-110 hover:border-amber-400 active:scale-95"
                      aria-label={
                        isMuted ? 'Unmute Rap Audio' : 'Mute Rap Audio'
                      }
                      title={isMuted ? 'Click to Unmute Audio' : 'Mute Audio'}
                    >
                      {isMuted ? (
                        <VolumeX className="size-4 text-white/70" />
                      ) : (
                        <Volume2 className="size-4 animate-pulse text-amber-400" />
                      )}
                    </button>
                  </div>

                  {/* Center Play/Pause Overlay Button */}
                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    className="group absolute inset-0 flex cursor-pointer items-center justify-center"
                    aria-label={isPlaying ? 'Pause Video' : 'Play Video'}
                  >
                    {!isPlaying && (
                      <div className="flex size-14 items-center justify-center rounded-full bg-amber-500/90 text-slate-950 shadow-2xl transition-transform group-hover:scale-110">
                        <Play className="ml-1 size-7 fill-current" />
                      </div>
                    )}
                  </button>

                  {/* Bottom Interactive Control Bar */}
                  <div className="absolute inset-x-3 bottom-3 rounded-xl border border-white/10 bg-black/75 p-2.5 backdrop-blur-md">
                    {/* Scrub Progress Bar */}
                    <div
                      onClick={handleSeek}
                      className="group/bar relative mb-2 h-1.5 w-full cursor-pointer rounded-full bg-white/20 transition-all hover:h-2.5"
                    >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleTogglePlay}
                          className="cursor-pointer font-bold text-amber-300 hover:text-white"
                        >
                          {isPlaying ? (
                            <Pause className="size-3.5" />
                          ) : (
                            <Play className="size-3.5 fill-current" />
                          )}
                        </button>
                        <span className="font-mono text-white/80">
                          {Math.floor(currentTime)}s / {Math.floor(duration)}s
                        </span>
                      </div>

                      <span className="text-[10px] font-bold text-amber-300">
                        {isMuted
                          ? '🔇 Click unmute for audio'
                          : '🔊 44.1kHz Audio Track ON'}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="mt-2 text-center text-xs text-slate-400">
                  Playable output: Complete video with sound and lip-sync
                  articulation.
                </p>
              </div>
            </div>

            {/* Right Column: Complete Verified Technical Specifications (Elements 4, 5, 6) */}
            <div className="flex flex-col justify-between lg:col-span-5">
              <div>
                <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                  <ShieldCheck className="size-5 text-amber-400" />
                  <h4 className="text-base font-bold tracking-wider text-white uppercase">
                    Verified Generation Specifications
                  </h4>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Verifiable system parameters, credit consumption, and output
                  standards:
                </p>

                {/* The 7 Detailed Spec Rows */}
                <div className="mt-5 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs">
                  {/* 1. Input Photos */}
                  <div className="flex items-start justify-between py-2.5">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-400">
                      <Users className="size-3.5 text-amber-400" />
                      <span>Photos:</span>
                    </span>
                    <strong className="max-w-[55%] text-right font-bold text-white">
                      {activeCase.specs.photoCount}
                    </strong>
                  </div>

                  {/* 2. Mode */}
                  <div className="flex items-start justify-between py-2.5">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-400">
                      <Mic className="size-3.5 text-amber-400" />
                      <span>Mode:</span>
                    </span>
                    <strong className="max-w-[55%] text-right font-bold text-amber-300">
                      {activeCase.specs.mode}
                    </strong>
                  </div>

                  {/* 3. Music Style */}
                  <div className="flex items-start justify-between py-2.5">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-400">
                      <Music className="size-3.5 text-amber-400" />
                      <span>Beat:</span>
                    </span>
                    <strong className="max-w-[55%] text-right font-bold text-white">
                      {activeCase.specs.musicStyle}
                    </strong>
                  </div>

                  {/* 4. Duration */}
                  <div className="flex items-start justify-between py-2.5">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-400">
                      <Clock className="size-3.5 text-amber-400" />
                      <span>Duration:</span>
                    </span>
                    <strong className="max-w-[55%] text-right font-bold text-white">
                      {activeCase.specs.duration}
                    </strong>
                  </div>

                  {/* 5. Resolution */}
                  <div className="flex items-start justify-between py-2.5">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-400">
                      <Video className="size-3.5 text-amber-400" />
                      <span>Resolution:</span>
                    </span>
                    <strong className="max-w-[55%] text-right font-bold text-cyan-300">
                      {activeCase.specs.resolution}
                    </strong>
                  </div>

                  {/* 6. Credits */}
                  <div className="flex items-start justify-between py-2.5">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-400">
                      <Coins className="size-3.5 text-amber-400" />
                      <span>Credits:</span>
                    </span>
                    <strong className="max-w-[55%] text-right text-sm font-black text-amber-400">
                      ⚡ {activeCase.specs.credits}
                    </strong>
                  </div>

                  {/* 7. Vocal Features */}
                  <div className="flex items-start justify-between py-2.5">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-400">
                      <Layers className="size-3.5 text-amber-400" />
                      <span>Vocal Track:</span>
                    </span>
                    <strong className="max-w-[55%] text-right font-bold text-emerald-300">
                      {activeCase.specs.audioFeatures}
                    </strong>
                  </div>

                  {/* 8. AI Model */}
                  <div className="flex items-start justify-between py-2.5">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-400">
                      <Cpu className="size-3.5 text-amber-400" />
                      <span>Model & Time:</span>
                    </span>
                    <div className="max-w-[55%] text-right">
                      <strong className="block font-bold text-cyan-300">
                        {activeCase.specs.videoModel}
                      </strong>
                      <span className="font-mono text-[11px] text-amber-300/90">
                        ⏱️ {activeCase.specs.waitTime}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Call to Action direct to generator */}
              <div className="mt-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-purple-500/10 p-5 backdrop-blur-md">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h5 className="text-sm font-bold text-white">
                      Ready to Make Your Rap Battle?
                    </h5>
                    <p className="mt-1 text-xs text-slate-300">
                      Upload two photos and hear your rap cypher in ~50s.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const el =
                        document.getElementById('studio-generator') ||
                        document.getElementById('generator');
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="shrink-0 cursor-pointer rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                  >
                    Create My Rap Battle ➔
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
