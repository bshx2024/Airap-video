'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Flame,
  Gift,
  Loader2,
  Mic,
  Mic2,
  Music,
  Plus,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Upload,
  User,
  Users,
  Volume2,
  VolumeX,
  Wand2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { apiGet, apiPost } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  RAP_AVATAR_PRESETS,
  RAP_COST_CREDITS,
  RAP_STYLE_PRESETS,
  type RapAvatarPreset,
  type RapStylePreset,
} from '@/config/rap-presets';
import { QuickAuthModal } from '@/components/sites/root/QuickAuthModal';
import { MobileQrUploadModal } from './MobileQrUploadModal';
import { MobileVideoDownloadModal } from './MobileVideoDownloadModal';

export type StudioMode = 'duo' | 'group' | 'solo';

export interface OccasionChipItem {
  id: string;
  label: string;
  tag: string;
  title: string;
  desc: string;
  image: string;
  video?: string;
  prompt: string;
  styleId: string;
  lyrics: string;
}

const OCCASION_CHIPS: OccasionChipItem[] = [
  {
    id: 'hotel-lobby',
    label: '🔥 Hotel Lobby · Orange Studio',
    tag: 'Viral Duo Trend',
    title: 'Hotel Lobby · Migos Orange Studio Stage',
    desc: 'The viral Quavo & Takeoff "Hotel Lobby" aesthetic: 2 rappers trading punchy roast bars on a hanging mic, heavy 808 Trap beat, 9:16 vertical framing.',
    image: '/imgs/scenes/hotel-lobby-studio.jpg',
    video: 'https://pixanyoss.16781678.xyz/palix-ai.mp4',
    prompt:
      'Two rappers in an iconic bright orange studio with a single hanging microphone, inspired by Quavo and Takeoff Hotel Lobby, trading punchy roast bars, heavy 808 trap beat, rhythmic head nods, hip-hop hand gestures, 9:16 vertical TikTok style',
    styleId: 'trap-808',
    lyrics:
      '[Intro]\nYeah, check the mic in the orange room!\nTakeoff and Quavo vibe, let us get it!\n[Verse 1]\nYou always talking big but you showed up late\nI drop the heavy 808 to seal your fate\nLook at your drip, man, it expired in 08\nWe run the lobby while you hesitate\n[Chorus]\nHotel Lobby with the hanging mic swing\nHeavy 808s make the whole booth ring\nWho is the real king running this thing!',
  },
  {
    id: 'on-the-radar',
    label: '🟩 On The Radar · Green Booth',
    tag: 'UK Drill',
    title: 'On The Radar · Underground Cypher Stage',
    desc: 'The iconic NYC dark radio booth with neon green tube lighting, standing mic, sliding 808 drill bass, and aggressive hand gestures.',
    image: '/imgs/scenes/on-the-radar-booth.jpg',
    video: '/videos/showcase/generated/london-orb-remake.mp4',
    prompt:
      'A rapper inside the legendary On The Radar dark studio with neon green fluorescent tube lights and a standing microphone, intense aggressive UK drill freestyle, sharp sliding 808 bass, rapid rhythmic hand gestures and head nods, 9:16 vertical cinema',
    styleId: 'cyber-drill',
    lyrics:
      '[Intro]\n(Whisper) On The Radar, green lights on.\nCheck the mic, sliding bass drop.\n[Verse 1]\nStanding by the mic under neon green tube\nEvery sliding 808 breaking every old rule\nGot the rapid drill flow cutting through the dark night\nDouble rhyme scheme locked beneath the spotlight\n[Chorus]\nOn The Radar, watch the green glow flare\nSliding drill bass taking over everywhere!',
  },
  {
    id: 'friends-roast',
    label: '🥊 Friends Roast Battle',
    tag: 'Cypher Battle',
    title: 'Underground Cypher Roast Battle',
    desc: 'Two best friends roasting bar-for-bar in neon street alleyway, fast witty punchlines, crowd hype.',
    image: '/imgs/scenes/friends-roast-cypher.jpg',
    video: '/videos/showcase/generated/monster-commuter.mp4',
    prompt:
      'Two best friends roasting each other about always being late and ordering too much takeout, fast witty punchlines, underground cypher lighting, hyping crowd in background, 9:16 vertical TikTok style',
    styleId: 'boom-bap',
    lyrics:
      '[Intro]\nRound one, let us see who got the real bars!\n[Verse 1]\nYou order takeout five times a day\nSaying you on a diet, what a cliché\nI drop the boom bap while you still text delay\n[Chorus]\nBest friends roasting under underground lights\nTaking the mic and reaching new heights!',
  },
  {
    id: 'pet-rap',
    label: '🐶 Cute Pet Chopper Flow',
    tag: 'Meme Rap',
    title: 'Gold Chain Pet Rap Flow',
    desc: 'Cute pet wearing sunglasses and heavy chain spitting hypersonic chopper flow to bouncy trap drums.',
    image: '/imgs/scenes/cute-pet-rap.jpg',
    video: '/videos/showcase/generated/monster-bakery.mp4',
    prompt:
      'Cute cat wearing heavy gold chain and sunglasses, spitting fast chopper flow to upbeat trap drums, energetic head-bobbing, hilarious contrast with viral social media aesthetics',
    styleId: 'cyber-drill',
    lyrics:
      '[Intro]\nMeow meow, drop that hypersonic beat!\n[Verse 1]\nI run the living room, king of the floor\nScratching the couch while I wait by the door\nChopper flow rapid, supersonic claws\n[Chorus]\nGold chain kitten with a million views\nSpitting fast bars on the evening news!',
  },
  {
    id: 'birthday-hype',
    label: '🎂 Birthday Roast & Hype',
    tag: 'Party Hype',
    title: 'Birthday Concert Hype Stage',
    desc: 'Custom milestone birthday lyrics, golden studio setup, confetti, gold chains, and high-energy flow.',
    image: '/imgs/scenes/hotel-lobby-studio.jpg',
    video: '/videos/showcase/generated/glacier-titan.mp4',
    prompt:
      'Two friends celebrating a milestone birthday in a golden hip-hop studio, hilarious witty birthday roast verses, concert-level hype, confetti and gold chains, high-energy delivery',
    styleId: 'trap-808',
    lyrics:
      '[Intro]\nBlow out the candles, crank up the bass!\n[Verse 1]\nAnother year older, wrinkles on your face\nStill acting twenty-one all over the place\nGolden chains swinging, confetti in the air\n[Chorus]\nHappy birthday to the legendary clown\nTonight we taking over the whole town!',
  },
  {
    id: 'choreo-drill',
    label: '⚡ Choreo & Drill Dance',
    tag: 'High Energy',
    title: 'Drill & Choreo Duet Stage',
    desc: 'Full-body choreography, sharp beat-synced isolations, matching heavy UK drill sliding 808 bass.',
    image: '/imgs/scenes/on-the-radar-booth.jpg',
    video: '/videos/showcase/generated/airglide-remake.mp4',
    prompt:
      'Full-body hip-hop choreography and energetic dance moves, sharp isolations matching heavy UK drill sliding bass, expressive facial confidence, fluid dynamic motion with spotlight tracking',
    styleId: 'cyber-drill',
    lyrics:
      '[Intro]\nWatch the sliding bass, lock the frame!\n[Verse 1]\nStep to the left, sync to the snare\nSliding drill bass floating in the air\nSharp isolations, cameras locked in tight\n[Chorus]\nTwo rappers dancing under strobe light flare\nDrill choreography without compare!',
  },
  {
    id: 'neon-freestyle',
    label: '🌃 Neon Street Freestyle',
    tag: 'Cyberpunk Lo-Fi',
    title: 'Neon Street Session Stage',
    desc: 'Rain-slicked cyberpunk alley with neon reflections, handheld mic, relaxed head nods, chill boombap beat.',
    image: '/imgs/scenes/friends-roast-cypher.jpg',
    video: '/videos/showcase/generated/night-conservatory.mp4',
    prompt:
      'Solo rapper flowing effortlessly in a rain-slicked cyberpunk alley with neon reflections, handheld mic, relaxed head nods, vintage warm tube lighting, lo-fi boombap chill beat, 9:16 vertical cinema',
    styleId: 'melodic-rap',
    lyrics:
      '[Intro]\nRain dropping on the neon pavement...\n[Verse 1]\nReflections of cyan, echoes in the mist\nA handheld mic and a story in the fist\nMelodic rhythm floating through the street\n[Chorus]\nCity never sleeps, but the flow so deep\nMidnight verses that the memories keep.',
  },
];

const DEMO_DUO_PHOTOS = [
  {
    url: '/imgs/examples/hero/studio-portrait.webp',
    name: 'rapper-1-lead.webp',
  },
  {
    url: '/imgs/examples/hero/collectible-figurine.webp',
    name: 'rapper-2-hype.webp',
  },
];

export function AiRapHeroGenerator() {
  const { data: session } = useSession();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Credit balance query
  const creditsQuery = useQuery({
    queryKey: ['credits', 'balance', session?.user?.id],
    queryFn: () => apiGet<{ balance: number }>('/api/credits?summary=1'),
    enabled: Boolean(session?.user),
    staleTime: 10_000,
  });
  const balance = session?.user ? creditsQuery.data?.balance ?? 0 : null;

  // Studio Mode & Occasion States (Using chip.id for strict matching)
  const [studioMode, setStudioMode] = useState<StudioMode>('duo');
  const [activeChipId, setActiveChipId] = useState<string>(
    OCCASION_CHIPS[0].id
  );
  const [currentChip, setCurrentChip] = useState<OccasionChipItem>(
    OCCASION_CHIPS[0]
  );
  const [previewMuted, setPreviewMuted] = useState(true);

  // Portrait Photos (Duo mode supports two slots)
  const [photo1, setPhoto1] = useState<string>(
    RAP_AVATAR_PRESETS[0]?.imageUrl || DEMO_DUO_PHOTOS[0].url
  );
  const [photo1Name, setPhoto1Name] = useState<string>('rapper-1-lead.png');
  const [photo2, setPhoto2] = useState<string>(
    RAP_AVATAR_PRESETS[2]?.imageUrl || DEMO_DUO_PHOTOS[1].url
  );
  const [photo2Name, setPhoto2Name] = useState<string>('rapper-2-hype.png');

  // Rap Style & Directing Prompts
  const [selectedStyle, setSelectedStyle] = useState<RapStylePreset>(
    RAP_STYLE_PRESETS.find((s) => s.id === OCCASION_CHIPS[0].styleId) ||
      RAP_STYLE_PRESETS[0]
  );
  const [prompt, setPrompt] = useState(OCCASION_CHIPS[0].prompt);
  const [lyrics, setLyrics] = useState(OCCASION_CHIPS[0].lyrics);
  const [isLyricsExpanded, setIsLyricsExpanded] = useState(false);
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);

  // Video Ref for stage monitor
  const stageVideoRef = useRef<HTMLVideoElement | null>(null);

  // Task generation state
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskStatus, setTaskStatus] = useState<
    'idle' | 'processing' | 'success' | 'failed'
  >('idle');
  const [taskStage, setTaskStage] = useState<
    'lyrics' | 'music' | 'video' | 'completed' | 'failed'
  >('lyrics');
  const [taskProgress, setTaskProgress] = useState(0);
  const [stageMessage, setStageMessage] = useState('');
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [resultAudioUrl, setResultAudioUrl] = useState<string | null>(null);

  // File upload refs
  const fileInputRef1 = useRef<HTMLInputElement | null>(null);
  const fileInputRef2 = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Mobile QR Beam Upload modal
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrTargetSlot, setQrTargetSlot] = useState<1 | 2>(1);

  // Mobile QR Video Download modal
  const [downloadQrOpen, setDownloadQrOpen] = useState(false);

  const handleOpenQrModal = (slot: 1 | 2) => {
    toast.info(`📱 Opening QR Code for ${slot === 1 ? 'Rapper 1' : 'Rapper 2'}...`);
    setQrTargetSlot(slot);
    setQrModalOpen(true);
  };

  const handleQrUploadSuccess = (imageUrl: string, fileName?: string) => {
    if (qrTargetSlot === 1) {
      setPhoto1(imageUrl);
      if (fileName) setPhoto1Name(fileName);
    } else {
      setPhoto2(imageUrl);
      if (fileName) setPhoto2Name(fileName);
    }
  };

  // Poll task status
  useEffect(() => {
    if (!taskId || taskStatus !== 'processing') return;

    let timer: NodeJS.Timeout;
    const checkTask = async () => {
      try {
        const res = await apiGet<any>(`/api/ai/task?taskId=${taskId}`);
        if (res) {
          const info = res.taskInfo || {};
          setTaskProgress(info.progress || 25);
          if (info.stageMessage) {
            setStageMessage(info.stageMessage);
          }
          if (info.stage) {
            setTaskStage(info.stage);
          }

          if (res.taskStatus === 'success' || res.status === 'success') {
            setTaskStatus('success');
            setTaskStage('completed');
            setTaskProgress(100);
            const vid =
              info.videoUrl ||
              res.videoUrl ||
              res.taskResult?.videoUrl ||
              'https://pixanyoss.16781678.xyz/palix-ai.mp4';
            setResultVideoUrl(vid);
            setResultAudioUrl(info.audioUrl || res.audioUrl || null);
            creditsQuery.refetch();
            toast.success('🎉 AI Rap MV direct complete!');
            return;
          } else if (res.taskStatus === 'failed' || res.status === 'failed') {
            setTaskStatus('failed');
            toast.error(info.error || 'Generation failed. Credits refunded automatically.');
            creditsQuery.refetch();
            return;
          }
        }
      } catch (err) {
        console.warn('Poll rap task error:', err);
      }
      timer = setTimeout(checkTask, 3000);
    };

    timer = setTimeout(checkTask, 2000);
    return () => clearTimeout(timer);
  }, [taskId, taskStatus]);

  // Handle Occasion Chip Switch (With immediate state sync and toast)
  const handleApplyChip = (chip: OccasionChipItem) => {
    setActiveChipId(chip.id);
    setCurrentChip(chip);
    setPrompt(chip.prompt);
    setLyrics(chip.lyrics);
    const matched = RAP_STYLE_PRESETS.find((s) => s.id === chip.styleId);
    if (matched) {
      setSelectedStyle(matched);
    }
    toast.success(`Scene Loaded: ${chip.title}`);
  };

  // Load sample duo photos
  const handleLoadDemo = () => {
    setPhoto1(DEMO_DUO_PHOTOS[0].url);
    setPhoto1Name(DEMO_DUO_PHOTOS[0].name);
    setPhoto2(DEMO_DUO_PHOTOS[1].url);
    setPhoto2Name(DEMO_DUO_PHOTOS[1].name);
    toast.success('Duo Cypher demo photos loaded! Ready to direct.');
  };

  // Swap Lead & Hype roles
  const handleSwapRoles = () => {
    const tempP = photo1;
    const tempN = photo1Name;
    setPhoto1(photo2);
    setPhoto1Name(photo2Name);
    setPhoto2(tempP);
    setPhoto2Name(tempN);
    toast.success('Roles swapped! Lead MC and Hype Rapper exchanged.');
  };

  // Local image upload handler
  const handleLocalUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    slot: 1 | 2
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image too large. Please upload an image under 10MB.');
      return;
    }
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (slot === 1) {
        setPhoto1(reader.result as string);
        setPhoto1Name(file.name);
      } else {
        setPhoto2(reader.result as string);
        setPhoto2Name(file.name);
      }
      setIsUploading(false);
      toast.success(`Rapper ${slot} photo ready`);
    };
    reader.onerror = () => {
      setIsUploading(false);
      toast.error('Failed to read photo file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  // AI Lyrics Generator (DeepSeek)
  const handleGenerateLyrics = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a rap topic or story premise');
      return;
    }
    setIsGeneratingLyrics(true);
    try {
      const res = await apiPost<any>('/api/ai/rap/lyrics', {
        topic: prompt.trim(),
        styleId: selectedStyle.id,
      });
      if (res && res.lyrics) {
        setLyrics(res.lyrics);
        setIsLyricsExpanded(true);
        toast.success('✨ Multi-syllable rhyming lyrics crafted!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to craft lyrics. Please retry.');
    } finally {
      setIsGeneratingLyrics(false);
    }
  };

  // Start Generation
  const handleStartGeneration = async () => {
    if (!session?.user) {
      setShowAuthModal(true);
      return;
    }
    if (balance != null && balance < RAP_COST_CREDITS) {
      toast.error(
        `Insufficient credits. This generation requires ${RAP_COST_CREDITS} credits. Current balance: ${balance}`
      );
      return;
    }

    const currentPhotos =
      studioMode === 'duo'
        ? [photo1, photo2].filter(Boolean)
        : [photo1].filter(Boolean);

    if (currentPhotos.length === 0) {
      toast.error('Please upload or select at least one portrait photo.');
      return;
    }

    setIsSubmitting(true);
    setTaskStatus('processing');
    setTaskStage('lyrics');
    setTaskProgress(15);
    setStageMessage('Starting multi-model pipeline: composing lyrics and 808 flow...');
    setResultVideoUrl(null);

    try {
      const res = await apiPost<{ id: string; taskId: string }>(
        '/api/ai/rap/generate',
        {
          imageUrl: currentPhotos[0],
          imageUrls: currentPhotos,
          studioMode,
          prompt: prompt.trim() || currentChip.prompt,
          videoPrompt: currentChip.prompt,
          scenarioId: selectedChip,
          styleId: selectedStyle.id,
          customLyrics: lyrics.trim(),
        }
      );

      if (res?.taskId || res?.id) {
        const id = res.taskId || res.id;
        setTaskId(id);
        toast.success('🚀 AI Rap Video generation dispatched!');
      } else {
        throw new Error('No task ID returned.');
      }
    } catch (err: any) {
      setTaskStatus('failed');
      toast.error(err.message || 'Failed to dispatch generation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-7xl px-3 py-6 sm:px-6 lg:px-8">
      {/* Hidden file upload inputs */}
      <input
        ref={fileInputRef1}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleLocalUpload(e, 1)}
      />
      <input
        ref={fileInputRef2}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleLocalUpload(e, 2)}
      />

      {/* Top Header Banner */}
      <div className="mx-auto max-w-4xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.2)] backdrop-blur-md">
          <Flame className="size-4 animate-pulse text-amber-400" />
          <span>Full-Stack Pipeline: AI Lyrics ➔ Suno 808 Rap Beats ➔ Lip-Sync & Motion ➔ 4K Output</span>
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
          AI Rap Video:{' '}
          <span className="bg-gradient-to-r from-amber-400 via-rose-500 to-purple-500 bg-clip-text text-transparent">
            Create Viral TikTok & Migos Rap Trends
          </span>
        </h1>
        <p className="mt-3 text-sm text-slate-300 sm:text-base lg:text-lg">
          Turn photos into an authentic AI rap video in seconds. Zero drifting lips, synchronized 808 trap beats, multisyllabic rhyme schemes, and full hip-hop body swag delivery.
        </p>
      </div>

      {/* Studio Workbench */}
      <div className="mt-8 rounded-3xl border border-white/12 bg-[#0d1527]/95 p-3.5 shadow-[0_24px_80px_rgba(2,6,23,0.65)] backdrop-blur-2xl transition-all duration-200 hover:border-amber-400/20 sm:p-5">
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_390px] 2xl:grid-cols-[1fr_420px]">
          {/* Left Column: Directing & Inputs */}
          <div className="flex flex-col justify-between min-w-0">
            {/* 1. Mode Selector Tabs */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.06] p-1">
                <button
                  type="button"
                  onClick={() => setStudioMode('duo')}
                  className={cn(
                    'flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                    studioMode === 'duo'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Mic className="size-3.5" />
                  <span>Duo Cypher (2 Photos)</span>
                  <span className="hidden rounded-full bg-slate-900/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-950 sm:inline-block">
                    Viral
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStudioMode('group')}
                  className={cn(
                    'flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                    studioMode === 'group'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Users className="size-3.5" />
                  <span>Group Photo (1 Photo)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStudioMode('solo')}
                  className={cn(
                    'flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                    studioMode === 'solo'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <User className="size-3.5" />
                  <span>Solo / Pet MC</span>
                </button>
              </div>

              {/* Quick Sample Photos Loader */}
              <button
                type="button"
                onClick={handleLoadDemo}
                className="flex cursor-pointer items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-300/90 transition-colors hover:bg-amber-400/20 hover:text-amber-200"
              >
                <Sparkles className="size-3 text-amber-400" />
                <span>Try Duo Demo Photos</span>
              </button>
            </div>

            {/* 2. Visual Staging Roles (Duo mode = Slot 1 + Swap + Slot 2) */}
            {studioMode === 'duo' ? (
              <div className="mb-4">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  {/* Slot 1: Rapper 1 (Leads) */}
                  <div className="relative rounded-2xl border border-amber-400/25 bg-amber-500/[0.04] p-3 transition hover:border-amber-400/40">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="flex size-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-slate-950">
                          1
                        </span>
                        <span className="text-xs font-bold tracking-wide text-amber-300 uppercase">
                          Rapper 1 · Lead MC
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-amber-300/70">
                        Verse 1 & Hook
                      </span>
                    </div>

                    {photo1 ? (
                      <div className="relative flex items-center gap-2.5 rounded-xl border border-white/15 bg-slate-900/80 p-2">
                        <img
                          src={photo1}
                          alt="Rapper 1"
                          width={56}
                          height={56}
                          loading="lazy"
                          className="size-14 rounded-lg object-cover ring-1 ring-amber-400/40"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-white/90">
                            {photo1Name}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => fileInputRef1.current?.click()}
                              className="cursor-pointer text-[11px] font-semibold text-amber-400 hover:text-amber-300"
                            >
                              Change Photo
                            </button>
                            <span className="text-white/20">·</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleOpenQrModal(1);
                              }}
                              className="flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-amber-300/90 transition hover:text-amber-200"
                            >
                              <Smartphone className="size-3 text-amber-400" />
                              <span>From Phone</span>
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label="Remove Rapper 1"
                          onClick={() => setPhoto1('')}
                          className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-16 w-full items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef1.current?.click()}
                          disabled={isUploading}
                          className="flex h-full flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-amber-400/30 bg-white/[0.02] text-center transition hover:border-amber-400/60 hover:bg-amber-400/[0.04]"
                        >
                          <div className="flex items-center gap-1 text-xs font-medium text-amber-200">
                            <Upload className="size-3" />
                            <span>PC Upload</span>
                          </div>
                          <span className="text-[9px] text-white/40">Local file</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleOpenQrModal(1);
                          }}
                          className="flex h-full flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border border-amber-400/40 bg-amber-500/10 text-center transition hover:border-amber-400 hover:bg-amber-500/20 active:scale-98"
                        >
                          <div className="flex items-center gap-1 text-xs font-bold text-amber-300">
                            <Smartphone className="size-3.5 text-amber-400" />
                            <span>From Phone</span>
                          </div>
                          <span className="text-[9px] text-amber-200/70">Scan QR Code</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Center Swap Action */}
                  <div className="flex items-center justify-center py-1 sm:py-0">
                    <button
                      type="button"
                      onClick={handleSwapRoles}
                      title="Swap Lead & Hype roles"
                      className="group flex size-9 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-lg transition hover:scale-110 hover:border-amber-400 hover:bg-amber-500 hover:text-slate-950"
                    >
                      <ArrowLeftRight className="size-4 duration-300 transition group-hover:rotate-180" />
                    </button>
                  </div>

                  {/* Slot 2: Rapper 2 (Hypes) */}
                  <div className="relative rounded-2xl border border-fuchsia-400/25 bg-fuchsia-500/[0.04] p-3 transition hover:border-fuchsia-400/40">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="flex size-5 items-center justify-center rounded-full bg-fuchsia-400 text-[10px] font-black text-slate-950">
                          2
                        </span>
                        <span className="text-xs font-bold tracking-wide text-fuchsia-300 uppercase">
                          Rapper 2 · Hype / Roast
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-fuchsia-300/70">
                        Roast & Backing Vocals
                      </span>
                    </div>

                    {photo2 ? (
                      <div className="relative flex items-center gap-2.5 rounded-xl border border-white/15 bg-slate-900/80 p-2">
                        <img
                          src={photo2}
                          alt="Rapper 2"
                          width={56}
                          height={56}
                          loading="lazy"
                          className="size-14 rounded-lg object-cover ring-1 ring-fuchsia-400/40"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-white/90">
                            {photo2Name}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => fileInputRef2.current?.click()}
                              className="cursor-pointer text-[11px] font-semibold text-fuchsia-400 hover:text-fuchsia-300"
                            >
                              Change Photo
                            </button>
                            <span className="text-white/20">·</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleOpenQrModal(2);
                              }}
                              className="flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-fuchsia-300/90 transition hover:text-fuchsia-200"
                            >
                              <Smartphone className="size-3 text-fuchsia-400" />
                              <span>From Phone</span>
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label="Remove Rapper 2"
                          onClick={() => setPhoto2('')}
                          className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-16 w-full items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef2.current?.click()}
                          disabled={isUploading}
                          className="flex h-full flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-fuchsia-400/30 bg-white/[0.02] text-center transition hover:border-fuchsia-400/60 hover:bg-fuchsia-400/[0.04]"
                        >
                          <div className="flex items-center gap-1 text-xs font-medium text-fuchsia-200">
                            <Upload className="size-3" />
                            <span>PC Upload</span>
                          </div>
                          <span className="text-[9px] text-white/40">Local file</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleOpenQrModal(2);
                          }}
                          className="flex h-full flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/10 text-center transition hover:border-fuchsia-400 hover:bg-fuchsia-500/20 active:scale-98"
                        >
                          <div className="flex items-center gap-1 text-xs font-bold text-fuchsia-300">
                            <Smartphone className="size-3.5 text-fuchsia-400" />
                            <span>From Phone</span>
                          </div>
                          <span className="text-[9px] text-fuchsia-200/70">Scan QR Code</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Single Photo Mode (Group or Solo) */
              <div className="mb-4">
                <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-3.5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wide text-amber-300 uppercase">
                      {studioMode === 'group'
                        ? '👥 Group Photo (AI auto-separates and tracks faces)'
                        : '⚡ Solo MC / Pet Rap Showcase'}
                    </span>
                    <span className="text-[10px] text-white/50">
                      {studioMode === 'group'
                        ? '1 photo creates multi-voice rap cypher'
                        : 'High-energy solo vertical rap delivery'}
                    </span>
                  </div>

                  {photo1 ? (
                    <div className="relative flex items-center gap-3 rounded-xl border border-white/15 bg-slate-900/80 p-2.5">
                      <img
                        src={photo1}
                        alt="Uploaded photo"
                        width={64}
                        height={64}
                        loading="lazy"
                        className="size-16 rounded-lg object-cover ring-1 ring-amber-400/40"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-white/90">
                          {photo1Name}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef1.current?.click()}
                            className="cursor-pointer text-[11px] font-semibold text-amber-400 hover:text-amber-300"
                          >
                            Change Photo
                          </button>
                          <span className="text-white/20">·</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleOpenQrModal(1);
                            }}
                            className="flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-amber-300/90 transition hover:text-amber-200"
                          >
                            <Smartphone className="size-3 text-amber-400" />
                            <span>From Phone</span>
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        aria-label="Remove photo"
                        onClick={() => setPhoto1('')}
                        className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-20 w-full items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef1.current?.click()}
                        disabled={isUploading}
                        className="flex h-full flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-400/30 bg-white/[0.02] text-center transition hover:border-amber-400/60 hover:bg-amber-400/[0.04]"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-medium text-amber-200">
                          <Upload className="size-4" />
                          <span>PC Upload</span>
                        </div>
                        <span className="mt-0.5 text-[10px] text-white/45">
                          Select from computer file
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleOpenQrModal(1);
                        }}
                        className="flex h-full flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border border-amber-400/40 bg-amber-500/10 text-center transition hover:border-amber-400 hover:bg-amber-500/20 active:scale-98"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                          <Smartphone className="size-4 text-amber-400" />
                          <span>From Phone (QR)</span>
                        </div>
                        <span className="mt-0.5 text-[10px] text-amber-200/70">
                          Scan with phone camera
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Choose Preset Artist */}
            <div className="mb-3.5 flex items-center gap-2 overflow-x-auto pb-1 text-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className="shrink-0 text-[11px] font-semibold text-white/60">
                Or pick a preset artist:
              </span>
              {RAP_AVATAR_PRESETS.map((avatar) => (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => {
                    setPhoto1(avatar.imageUrl);
                    setPhoto1Name(`${avatar.name}.png`);
                  }}
                  className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] py-0.5 pr-2.5 pl-1 transition hover:border-amber-400/40 hover:bg-white/10 active:scale-95"
                >
                  <img
                    src={avatar.imageUrl}
                    alt={avatar.name}
                    width={20}
                    height={20}
                    loading="lazy"
                    className="size-5 rounded-full object-cover"
                  />
                  <span className="text-[11px] text-white/80">
                    {avatar.name}
                  </span>
                </button>
              ))}
            </div>

            {/* 3. Occasion / Vibe Selector Chips (All Viral Trends Visible & Wrapped) */}
            <div className="mb-3.5 flex flex-wrap items-center gap-2 text-xs">
              <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold tracking-wider text-amber-400 uppercase">
                <Flame className="size-3" />
                Trending Scenarios:
              </span>
              {OCCASION_CHIPS.map((chip) => {
                const isSelected = activeChipId === chip.id;
                return (
                  <button
                    key={chip.id}
                    id={`chip-${chip.id}`}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleApplyChip(chip);
                    }}
                    className={cn(
                      'shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95',
                      isSelected
                        ? 'border-amber-400 bg-amber-400/25 text-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.35)] ring-1 ring-amber-400/50'
                        : 'border-white/10 bg-white/5 text-white/75 hover:border-white/30 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* 4. Rap Flow Style & BPM (5 Classic Styles) */}
            <div className="mb-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                {RAP_STYLE_PRESETS.map((style) => {
                  const isSelected = selectedStyle.id === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setSelectedStyle(style)}
                      className={cn(
                        'flex cursor-pointer flex-col items-start rounded-xl border p-2 text-left transition-all active:scale-98',
                        isSelected
                          ? 'border-amber-400 bg-amber-500/15 shadow-[0_0_12px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/40'
                          : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]'
                      )}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="truncate text-xs font-bold text-white">
                          {style.name}
                        </span>
                        <span className="rounded bg-black/40 px-1 py-0.2 text-[9px] font-semibold text-amber-300">
                          {style.bpm} BPM
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-400">
                        {style.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Director Prompt & AI Lyrics Generator */}
            <div className="mb-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-white/80">
                  Director Prompt & Story Hooks:
                </span>
                <button
                  type="button"
                  onClick={handleGenerateLyrics}
                  disabled={isGeneratingLyrics}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/15 px-2.5 py-0.5 text-xs font-semibold text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)] transition hover:bg-purple-500/25 active:scale-95 disabled:opacity-50"
                >
                  <Sparkles
                    className={cn(
                      'size-3.5',
                      isGeneratingLyrics && 'animate-spin'
                    )}
                  />
                  <span>
                    {isGeneratingLyrics ? 'Composing Double Rhymes...' : '✨ AI Lyrics Studio'}
                  </span>
                </button>
              </div>

              <textarea
                rows={2}
                maxLength={2000}
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  setActiveChipId('');
                }}
                placeholder="Direct your rap scene, roast jokes between friends, inside stories, visual props..."
                className="max-h-24 min-h-16 w-full resize-none rounded-xl border border-white/10 bg-slate-950/70 p-2.5 text-xs text-white placeholder-white/35 focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/50"
              />
            </div>

            {/* 6. Collapsible Rhyming Lyrics Editor */}
            <div className="mb-4 rounded-xl border border-white/10 bg-black/30 p-2.5">
              <button
                type="button"
                onClick={() => setIsLyricsExpanded(!isLyricsExpanded)}
                className="flex w-full cursor-pointer items-center justify-between text-xs font-semibold text-slate-300 hover:text-white"
              >
                <div className="flex items-center gap-2">
                  <Music className="size-3.5 text-amber-400" />
                  <span>Rhymes & Flow Structure (Fully Editable)</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-amber-400">
                  <span>{isLyricsExpanded ? 'Collapse' : 'Expand & Fine-tune'}</span>
                  {isLyricsExpanded ? (
                    <ChevronUp className="size-3.5" />
                  ) : (
                    <ChevronDown className="size-3.5" />
                  )}
                </div>
              </button>

              {isLyricsExpanded && (
                <div className="mt-2.5">
                  <textarea
                    rows={6}
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    placeholder="[Verse 1]&#10;Lead bars...&#10;[Chorus]&#10;Catchy hook..."
                    className="w-full rounded-lg border border-white/10 bg-black/60 p-2.5 font-mono text-xs leading-relaxed text-amber-200/90 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* 7. Action CTA Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleStartGeneration}
                disabled={isSubmitting || taskStatus === 'processing'}
                className="group relative flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 px-6 text-sm font-bold text-white shadow-[0_0_30px_rgba(245,158,11,0.35)] transition-all hover:opacity-95 hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {taskStatus === 'processing' ? (
                  <>
                    <Loader2 className="size-4 animate-spin text-white" />
                    <span>Directing Rap MV ({taskProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="size-4 animate-pulse" />
                    <span>
                      {session?.user
                        ? `Direct Rap MV (${RAP_COST_CREDITS} Credits)`
                        : `Direct Rap MV (Get Free Signup Credits)`}
                    </span>
                  </>
                )}
              </button>
              <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-slate-400">
                <span>Est. time: ~45–90s · 9:16 Ultra HD Output</span>
                <span>
                  Credit Balance:{' '}
                  <strong className="text-amber-300">
                    {balance != null ? balance : 'Not Logged In'}
                  </strong>
                </span>
              </div>
            </div>
          </div>
          {/* End of Left Column */}

          {/* Right Column: 9:16 Studio Stage Monitor */}
          <div className="flex flex-col min-w-0">
            <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#060a14] p-3 shadow-2xl">
              {/* Monitor Top Status Bar */}
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="flex size-2 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-[10px] font-bold tracking-widest text-white/90 uppercase">
                    Studio Stage Monitor
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full border border-amber-400/25 bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    {currentChip.tag}
                  </span>
                  <button
                    type="button"
                    aria-label={previewMuted ? 'Unmute Audio' : 'Mute Audio'}
                    title={previewMuted ? 'Unmute Audio' : 'Mute Audio'}
                    onClick={() => setPreviewMuted(!previewMuted)}
                    className="flex size-7 cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/80 transition hover:bg-white/15 hover:text-white"
                  >
                    {previewMuted ? (
                      <VolumeX className="size-3.5" />
                    ) : (
                      <Volume2 className="size-3.5 text-amber-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* 9:16 Vertical Screen Area */}
              <div className="group/stage relative flex min-h-[380px] flex-1 w-full flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-black shadow-inner">
                {/* State 1: Generation Complete (Play Finished MV) */}
                {taskStatus === 'success' && resultVideoUrl ? (
                  <div className="relative flex size-full flex-col justify-between bg-black">
                    <video
                      src={resultVideoUrl}
                      controls
                      autoPlay
                      loop
                      className="size-full object-contain"
                    />
                    <div className="absolute inset-x-3 bottom-3 flex flex-col gap-2 rounded-xl border border-white/15 bg-black/90 p-3 backdrop-blur-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white">
                            🎉 Rap MV Directed Successfully!
                          </p>
                          <p className="text-[10px] text-amber-300">
                            {selectedStyle.name} ({selectedStyle.bpm} BPM)
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDownloadQrOpen(true)}
                            className="flex cursor-pointer items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-500/20 px-2.5 py-1.5 text-xs font-bold text-amber-300 shadow-sm transition hover:bg-amber-500/30 active:scale-98"
                            title="手机扫码下载保存到相册"
                          >
                            <QrCode className="size-3.5 text-amber-400" />
                            <span>手机扫码下载</span>
                          </button>
                          <a
                            href={resultVideoUrl}
                            download="ai-rap-video.mp4"
                            target="_blank"
                            rel="noreferrer"
                            className="flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
                          >
                            <Download className="size-3.5" />
                            <span>电脑下载</span>
                          </a>
                        </div>
                      </div>

                      {resultAudioUrl && (
                        <div className="flex items-center justify-between border-t border-white/10 pt-1.5 text-[10px] text-slate-300">
                          <span className="flex items-center gap-1">
                            <Volume2 className="size-3 text-amber-400" />
                            <span>808 Audio Track MP3</span>
                          </span>
                          <a
                            href={resultAudioUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-amber-400 hover:underline"
                          >
                            Listen / Download
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ) : taskStatus === 'processing' ? (
                  /* State 2: Processing Live Stepper */
                  <div className="flex size-full flex-col justify-between bg-slate-950/95 p-4 text-left">
                    <div>
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                          <Loader2 className="size-3.5 animate-spin" />
                          <span>Pipeline Executing</span>
                        </span>
                        <span className="font-mono text-sm font-black text-amber-400">
                          {taskProgress}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 via-rose-500 to-purple-500 transition-all duration-500"
                          style={{ width: `${taskProgress}%` }}
                        />
                      </div>

                      <p className="mt-2 text-[11px] font-medium text-amber-200">
                        {stageMessage || 'Orchestrating multi-model pipeline...'}
                      </p>

                      {/* 4 Steps */}
                      <div className="mt-4 flex flex-col gap-2">
                        {/* Step 1 */}
                        <div
                          className={cn(
                            'flex items-center gap-2.5 rounded-lg border p-2 text-xs transition-all',
                            taskProgress >= 20
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                              : 'border-white/10 bg-white/[0.02] text-white/50'
                          )}
                        >
                          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
                          <div className="min-w-0">
                            <p className="font-bold">Step 1: Visual Context & Rhyme Writing</p>
                            <p className="truncate text-[10px] opacity-75">
                              DeepSeek writes cadence & double rhymes
                            </p>
                          </div>
                        </div>

                        {/* Step 2 */}
                        <div
                          className={cn(
                            'flex items-center gap-2.5 rounded-lg border p-2 text-xs transition-all',
                            taskStage === 'music'
                              ? 'border-amber-400 bg-amber-500/15 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                              : taskProgress > 50
                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                                : 'border-white/10 bg-white/[0.02] text-white/50'
                          )}
                        >
                          <Music
                            className={cn(
                              'size-3.5 shrink-0',
                              taskStage === 'music' &&
                                'animate-bounce text-amber-400'
                            )}
                          />
                          <div className="min-w-0">
                            <p className="font-bold">Step 2: Suno 808 Beat & Vocals</p>
                            <p className="truncate text-[10px] opacity-75">
                              808 bass, hi-hat rolls & rap vocals
                            </p>
                          </div>
                        </div>

                        {/* Step 3 */}
                        <div
                          className={cn(
                            'flex items-center gap-2.5 rounded-lg border p-2 text-xs transition-all',
                            taskStage === 'video'
                              ? 'border-rose-400 bg-rose-500/15 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                              : taskProgress >= 95
                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                                : 'border-white/10 bg-white/[0.02] text-white/50'
                          )}
                        >
                          <Mic2
                            className={cn(
                              'size-3.5 shrink-0',
                              taskStage === 'video' &&
                                'animate-pulse text-rose-400'
                            )}
                          />
                          <div className="min-w-0">
                            <p className="font-bold">Step 3: Lip-Sync & Motion Directing</p>
                            <p className="truncate text-[10px] opacity-75">
                              Audio features drive facial micro-delivery
                            </p>
                          </div>
                        </div>

                        {/* Step 4 */}
                        <div
                          className={cn(
                            'flex items-center gap-2.5 rounded-lg border p-2 text-xs transition-all',
                            taskStage === 'completed'
                              ? 'border-purple-400 bg-purple-500/15 text-purple-200'
                              : 'border-white/10 bg-white/[0.02] text-white/50'
                          )}
                        >
                          <Sparkles className="size-3.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-bold">Step 4: Stream Mastering & Final MV</p>
                            <p className="truncate text-[10px] opacity-75">
                              High-bitrate render & audio multiplexing
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-amber-300/80">
                      <RefreshCw className="size-3 animate-spin" />
                      <span>Cloud rendering in progress... You may keep page open</span>
                    </div>
                  </div>
                ) : (
                  /* State 3: Default Idle (Live Authentic 9:16 Scene Visualizer) */
                  <div className="relative size-full overflow-hidden bg-slate-950">
                    <img
                      key={currentChip.id}
                      src={currentChip.image}
                      alt={currentChip.title}
                      width={420}
                      height={746}
                      loading="lazy"
                      className="size-full object-cover transition-all duration-700 ease-out group-hover/stage:scale-105"
                    />

                    {/* Stage Lighting & Vignette Overlay */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-black/30" />

                    {/* Animated Equalizer / Beat Wave overlay */}
                    <div className="pointer-events-none absolute bottom-28 left-4 flex items-end gap-1">
                      <span className="h-6 w-1 rounded-full bg-amber-400 animate-pulse" />
                      <span className="h-9 w-1 rounded-full bg-amber-400 animate-pulse delay-75" />
                      <span className="h-5 w-1 rounded-full bg-amber-300 animate-pulse delay-150" />
                      <span className="h-8 w-1 rounded-full bg-amber-400 animate-pulse delay-200" />
                      <span className="h-4 w-1 rounded-full bg-amber-200 animate-pulse delay-100" />
                    </div>

                    {/* Top Floating Badge */}
                    <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-amber-300 backdrop-blur-md shadow-md">
                      <Sparkles className="size-3 text-amber-400" />
                      <span>{currentChip.tag || '9:16 Authentic Output'}</span>
                    </div>

                    {/* Bottom HUD Information */}
                    <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-xl border border-white/15 bg-black/85 p-2.5 backdrop-blur-md shadow-lg">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-xs font-bold text-white">
                          {currentChip.title}
                        </p>
                        <span className="rounded border border-amber-500/30 bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300">
                          ACTIVE
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-white/70">
                        {currentChip.desc}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between border-t border-white/10 pt-1.5 text-[9px] text-amber-300/80">
                        <span>Photos in → Viral Rap Video out</span>
                        <span className="font-mono text-white/40">1080P · 9:16</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Monitor Footer Hint */}
              <p className="mt-2 text-center text-[10px] text-white/45">
                Click any scenario chip on the left to switch studio stage & beat
              </p>
            </div>
          </div>
          {/* End of Right Column */}
        </div>
      </div>

      {/* Trust & De-Risking Guarantee Footer */}
      <div className="mt-4 grid grid-cols-2 gap-2 px-1 text-xs sm:grid-cols-4 sm:gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-white/70">
          <Gift className="size-3.5 shrink-0 text-amber-400" />
          <span className="truncate text-[11px] font-medium">100 Free Credits on Signup</span>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-white/70">
          <ShieldCheck className="size-3.5 shrink-0 text-emerald-400" />
          <span className="truncate text-[11px] font-medium">100% Refund on Error</span>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-white/70">
          <Clock className="size-3.5 shrink-0 text-blue-400" />
          <span className="truncate text-[11px] font-medium">~60s Fast Cloud Pipeline</span>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-white/70">
          <Sparkles className="size-3.5 shrink-0 text-purple-400" />
          <span className="truncate text-[11px] font-medium">100% Encrypted & Private</span>
        </div>
      </div>

      {qrModalOpen && (
        <MobileQrUploadModal
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          slot={qrTargetSlot}
          roleName={
            studioMode === 'duo'
              ? qrTargetSlot === 1
                ? 'Rapper 1 (Lead MC)'
                : 'Rapper 2 (Hype MC)'
              : 'Solo / Group MC'
          }
          onSuccess={handleQrUploadSuccess}
        />
      )}

      {showAuthModal && (
        <QuickAuthModal
          open={showAuthModal}
          onOpenChange={setShowAuthModal}
        />
      )}

      {downloadQrOpen && (
        <MobileVideoDownloadModal
          isOpen={downloadQrOpen}
          onClose={() => setDownloadQrOpen(false)}
          videoUrl={resultVideoUrl || ''}
          title={`${selectedStyle.name} Rap MV`}
          filename="ai-rap-video.mp4"
        />
      )}
    </div>
  );
}
