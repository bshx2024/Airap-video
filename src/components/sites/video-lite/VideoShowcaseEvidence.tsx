'use client';

import React, { useRef, useState, useEffect } from 'react';
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
  Play,
  Pause,
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
  videoSrc: string;
  videoCaption: string;
  // Exact required 7 metrics from user specification
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
    id: 'migos-orange-studio',
    tag: 'Flagship Duo Cypher',
    tabTitle: '🎤 Case 1: Migos Orange Studio (Duo Battle)',
    badge: 'Real Production Generation · 2 Selfies to Rap Battle',
    headline: 'Real Example: Two Selfies to One Rap Battle',
    description:
      'Two separate individual selfies taken at different times and locations with casual lighting, transformed into an alternating Migos-style orange studio rap cypher with swinging condenser microphone and 808 trap sub-bass.',
    inputPhoto1: {
      url: '/imgs/showcase/selfie-input-1.jpg',
      label: 'Input Photo 1',
      desc: 'Selfie portrait (Individual 1, indoor room)',
    },
    inputPhoto2: {
      url: '/imgs/showcase/selfie-input-2.jpg',
      label: 'Input Photo 2',
      desc: 'Selfie portrait (Individual 2, natural daylight)',
    },
    videoSrc: '/videos/hotellobby15.mp4?v=2',
    videoCaption: 'Generated Video — Migos-Style Orange Studio',
    specs: {
      photoCount: '2 Photos (Separate Individual Selfies)',
      mode: 'Duo Cypher (2 Photos Rap Battle · Default Mode)',
      musicStyle: 'Migos Trap 808 (140 BPM, Triplet Flow, Heavy Sub-Bass)',
      duration: '15 seconds (Full Verse & Chorus)',
      resolution: '1080P Full HD (1080×1920 Vertical 9:16)',
      credits: '360 Credits (Transparent Pricing · Zero Hidden Cost)',
      audioFeatures: 'Dual-Vocal AI Alternating Rhymes with 44.1kHz Stereo Master',
      videoModel: 'Kling 4.0 Studio (Cinema Multi-Character Lip-Sync)',
      waitTime: '~45–65 seconds (Instant Cloud Rendering)',
    },
  },
  {
    id: 'friends-roast-battle',
    tag: 'Boom Bap Roast',
    tabTitle: '🥊 Case 2: Friends Cypher Roast Battle',
    badge: 'Bar-For-Bar Punchlines · Social Banter',
    headline: 'Real Example: Two Friends into an Underground Cypher',
    description:
      'Two candid smartphone snapshots of friends roasting each other over hilarious everyday inside jokes, delivered with authentic boom bap head-bobs and underground neon lighting.',
    inputPhoto1: {
      url: '/imgs/showcase/friends-input-1.jpg',
      label: 'Input Photo 1',
      desc: 'Candid friend portrait (Street daylight)',
    },
    inputPhoto2: {
      url: '/imgs/showcase/friends-input-2.jpg',
      label: 'Input Photo 2',
      desc: 'Candid friend selfie (Urban casual)',
    },
    videoSrc: '/videos/friendsroast15_vertical.mp4',
    videoCaption: 'Generated Video — Underground Cypher Roast Battle',
    specs: {
      photoCount: '2 Photos (Camera Roll Candid Selfies)',
      mode: 'Duo Cypher (Underground Roast Battle)',
      musicStyle: '90s Boom Bap (92 BPM, Vinyl Scratches, Snappy Snares)',
      duration: '15 seconds (Turn-based Roast Bars)',
      resolution: '1080P Full HD (1080×1920 Vertical 9:16)',
      credits: '360 Credits (15s Standard Duo Battle)',
      audioFeatures: 'Dynamic Turn-Taking Vocal Cadence & Crowd Hype Sync',
      videoModel: 'Kling 4.0 Studio (Facial Expression Realism)',
      waitTime: '~50 seconds',
    },
  },
  {
    id: 'pet-rap-flow',
    tag: 'Pet MC Chopper',
    tabTitle: '🐶 Case 3: Pet MC Gold Chain Chopper',
    badge: 'Viral Meme Rap · 1 Photo Animation',
    headline: 'Real Example: One Pet Photo to Hypersonic Chopper Flow',
    description:
      'A single casual living room cat photo automatically styled with thick gold chains and sunglasses, spitting hypersonic chopper flow to energetic bouncy trap drums.',
    inputPhoto1: {
      url: '/imgs/showcase/pet-input.jpg',
      label: 'Input Photo 1',
      desc: 'Living room domestic pet photo (Natural room light)',
    },
    videoSrc: '/videos/cutepet15_vertical.mp4',
    videoCaption: 'Generated Video — Pet MC Gold Chain Chopper Rap',
    specs: {
      photoCount: '1 Photo (Single Pet / Solo Avatar)',
      mode: 'Solo / Pet MC Mode (1 Photo Discounted)',
      musicStyle: 'Chopper Flow Trap (155 BPM, Fast Double-Time Drums)',
      duration: '10 seconds (High-Energy Viral Clip)',
      resolution: '1080P Full HD (1080×1920 Vertical 9:16)',
      credits: '160 Credits (Solo Mode 0.67x Base)',
      audioFeatures: 'High-Speed Vocal Phoneme-to-Viseme Lip Sync Animation',
      videoModel: 'Wan 2.6 Flash (Fast Motion Animation)',
      waitTime: '~30 seconds',
    },
  },
  {
    id: 'drill-choreo-stage',
    tag: 'Brooklyn Drill',
    tabTitle: '⚡ Case 4: Pop Smoke Woo Walk Drill',
    badge: 'Heavy 808 Glides · Stage Dynamics',
    headline: 'Real Example: Two Photos into Pop Smoke Style Drill Stage',
    description:
      'Two portrait photos placed in an On-The-Radar style studio booth, executing effortless Pop Smoke "Woo Walk" footwork glides and energetic stage movement over sliding 808 sub-bass.',
    inputPhoto1: {
      url: '/imgs/showcase/selfie-input-1.jpg',
      label: 'Input Photo 1',
      desc: 'Front-facing portrait selfie',
    },
    inputPhoto2: {
      url: '/imgs/showcase/selfie-input-2.jpg',
      label: 'Input Photo 2',
      desc: 'Front-facing portrait selfie',
    },
    videoSrc: '/videos/drill15_vertical.mp4',
    videoCaption: 'Generated Video — Pop Smoke Woo Walk Drill Stage',
    specs: {
      photoCount: '2 Photos (Full-Body / Portrait Selfies)',
      mode: 'Duo Cypher (Choreography & Drill Battle)',
      musicStyle: 'Brooklyn Drill (142 BPM, Sliding 808 Sub-Bass, Hi-Hat Rolls)',
      duration: '15 seconds (Choreographed Dance & Rap Flow)',
      resolution: '1080P Full HD (1080×1920 Vertical 9:16)',
      credits: '360 Credits (15s Duo Performance)',
      audioFeatures: 'Synchronized Bass Drop Gestures & Vocal Drill Ad-Libs',
      videoModel: 'Seedance 2.5 Pro (Extreme Motion & Body Glide Dynamics)',
      waitTime: '~60 seconds',
    },
  },
];

export function VideoShowcaseEvidence() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(CASE_STUDIES[0].id);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(15);

  const activeCase = CASE_STUDIES.find((c) => c.id === selectedCaseId) || CASE_STUDIES[0];
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Switch video when case changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [selectedCaseId]);

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleToggleMute = () => {
    if (!videoRef.current) return;
    const next = !videoRef.current.muted;
    videoRef.current.muted = next;
    setIsMuted(next);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 15;
    setCurrentTime(cur);
    setDuration(dur);
    setProgress((cur / dur) * 100);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = clickRatio * (videoRef.current.duration || 15);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleScrollToGenerator = () => {
    const el = document.getElementById('studio-generator');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="showcase-evidence"
      className="relative overflow-hidden bg-[#060a15] px-4 py-20 text-white transition-colors sm:px-6 sm:py-28"
    >
      {/* Background Ambient Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-amber-500/10 blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-rose-500/10 blur-[130px]"
      />

      <div className="relative mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300 backdrop-blur-md">
            <Sparkles className="size-3.5 text-amber-400" />
            <span>Product Evidence · Real Input-to-Output Demonstration</span>
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            See Exactly What Two Photos Create
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
            Verifiable real generation case studies demonstrating the complete relationship between uploaded selfie photos and final rap battle videos — with full specs, credit consumption, and playable video.
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
                  ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white shadow-lg shadow-amber-500/25 ring-2 ring-amber-400/40'
                  : 'border border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:bg-white/10 hover:text-white'
              )}
            >
              {c.tabTitle}
            </button>
          ))}
        </div>

        {/* Main Showcase Container (Exact Screenshot Layout) */}
        <div className="mt-12 overflow-hidden rounded-3xl border border-white/12 bg-[#090e1c]/95 p-5 shadow-[0_24px_80px_rgba(2,6,23,0.7)] backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Left Column: Visual Pipeline (Input Photos -> Down Arrow -> Generated Video) */}
            <div className="lg:col-span-7 flex flex-col items-center">
              {/* Headline */}
              <div className="w-full text-left mb-6">
                <div className="inline-flex items-center gap-2 rounded-md bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300">
                  <CheckCircle2 className="size-3.5 text-amber-400" />
                  <span>{activeCase.badge}</span>
                </div>
                <h3 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                  {activeCase.headline}
                </h3>
                <p className="mt-1.5 text-xs text-slate-300 sm:text-sm leading-relaxed">
                  {activeCase.description}
                </p>
              </div>

              {/* 1. Input Photos Row (Matching Screenshot) */}
              <div className="w-full">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-bold uppercase tracking-wider text-amber-300">
                    Step 1: Raw Input Photo(s)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {activeCase.specs.photoCount}
                  </span>
                </div>

                <div
                  className={cn(
                    'grid gap-3 sm:gap-4',
                    activeCase.inputPhoto2 ? 'grid-cols-2' : 'grid-cols-1 max-w-[280px] mx-auto'
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
                      <span className="text-xs font-bold text-white block">
                        {activeCase.inputPhoto1.label}
                      </span>
                      <span className="text-[10px] text-slate-400 line-clamp-1">
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
                        <span className="text-xs font-bold text-white block">
                          {activeCase.inputPhoto2.label}
                        </span>
                        <span className="text-[10px] text-slate-400 line-clamp-1">
                          {activeCase.inputPhoto2.desc}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Down Arrow Transition (Matching Screenshot) */}
              <div className="my-4 flex flex-col items-center">
                <div className="flex size-9 items-center justify-center rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-400 shadow-md animate-bounce">
                  <ArrowDown className="size-4.5" />
                </div>
                <span className="mt-1 text-[11px] font-bold text-amber-300 uppercase tracking-widest">
                  AI Rap Performance Synthesis
                </span>
              </div>

              {/* 2. Embedded Real Generated Video (Matching Screenshot) */}
              <div className="w-full">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-bold text-white">
                    {activeCase.videoCaption}
                  </span>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    Real Generated Video · Embedded
                  </span>
                </div>

                <div className="relative mx-auto aspect-[9/16] max-w-[340px] sm:max-w-[360px] overflow-hidden rounded-2xl border-2 border-amber-500/40 bg-black shadow-2xl">
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
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between">
                    <span className="rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-[11px] font-bold text-amber-300 backdrop-blur-md">
                      {activeCase.specs.mode.split('(')[0]}
                    </span>

                    <button
                      type="button"
                      onClick={handleToggleMute}
                      className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-black/70 text-white backdrop-blur-md transition hover:scale-110 hover:border-amber-400 active:scale-95"
                      aria-label={isMuted ? 'Unmute Rap Audio' : 'Mute Rap Audio'}
                      title={isMuted ? 'Click to Unmute Audio' : 'Mute Audio'}
                    >
                      {isMuted ? (
                        <VolumeX className="size-4 text-white/70" />
                      ) : (
                        <Volume2 className="size-4 text-amber-400 animate-pulse" />
                      )}
                    </button>
                  </div>

                  {/* Center Play/Pause Overlay Button */}
                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    className="absolute inset-0 flex items-center justify-center cursor-pointer group"
                    aria-label={isPlaying ? 'Pause Video' : 'Play Video'}
                  >
                    {!isPlaying && (
                      <div className="flex size-14 items-center justify-center rounded-full bg-amber-500/90 text-slate-950 shadow-2xl transition-transform group-hover:scale-110">
                        <Play className="size-7 fill-current ml-1" />
                      </div>
                    )}
                  </button>

                  {/* Bottom Interactive Control Bar */}
                  <div className="absolute bottom-3 inset-x-3 rounded-xl border border-white/10 bg-black/75 p-2.5 backdrop-blur-md">
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

                      <span className="text-[10px] text-amber-300 font-bold">
                        {isMuted ? '🔇 Click unmute for 808 audio' : '🔊 Studio 808 Audio ON'}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="mt-2 text-center text-xs text-slate-400">
                  真实渲染生成视频，支持完整播放、声音切换与实时对口型检查。
                </p>
              </div>
            </div>

            {/* Right Column: Complete Verified Technical Specifications (All 7 Metrics Required) */}
            <div className="lg:col-span-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                  <ShieldCheck className="size-5 text-amber-400" />
                  <h4 className="text-base font-bold text-white uppercase tracking-wider">
                    Verified Generation Specifications (技术参数清单)
                  </h4>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Each case is bound to verifiable system parameters, credit consumption, and output standards:
                </p>

                {/* The 7 Detailed Spec Rows Required by User */}
                <div className="mt-5 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs">
                  {/* 1. 输入照片数量 */}
                  <div className="flex items-start justify-between py-2.5">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-400">
                      <Users className="size-3.5 text-amber-400" />
                      <span>输入照片数量 (Input Photos):</span>
                    </span>
                    <strong className="text-right font-bold text-white max-w-[55%]">
                      {activeCase.specs.photoCount}
                    </strong>
                  </div>

                  {/* 2. 生成模式 */}
                  <div className="flex items-start justify-between py-2.5">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-400">
                      <Mic className="size-3.5 text-amber-400" />
                      <span>生成模式 (Mode):</span>
                    </span>
                    <strong className="text-right font-bold text-amber-300 max-w-[55%]">
                      {activeCase.specs.mode}
                    </strong>
                  </div>

                  {/* 3. 音乐风格 */}
                  <div className="flex items-start justify-between py-2.5">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-400">
                      <Music className="size-3.5 text-amber-400" />
                      <span>音乐风格 (Music Beat):</span>
                    </span>
                    <strong className="text-right font-bold text-white max-w-[55%]">
                      {activeCase.specs.musicStyle}
                    </strong>
                  </div>

                  {/* 4. 实际生成时长 */}
                  <div className="flex items-start justify-between py-2.5">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-400">
                      <Clock className="size-3.5 text-amber-400" />
                      <span>实际生成时长 (Duration):</span>
                    </span>
                    <strong className="text-right font-bold text-white max-w-[55%]">
                      {activeCase.specs.duration}
                    </strong>
                  </div>

                  {/* 5. 输出分辨率 */}
                  <div className="flex items-start justify-between py-2.5">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-400">
                      <Video className="size-3.5 text-amber-400" />
                      <span>输出分辨率 (Resolution):</span>
                    </span>
                    <strong className="text-right font-bold text-cyan-300 max-w-[55%]">
                      {activeCase.specs.resolution}
                    </strong>
                  </div>

                  {/* 6. 消耗积分 */}
                  <div className="flex items-start justify-between py-2.5">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-400">
                      <Coins className="size-3.5 text-amber-400" />
                      <span>消耗积分 (Credits Used):</span>
                    </span>
                    <strong className="text-right font-black text-amber-400 text-sm max-w-[55%]">
                      ⚡ {activeCase.specs.credits}
                    </strong>
                  </div>

                  {/* 7. 完整视频播放与音画对齐 */}
                  <div className="flex items-start justify-between py-2.5">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-400">
                      <Layers className="size-3.5 text-amber-400" />
                      <span>完整视频播放 (Playback):</span>
                    </span>
                    <strong className="text-right font-bold text-emerald-300 max-w-[55%]">
                      {activeCase.specs.audioFeatures}
                    </strong>
                  </div>

                  {/* 8. 视频引擎与等待时间 */}
                  <div className="flex items-start justify-between py-2.5">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-400">
                      <Cpu className="size-3.5 text-amber-400" />
                      <span>AI 模型与耗时:</span>
                    </span>
                    <strong className="text-right font-bold text-white max-w-[55%]">
                      {activeCase.specs.videoModel} ({activeCase.specs.waitTime})
                    </strong>
                  </div>
                </div>
              </div>

              {/* Call to Action: Recreate this case */}
              <div className="mt-8 rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-purple-500/10 to-transparent p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-300">
                    Ready to create your own battle?
                  </span>
                  <span className="text-[10px] font-semibold text-white/60">
                    Free signup bonus included
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleScrollToGenerator}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 py-3 px-4 text-xs font-bold text-white shadow-lg shadow-amber-500/25 transition-all hover:opacity-95 hover:shadow-xl active:scale-98 sm:text-sm"
                >
                  <Wand2 className="size-4" />
                  <span>Replicate This Battle in Studio Generator</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
