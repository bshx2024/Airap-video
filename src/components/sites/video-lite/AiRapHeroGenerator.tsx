'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  FileVideo,
  Film,
  Flame,
  Gift,
  Loader2,
  Mic,
  Mic2,
  Music,
  Play,
  Plus,
  QrCode,
  Radio,
  RefreshCw,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
  Upload,
  User,
  Users,
  Video,
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
  RAP_DURATION_OPTIONS,
  RAP_MODEL_OPTIONS,
  RAP_STYLE_PRESETS,
  getRapCostCredits,
  getRapEstimatedWaitTime,
  getRapResolution,
  type RapAvatarPreset,
  type RapModelId,
  type RapModelOption,
  type RapStylePreset,
} from '@/config/rap-presets';
import { QuickAuthModal } from '@/components/sites/root/QuickAuthModal';
import { MobileQrUploadModal } from './MobileQrUploadModal';
import { MobileVideoDownloadModal } from './MobileVideoDownloadModal';
import { extractAudioFromVideoFile } from '@/lib/audio-extract';

export type StudioMode = 'duo' | 'group' | 'solo' | 'mimic';

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
    desc: 'The viral Quavo & Takeoff "Hotel Lobby" aesthetic: 2 rappers trading punchy roast bars on a hanging mic, heavy 808 Trap beat, vertical video framing.',
    image: '/imgs/scenes/hotel-lobby-studio.jpg',
    video: '/videos/showcase/duo-generated-demo.mp4',
    prompt:
      'Two rappers in an iconic bright orange studio with a single hanging microphone, inspired by Quavo and Takeoff Hotel Lobby, trading punchy roast bars, heavy 808 trap beat, rhythmic head nods, hip-hop hand gestures, viral rap music video style',
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
    video: '/videos/ontheradar15_vertical.mp4',
    prompt:
      'A rapper inside the legendary On The Radar dark studio with neon green fluorescent tube lights and a standing microphone, intense aggressive UK drill freestyle, sharp sliding 808 bass, rapid rhythmic hand gestures and head nods, cinematic dark studio style',
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
    video: '/videos/friendsroast15_vertical.mp4',
    prompt:
      'Two best friends roasting each other about always being late and ordering too much takeout, fast witty punchlines, underground cypher lighting, hyping crowd in background, viral TikTok rap battle style',
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
    video: '/videos/cutepet15_vertical.mp4',
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
    desc: 'The legendary 50 Cent "In Da Club" birthday vibe: iconic "Go shorty, it is your birthday" hook, party hype, heavy 808 club beat.',
    image: '/imgs/scenes/hotel-lobby-studio.jpg',
    video: '/videos/birthday15_vertical.mp4',
    prompt:
      'Birthday celebration rap concert, 50 Cent In Da Club aesthetic, golden studio lighting, confetti and champagne, high-energy party delivery, viral party rap style',
    styleId: 'trap-808',
    lyrics:
      '[Intro]\nGo shorty, it is your birthday!\nWe gonna party like it is your birthday!\nWe gonna sip Bacardi like it is your birthday!\n[Verse 1]\nAnother year older, still acting twenty-one\nGolden chains swinging, the party just begun\nHit the VIP section, bottles in the air\n[Chorus]\nHappy birthday to the legend in the place\nTonight we taking over the whole space!',
  },
  {
    id: 'choreo-drill',
    label: '⚡ Choreo & Drill Dance',
    tag: 'Brooklyn Drill',
    title: 'Pop Smoke Woo Walk Stage',
    desc: 'The iconic Pop Smoke "Woo Walk" glide: effortless sliding footwork, heavy 808 sub-bass, and confident raw swagger.',
    image: '/imgs/scenes/on-the-radar-booth.jpg',
    video: '/videos/drill15_vertical.mp4',
    prompt:
      'Brooklyn drill dance performance, Pop Smoke iconic Woo Walk glide, deep sliding 808 sub-bass sync, cinematic dark street aesthetic with subtle neon rim light, confident raw swagger, viral Brooklyn drill dance style',
    styleId: 'cyber-drill',
    lyrics:
      '[Intro]\nWoo! Watch the slide, lock the frame!\n[Verse 1]\nGliding on the 808, ice on my wrist\nStepping to the left with a Brooklyn twist\nBass hits heavy, cameras locked in tight\n[Chorus]\nWoo Walk smooth under flashing lights\nKing of the drill taking over the night!',
  },
  {
    id: 'neon-freestyle',
    label: '🌃 Neon Street Freestyle',
    tag: 'Cyberpunk Lo-Fi',
    title: 'Neon Street Session Stage',
    desc: 'Midnight cyberpunk alley with neon reflections: stylish rapper delivering sharp freestyle bars, gold chain, 808 beat, cinematic music video.',
    image: '/imgs/scenes/neon-street-freestyle.jpg',
    video: '/videos/neonfreestyle15_vertical.mp4',
    prompt:
      'Solo rapper flowing effortlessly in a rain-slicked cyberpunk alley with neon reflections, gold chain, street gestures and rhythmic head nods, vintage warm tube lighting, punchy lo-fi trap beat, cinematic music video style',
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

const HUD_TICKER_MESSAGES = [
  '⚡ Extracting 3D head rotation matrix & micro-nod gestures...',
  '🎙️ Aligning vocal phonemes to lip curvature & jaw drop...',
  '🔊 Synchronizing 808 sub-bass drops with shoulder sway...',
  '🎬 Synthesizing cinematic volumetric lighting & 1080P Full HD master...',
  '🔥 Injecting swagger micro-expressions & cadence delivery...',
];

const VIRAL_SHOWCASE_CARDS = [
  {
    title: 'Hotel Lobby Duo',
    plays: '1.4M views',
    tag: 'Orange Studio Trap',
    image: '/imgs/scenes/hotel-lobby-studio.jpg',
  },
  {
    title: 'Cute Pet Chopper',
    plays: '890K views',
    tag: 'Gold Chain Meme Rap',
    image: '/imgs/scenes/cute-pet-rap.jpg',
  },
  {
    title: 'On The Radar',
    plays: '2.1M views',
    tag: 'UK Green Drill',
    image: '/imgs/scenes/on-the-radar-booth.jpg',
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
    staleTime: 2_000,
  });
  const isAdmin = (session?.user as any)?.role === 'admin';
  const balance = session?.user
    ? isAdmin
      ? 999999
      : (creditsQuery.data?.balance ?? 0)
    : null;

  // Studio Mode & Occasion States (Using chip.id for strict matching)
  const [studioMode, setStudioMode] = useState<StudioMode>('duo');
  const [activeChipId, setActiveChipId] = useState<string>(
    OCCASION_CHIPS[0].id
  );
  const [currentChip, setCurrentChip] = useState<OccasionChipItem>(
    OCCASION_CHIPS[0]
  );
  const [previewMuted, setPreviewMuted] = useState(true);
  const [monitorMode, setMonitorMode] = useState<'demo' | 'reference'>('demo');
  const [selectedDuration, setSelectedDuration] = useState<number>(15);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [selectedModelId, setSelectedModelId] = useState<RapModelId>('kling-4-0');

  // Real-time dynamic cost, wait time, and resolution
  const currentCost = getRapCostCredits(selectedDuration, studioMode, selectedModelId);
  const currentWaitTime = getRapEstimatedWaitTime(selectedDuration, studioMode, selectedModelId);
  const currentResolution = getRapResolution(aspectRatio);

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
  const [cleanWatermarkMode, setCleanWatermarkMode] = useState(true);

  // File upload refs
  const fileInputRef1 = useRef<HTMLInputElement | null>(null);
  const fileInputRef2 = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Custom Master Video states (Default bound to Hotel Lobby 15s master reference)
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(
    '/videos/hotellobby15.mp4'
  );
  const [customVideoName, setCustomVideoName] = useState<string>(
    'hotellobby15.mp4'
  );
  const [customAudioUrl, setCustomAudioUrl] = useState<string | null>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [audioOption, setAudioOption] = useState<'original' | 'generate'>('original');

  // Mobile QR Beam Upload modal
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrTargetSlot, setQrTargetSlot] = useState<1 | 2>(1);

  // Mobile QR Video Download modal
  const [downloadQrOpen, setDownloadQrOpen] = useState(false);

  // Cyber HUD & Viral Showcase states
  const [hudTickerIndex, setHudTickerIndex] = useState(0);
  const [copiedTags, setCopiedTags] = useState(false);

  useEffect(() => {
    if (taskStatus !== 'processing') return;
    const interval = setInterval(() => {
      setHudTickerIndex((prev) => (prev + 1) % HUD_TICKER_MESSAGES.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [taskStatus]);

  const handleCopyViralTags = () => {
    const tags = '#airapvideo #hotellobby #aihiphop #motionmimic #rapmv #duoflow #cyberdrill';
    navigator.clipboard.writeText(tags);
    setCopiedTags(true);
    toast.success('🔥 Viral hashtags copied to clipboard! Ready to paste on TikTok/Reels.');
    setTimeout(() => setCopiedTags(false), 2500);
  };

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

          const isDone =
            (res.taskStatus === 'success' || res.status === 'success') &&
            Boolean(info.videoUrl || res.videoUrl || res.taskResult?.videoUrl);

          if (isDone) {
            setTaskStatus('success');
            setTaskStage('completed');
            setTaskProgress(100);
            const vid =
              info.videoUrl ||
              res.videoUrl ||
              res.taskResult?.videoUrl;
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
    if (chip.id === 'hotel-lobby' || chip.id === 'friends-roast' || chip.id === 'birthday-hype') {
      setCustomVideoUrl(chip.video || '/videos/hotellobby15.mp4');
      setCustomVideoName((chip.video ? chip.video.split('/').pop() : 'hotellobby15.mp4') || 'hotellobby15.mp4');
      setStudioMode('duo');
      setAudioOption('original');
      setSelectedDuration(15);
      setAspectRatio('9:16');
    } else {
      setCustomVideoUrl(chip.video || null);
      setCustomVideoName((chip.video ? chip.video.split('/').pop() : '') || '');
      setStudioMode('solo');
      setAudioOption('original');
      setSelectedDuration(15);
      setAspectRatio('9:16');
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

  // Upload Custom Master Video
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 35 * 1024 * 1024) {
      toast.error('Video file is too large. Please upload a short video under 35MB (5-15s recommended).');
      return;
    }

    setIsUploadingVideo(true);
    const toastId = toast.loading('Uploading master video and extracting lossless audio track...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      // 并发执行：1. 上传原视频 2. 浏览器本地无损抽取原声音轨并上传
      const uploadVideoPromise = fetch('/api/storage/upload-media', {
        method: 'POST',
        body: formData,
      }).then((r) => r.json());

      const extractAudioPromise = extractAudioFromVideoFile(file)
        .then(async (audioBlob) => {
          const audioFileName = `${file.name.replace(/\.[^/.]+$/, '')}_audio.wav`;
          const audioFile = new File([audioBlob], audioFileName, { type: 'audio/wav' });
          const aFormData = new FormData();
          aFormData.append('file', audioFile);
          const aRes = await fetch('/api/storage/upload-media', {
            method: 'POST',
            body: aFormData,
          });
          return aRes.json();
        })
        .catch((e) => {
          console.warn('[Audio Extraction Note]:', e);
          return null;
        });

      const [videoJson, audioJson] = await Promise.all([uploadVideoPromise, extractAudioPromise]);

      const uploadedUrl =
        videoJson?.data?.url ||
        videoJson?.data?.results?.[0]?.url ||
        videoJson?.data?.urls?.[0];

      const extractedAudioUrl =
        audioJson?.data?.url ||
        audioJson?.data?.results?.[0]?.url ||
        audioJson?.data?.urls?.[0];

      if (extractedAudioUrl) {
        setCustomAudioUrl(extractedAudioUrl);
      }

      if (uploadedUrl) {
        setCustomVideoUrl(uploadedUrl);
        setCustomVideoName(file.name);
        setStudioMode('mimic');
        toast.success(
          extractedAudioUrl
            ? `🎬 Master video & original audio track extracted! Stage monitor synced.`
            : `🎬 Master video "${file.name}" ready! Stage monitor synced.`,
          { id: toastId }
        );
      } else {
        throw new Error(videoJson?.message || 'Upload failed');
      }
    } catch (err: any) {
      console.warn('Direct upload error, falling back to local stream:', err);
      const localUrl = URL.createObjectURL(file);
      setCustomVideoUrl(localUrl);
      setCustomVideoName(file.name);
      setStudioMode('mimic');
      toast.success(`🎬 Master video "${file.name}" loaded! Stage monitor synced.`, { id: toastId });
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleRemoveCustomVideo = () => {
    setCustomVideoUrl(null);
    setCustomVideoName('');
    setCustomAudioUrl(null);
    if (studioMode === 'mimic') {
      setStudioMode('duo');
    }
    toast.info('Custom master video cleared. Switched back to trending stage.');
  };

  // 自动从当前激活的母视频中抽取无损原声音轨，避免用户因未重新点击上传而漏掉音轨
  useEffect(() => {
    if (customVideoUrl && !customAudioUrl && audioOption === 'original') {
      let isMounted = true;
      fetch(customVideoUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.blob();
        })
        .then(async (blob) => {
          if (!isMounted) return;
          const file = new File([blob], 'master_video.mp4', { type: blob.type || 'video/mp4' });
          const audioBlob = await extractAudioFromVideoFile(file);
          const audioFile = new File([audioBlob], 'master_audio.wav', { type: 'audio/wav' });
          const formData = new FormData();
          formData.append('file', audioFile);
          const uploadRes = await fetch('/api/storage/upload-media', {
            method: 'POST',
            body: formData,
          });
          const json = await uploadRes.json();
          const extractedUrl = json.data?.url || json.data?.results?.[0]?.url || json.data?.urls?.[0];
          if (isMounted && extractedUrl) {
            setCustomAudioUrl(extractedUrl);
            toast.success('🎵 Master audio track extracted & synced!');
          }
        })
        .catch((err) => {
          console.warn('[Auto Audio Sync Note]:', err.message);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [customVideoUrl, customAudioUrl, audioOption]);

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

    // 先强制刷新一次最新的 credits 数据（防止后台刚充值或扣费但前端缓存未过期）
    const freshRes = await creditsQuery.refetch();
    const realBalance = freshRes.data?.balance ?? balance ?? 0;
    const requiredCredits = getRapCostCredits(selectedDuration, studioMode, selectedModelId);
    if (realBalance < requiredCredits) {
      toast.error(
        `Insufficient credits. This generation requires ${requiredCredits} credits (${selectedDuration}s · ${studioMode.toUpperCase()} · ${selectedModelId}). Current balance: ${realBalance}`
      );
      return;
    }

    const currentPhotos =
      studioMode === 'duo' || (studioMode === 'mimic' && photo2)
        ? [photo1, photo2].filter(Boolean)
        : [photo1].filter(Boolean);

    if (currentPhotos.length === 0) {
      toast.error('Please upload or select at least one portrait photo.');
      return;
    }

    setIsSubmitting(true);
    setTaskStatus('processing');
    setTaskStage(customVideoUrl && audioOption === 'original' ? 'video' : 'lyrics');
    setTaskProgress(customVideoUrl && audioOption === 'original' ? 60 : 15);
    setStageMessage(
      customVideoUrl && audioOption === 'original'
        ? `Using master audio & flow (${selectedDuration}s), tracking body motion and camera angles...`
        : `Starting multi-model pipeline (${selectedDuration}s): composing lyrics and 808 flow...`
    );
    setResultVideoUrl(null);

    try {
      const res = await apiPost<{ id: string; taskId: string }>(
        '/api/ai/rap/generate',
        {
          imageUrl: currentPhotos[0],
          imageUrls: currentPhotos,
          studioMode: studioMode === 'mimic' ? (currentPhotos.length > 1 ? 'duo' : 'solo') : studioMode,
          prompt: prompt.trim() || currentChip.prompt,
          videoPrompt: currentChip.prompt,
          scenarioId: currentChip.id || activeChipId || 'hotel-lobby',
          styleId: selectedStyle.id,
          videoModel: selectedModelId,
          customLyrics: lyrics.trim(),
          referenceVideoUrl: customVideoUrl || undefined,
          audioOption,
          audioUrl: audioOption === 'original' && customAudioUrl ? customAudioUrl : undefined,
          duration: selectedDuration,
          aspectRatio,
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
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/*"
        className="hidden"
        onChange={handleVideoUpload}
      />

      {/* Top Header Banner */}
      <div className="mx-auto max-w-4xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.2)] backdrop-blur-md">
          <Flame className="size-4 animate-pulse text-amber-400" />
          <span>Iconic Orange Studio Preset · Two Rappers · One Hanging Microphone</span>
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Turn Two Photos into a{' '}
          <span className="bg-gradient-to-r from-amber-400 via-rose-500 to-purple-500 bg-clip-text text-transparent">
            Viral AI Rap Video
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base lg:text-lg">
          Create your own viral orange studio rap battle with just two photos. Airap turns selfies into animated rap performances with AI-generated lyrics, rap vocals, 808 beats, synchronized lip movements, and hip-hop gestures.
        </p>
        <p className="mt-2 text-xs font-semibold tracking-wide text-amber-300/90 sm:text-sm">
          No filming. No recording. No editing skills required.
        </p>

        {/* Action CTAs */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3.5">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('studio-generator');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/25 transition-all hover:scale-105 hover:shadow-rose-500/35 active:scale-95"
          >
            <Mic className="size-4" />
            <span>Create My AI Rap Video</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('showcase-evidence');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
          >
            <Play className="size-4 fill-current text-amber-400" />
            <span>Watch Real AI Rap Examples</span>
          </button>
        </div>

        {/* Trust Notes */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-300">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-amber-400" />
            <span>Upload Two Separate Photos</span>
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-amber-400" />
            <span>AI-Generated Rap Lyrics & Music</span>
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-amber-400" />
            <span>9:16 Social Video Export</span>
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-amber-400" />
            <span>Free Credits to Try</span>
          </span>
        </div>
      </div>

      {/* Studio Workbench */}
      <div id="studio-generator" className="mt-8 rounded-3xl border border-white/12 bg-[#0d1527]/95 p-3.5 shadow-[0_24px_80px_rgba(2,6,23,0.65)] backdrop-blur-2xl transition-all duration-200 hover:border-amber-400/20 sm:p-5">
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_390px] 2xl:grid-cols-[1fr_420px]">
          {/* Left Column: Directing & Inputs */}
          <div className="flex flex-col justify-between min-w-0">
            {/* STEP 1: Video Mode Selector */}
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-black tracking-wider text-amber-300 uppercase">
                  STEP 1
                </span>
                <span className="text-xs font-bold text-white/90">
                  Select Rap Mode:
                </span>
                <span className="hidden text-[11px] font-medium text-amber-300/80 sm:inline-block">
                  (Default: Duo Cypher for 2-Photo Battles)
                </span>
              </div>
              <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.06] p-1">
                <button
                  type="button"
                  onClick={() => setStudioMode('duo')}
                  className={cn(
                    'relative flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                    studioMode === 'duo'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 ring-1 ring-amber-300 font-bold'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Mic className="size-3.5" />
                  <span>Duo Cypher (2 Photos)</span>
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider',
                      studioMode === 'duo'
                        ? 'bg-slate-950 text-amber-300'
                        : 'bg-amber-400/20 text-amber-300'
                    )}
                  >
                    Default
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStudioMode('group')}
                  className={cn(
                    'flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                    studioMode === 'group'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Users className="size-3.5" />
                  <span>Group Rap (Crew)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStudioMode('solo')}
                  className={cn(
                    'flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                    studioMode === 'solo'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <User className="size-3.5" />
                  <span>Solo / Pet MC</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStudioMode('mimic');
                    if (!customVideoUrl) {
                      videoInputRef.current?.click();
                    }
                  }}
                  className={cn(
                    'flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                    studioMode === 'mimic'
                      ? 'bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 text-white shadow-md shadow-rose-500/25 font-bold'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Film className="size-3.5" />
                  <span>Master Video Mimic</span>
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

            {/* Mode Guide Pill Banner */}
            <div className="mb-3.5 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="flex size-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-white/80">
                  {studioMode === 'duo' && (
                    <>
                      <strong className="font-bold text-amber-300">Default Mode: Duo Cypher (2 Photos Rap Battle)</strong> — Directs two people into split-screen bars, turn-based punchlines, and 808 beat drops.
                    </>
                  )}
                  {studioMode === 'group' && (
                    <>
                      <strong className="font-bold text-amber-300">Group Rap Mode (3-4 Avatars)</strong> — Synchronized crew cypher with multi-vocal hype and stage camera movement.
                    </>
                  )}
                  {studioMode === 'solo' && (
                    <>
                      <strong className="font-bold text-amber-300">Solo / Pet MC Mode</strong> — Single portrait or cute pet spitting hypersonic chopper flow to bouncy trap drums.
                    </>
                  )}
                  {studioMode === 'mimic' && (
                    <>
                      <strong className="font-bold text-amber-300">Upload Master Video Mode</strong> — Upload your own reference rap video and replace avatars with custom photos.
                    </>
                  )}
                </span>
              </div>
              <span className="hidden text-[11px] font-semibold text-amber-400/90 sm:inline-block">
                Auto-Synchronized 808 Beat
              </span>
            </div>

            {/* Master Video Reference Banner / Control */}
            {(customVideoUrl || studioMode === 'mimic') && (
              <div className="mb-4 rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-slate-900/60 p-3.5 shadow-lg backdrop-blur-md">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-purple-600 shadow-md shadow-rose-500/30">
                      <Film className="size-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {customVideoName ? customVideoName : 'Custom Reference Master Video'}
                        </span>
                        {customVideoUrl && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                            <CheckCircle2 className="size-3" />
                            Synced to Stage Monitor
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-300">
                        {customVideoUrl
                          ? 'AI will transfer movements, camera tracking and flow from this video to your uploaded photos.'
                          : 'Upload any rap video (5-15s, MP4/MOV) to transfer flow, motions & swag to your portraits.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={isUploadingVideo}
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20 active:scale-95"
                    >
                      {isUploadingVideo ? (
                        <Loader2 className="size-3.5 animate-spin text-amber-400" />
                      ) : (
                        <Upload className="size-3.5" />
                      )}
                      <span>{customVideoUrl ? 'Change Video' : 'Upload Video File'}</span>
                    </button>

                    {customVideoUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveCustomVideo}
                        className="flex cursor-pointer items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white/60 transition hover:bg-rose-500/20 hover:text-rose-300"
                      >
                        <X className="size-3.5" />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Audio Flow Option Selector */}
                {customVideoUrl && (
                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/10 pt-2.5 text-xs">
                    <span className="text-[11px] font-semibold text-amber-300">Audio Track:</span>
                    <label className="flex cursor-pointer items-center gap-1.5 text-white/90 hover:text-white">
                      <input
                        type="radio"
                        name="audioOpt"
                        checked={audioOption === 'original'}
                        onChange={() => setAudioOption('original')}
                        className="accent-amber-400"
                      />
                      <span className="font-medium">🎵 Keep Master Original Audio & Beat (Instant & True Flow)</span>
                      {customAudioUrl && (
                        <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                          Master Audio Synced
                        </span>
                      )}
                    </label>

                    <label className="flex cursor-pointer items-center gap-1.5 text-white/70 hover:text-white">
                      <input
                        type="radio"
                        name="audioOpt"
                        checked={audioOption === 'generate'}
                        onChange={() => setAudioOption('generate')}
                        className="accent-amber-400"
                      />
                      <span>⚡ AI Compose New Flow & 808 Trap Beat</span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* 2. Visual Staging Roles (Duo or Mimic mode = Slot 1 + Swap + Slot 2) */}
            {studioMode === 'duo' || studioMode === 'mimic' ? (
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
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
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

            {/* 7. Directing Settings: Aspect Ratio, Video Duration & AI Video Model */}
            <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {/* Aspect Ratio Selector */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Smartphone className="size-3.5 text-amber-400" />
                    <span>Aspect Ratio</span>
                  </span>
                  <span className="text-[10px] font-semibold text-amber-300">
                    {aspectRatio === '9:16' ? 'TikTok / Shorts' : 'YouTube / PC'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAspectRatio('9:16')}
                    className={cn(
                      'flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border py-2 px-2 text-center transition-all active:scale-95',
                      aspectRatio === '9:16'
                        ? 'border-amber-400 bg-amber-400/20 text-white shadow-[0_0_15px_rgba(251,191,36,0.25)] ring-1 ring-amber-400'
                        : 'border-white/10 bg-white/5 text-white/70 hover:border-white/25 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <Smartphone className="size-3 text-amber-400" />
                    <span className="text-xs font-bold">9:16 Vertical</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectRatio('16:9')}
                    className={cn(
                      'flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border py-2 px-2 text-center transition-all active:scale-95',
                      aspectRatio === '16:9'
                        ? 'border-amber-400 bg-amber-400/20 text-white shadow-[0_0_15px_rgba(251,191,36,0.25)] ring-1 ring-amber-400'
                        : 'border-white/10 bg-white/5 text-white/70 hover:border-white/25 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <Video className="size-3 text-amber-400" />
                    <span className="text-xs font-bold">16:9 Wide</span>
                  </button>
                </div>
              </div>

              {/* Video Output Duration */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Clock className="size-3.5 text-amber-400" />
                    <span>Duration</span>
                  </span>
                  <span className="text-[10px] font-semibold text-amber-300">
                    {selectedDuration}s · {currentCost} Credits
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {RAP_DURATION_OPTIONS.map((opt) => {
                    const isSelected = selectedDuration === opt.duration;
                    const optCost = getRapCostCredits(opt.duration, studioMode, selectedModelId);
                    return (
                      <button
                        key={opt.duration}
                        type="button"
                        onClick={() => setSelectedDuration(opt.duration)}
                        className={cn(
                          'flex cursor-pointer flex-col items-center justify-center rounded-lg border py-1.5 px-1 text-center transition-all active:scale-95',
                          isSelected
                            ? 'border-amber-400 bg-amber-400/20 text-white shadow-[0_0_15px_rgba(251,191,36,0.25)] ring-1 ring-amber-400'
                            : 'border-white/10 bg-white/5 text-white/70 hover:border-white/25 hover:bg-white/10 hover:text-white'
                        )}
                      >
                        <span className="text-xs font-bold">{opt.duration}s</span>
                        <span className={cn('text-[9px]', isSelected ? 'text-amber-300 font-semibold' : 'text-white/50')}>
                          {optCost} C
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AI Video Model Selector */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Sparkles className="size-3.5 text-amber-400" />
                    <span>AI Video Model</span>
                  </span>
                  <span className="text-[10px] font-semibold text-amber-300">
                    {RAP_MODEL_OPTIONS.find((m) => m.id === selectedModelId)?.name.split(' ')[0] || 'Kling 4.0'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {RAP_MODEL_OPTIONS.map((model) => {
                    const isSelected = selectedModelId === model.id;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => setSelectedModelId(model.id)}
                        className={cn(
                          'flex cursor-pointer flex-col items-center justify-center rounded-lg border py-1.5 px-1 text-center transition-all active:scale-95',
                          isSelected
                            ? 'border-amber-400 bg-amber-400/20 text-white shadow-[0_0_15px_rgba(251,191,36,0.25)] ring-1 ring-amber-400'
                            : 'border-white/10 bg-white/5 text-white/70 hover:border-white/25 hover:bg-white/10 hover:text-white'
                        )}
                        title={model.desc}
                      >
                        <span className="text-xs font-bold truncate max-w-full">{model.name.split(' ')[0]}</span>
                        <span className={cn('text-[9px]', isSelected ? 'text-amber-300 font-semibold' : 'text-white/50')}>
                          {model.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* STEP 5: Generate Your Video & Transparent Real-Time Specs */}
            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-[#0e1628] to-[#090e1a] p-3.5 shadow-lg">
              {/* Live Spec Matrix Bar: Mode, Resolution, Wait Time & Actual Cost */}
              <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-2.5 sm:grid-cols-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Active Mode
                  </span>
                  <span
                    className="mt-0.5 truncate text-xs font-bold text-amber-300"
                    title={
                      studioMode === 'duo'
                        ? 'Duo Cypher (2 Photos Rap Battle · Default)'
                        : studioMode === 'group'
                        ? 'Group Rap (Crew Cypher)'
                        : studioMode === 'solo'
                        ? 'Solo / Pet MC'
                        : 'Master Video Mimic'
                    }
                  >
                    {studioMode === 'duo'
                      ? '🎤 Duo Cypher (Default)'
                      : studioMode === 'group'
                      ? '👥 Group Rap'
                      : studioMode === 'solo'
                      ? '👤 Solo MC'
                      : '🎬 Video Mimic'}
                  </span>
                </div>

                <div className="flex flex-col border-l border-white/10 pl-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Resolution
                  </span>
                  <span className="mt-0.5 text-xs font-bold text-white">
                    {currentResolution}
                  </span>
                </div>

                <div className="flex flex-col border-l border-white/10 pl-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Est. Wait Time
                  </span>
                  <span className="mt-0.5 text-xs font-bold text-cyan-300">
                    ⏱️ {currentWaitTime}
                  </span>
                </div>

                <div className="flex flex-col border-l border-white/10 pl-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Estimated Cost
                  </span>
                  <span className="mt-0.5 text-xs font-extrabold text-amber-400">
                    ⚡ {currentCost} Credits
                  </span>
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={handleStartGeneration}
                disabled={isSubmitting || (taskStatus === 'processing' && taskProgress < 100)}
                className="group relative flex h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 px-6 text-sm font-bold text-white shadow-[0_0_30px_rgba(245,158,11,0.35)] transition-all hover:opacity-95 hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {taskStatus === 'processing' && taskProgress < 100 ? (
                  <>
                    <Loader2 className="size-4 animate-spin text-white" />
                    <span>Directing Rap MV ({taskProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="size-4 animate-pulse" />
                    <span>
                      {session?.user
                        ? `Generate My Rap Video · ${currentCost} Credits (${selectedDuration}s · 1080P · ${currentWaitTime})`
                        : `Generate My Rap Video (Get Free Signup Credits)`}
                    </span>
                  </>
                )}
              </button>

              {/* Status & Balance Footer */}
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1 px-1 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  <span>
                    Model: <strong className="text-white/80">{RAP_MODEL_OPTIONS.find(m => m.id === selectedModelId)?.name || 'Kling 4.0'}</strong> · {currentResolution} · Est. {currentWaitTime}
                  </span>
                </span>
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
                  {customVideoUrl && (
                    <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setMonitorMode('demo')}
                        className={cn(
                          'cursor-pointer rounded-md px-2 py-0.5 font-semibold transition',
                          monitorMode === 'demo'
                            ? 'bg-amber-400 text-slate-950 shadow-sm'
                            : 'text-white/70 hover:text-white'
                        )}
                      >
                        Demo Video
                      </button>
                      <button
                        type="button"
                        onClick={() => setMonitorMode('reference')}
                        className={cn(
                          'cursor-pointer rounded-md px-2 py-0.5 font-semibold transition',
                          monitorMode === 'reference'
                            ? 'bg-amber-400 text-slate-950 shadow-sm'
                            : 'text-white/70 hover:text-white'
                        )}
                      >
                        Reference (15s)
                      </button>
                    </div>
                  )}
                  <span className="rounded-full border border-amber-400/25 bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    {currentChip.tag}
                  </span>
                  <button
                    type="button"
                    aria-label={previewMuted ? 'Unmute Audio' : 'Mute Audio'}
                    title={previewMuted ? 'Unmute Audio' : 'Mute Audio'}
                    onClick={() => {
                      const next = !previewMuted;
                      setPreviewMuted(next);
                      if (stageVideoRef.current) {
                        stageVideoRef.current.muted = next;
                      }
                    }}
                    className="flex size-7 cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/80 transition hover:bg-white/15 hover:text-white"
                  >
                    {previewMuted ? (
                      <VolumeX className="size-3.5" />
                    ) : (
                      <Volume2 className="size-3.5 text-amber-400 animate-pulse" />
                    )}
                  </button>
                </div>
              </div>

              {/* 9:16 Vertical Screen Area */}
              <div className="group/stage relative flex min-h-[380px] flex-1 w-full flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-black shadow-inner">
                {/* State 1: Generation Complete (Play Finished MV) */}
                {taskStatus === 'success' && resultVideoUrl ? (
                  <div className="relative flex size-full flex-col justify-between overflow-hidden bg-black">
                    {/* Clean Edge Cropped Video Container (crops out 4-corner tiny AI stamps) */}
                    <div className="relative flex size-full items-center justify-center overflow-hidden">
                      <video
                        src={resultVideoUrl}
                        controls
                        autoPlay
                        loop
                        className={cn(
                          'size-full transition-all duration-300',
                          cleanWatermarkMode
                            ? 'scale-[1.06] object-cover'
                            : 'object-contain'
                        )}
                      />

                      {/* Clean Mode Floating Indicator */}
                      <button
                        type="button"
                        onClick={() => setCleanWatermarkMode(!cleanWatermarkMode)}
                        className="absolute top-2.5 right-2.5 z-20 flex cursor-pointer items-center gap-1 rounded-full border border-white/20 bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-md transition hover:bg-black/90 hover:text-amber-300"
                        title={cleanWatermarkMode ? 'Switch to Full Frame (with badges)' : 'Toggle Clean Edge Mode (remove corner watermarks)'}
                      >
                        <span className={cn('size-1.5 rounded-full', cleanWatermarkMode ? 'bg-emerald-400' : 'bg-slate-400')} />
                        <span>{cleanWatermarkMode ? '✨ Clean No-Watermark' : 'Original Frame'}</span>
                      </button>
                    </div>

                    <div className="absolute inset-x-3 bottom-3 z-30 flex flex-col gap-2 rounded-xl border border-white/15 bg-black/90 p-3 backdrop-blur-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white">
                            🎉 Rap MV Directed Successfully!
                          </p>
                          <p className="text-[10px] text-amber-300">
                            {selectedStyle.name} ({selectedStyle.bpm} BPM) · {cleanWatermarkMode ? 'Clean No-Watermark HD' : 'Original Frame'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDownloadQrOpen(true)}
                            className="flex cursor-pointer items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-500/20 px-2.5 py-1.5 text-xs font-bold text-amber-300 shadow-sm transition hover:bg-amber-500/30 active:scale-98"
                            title="Scan QR Code to save video on mobile"
                          >
                            <QrCode className="size-3.5 text-amber-400" />
                            <span>Scan QR Code</span>
                          </button>
                          <a
                            href={resultVideoUrl || '/videos/showcase/duo-generated-demo.mp4'}
                            download="ai-rap-video.mp4"
                            target="_blank"
                            rel="noreferrer"
                            className="flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
                          >
                            <Download className="size-3.5" />
                            <span>Download MP4</span>
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

                      {/* Interactive Session Extension: Remix, Community Showcase & Viral Tags */}
                      <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            setTaskStatus('idle');
                            const el = document.getElementById('studio-generator');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="flex cursor-pointer items-center gap-1 font-semibold text-amber-300 hover:text-amber-200 transition active:scale-95"
                        >
                          <Sparkles className="size-3 text-amber-400" />
                          <span>Remix / New Round</span>
                        </button>
                        <a
                          href="#showcase-evidence"
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById('showcase-evidence')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="flex items-center gap-1 text-slate-300 hover:text-white transition"
                        >
                          <Flame className="size-3 text-rose-400" />
                          <span>More Battles</span>
                        </a>
                        <button
                          type="button"
                          onClick={handleCopyViralTags}
                          className="flex cursor-pointer items-center gap-1 text-slate-300 hover:text-emerald-300 transition active:scale-95"
                        >
                          {copiedTags ? (
                            <Check className="size-3 text-emerald-400" />
                          ) : (
                            <Share2 className="size-3 text-purple-400" />
                          )}
                          <span>{copiedTags ? 'Tags Copied!' : 'Copy Tags'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : taskStatus === 'processing' ? (
                  /* State 2: Processing Live Stepper & Cyber Engagement Hub */
                  <div className="flex size-full flex-col justify-between overflow-y-auto bg-slate-950/95 p-3.5 text-left custom-scrollbar">
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
                      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 via-rose-500 to-purple-500 transition-all duration-500"
                          style={{ width: `${taskProgress}%` }}
                        />
                      </div>

                      <p className="mt-1.5 text-[11px] font-medium text-amber-200">
                        {stageMessage || 'Orchestrating multi-model pipeline...'}
                      </p>

                      {/* 4 Steps */}
                      <div className="mt-3 flex flex-col gap-1.5">
                        {/* Step 1 */}
                        <div
                          className={cn(
                            'flex items-center gap-2 rounded-lg border p-1.5 text-xs transition-all',
                            taskProgress >= 20
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                              : 'border-white/10 bg-white/[0.02] text-white/50'
                          )}
                        >
                          <CheckCircle2 className="size-3 shrink-0 text-emerald-400" />
                          <div className="min-w-0">
                            <p className="font-bold text-[11px]">Step 1: Visual Context & Rhyme Writing</p>
                            <p className="truncate text-[9px] opacity-75">
                              DeepSeek writes cadence & double rhymes
                            </p>
                          </div>
                        </div>

                        {/* Step 2 */}
                        <div
                          className={cn(
                            'flex items-center gap-2 rounded-lg border p-1.5 text-xs transition-all',
                            taskStage === 'music'
                              ? 'border-amber-400 bg-amber-500/15 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                              : taskProgress > 50
                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                                : 'border-white/10 bg-white/[0.02] text-white/50'
                          )}
                        >
                          <Music
                            className={cn(
                              'size-3 shrink-0',
                              taskStage === 'music' &&
                                'animate-bounce text-amber-400'
                            )}
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-[11px]">
                              {studioMode === 'mimic' && audioOption === 'original'
                                ? 'Step 2: Master Audio Track Extraction & Beat Sync'
                                : 'Step 2: Suno 808 Beat & Vocals'}
                            </p>
                            <p className="truncate text-[9px] opacity-75">
                              {studioMode === 'mimic' && audioOption === 'original'
                                ? 'Extracting original master track & frequency stems'
                                : '808 bass, hi-hat rolls & rap vocals'}
                            </p>
                          </div>
                        </div>

                        {/* Step 3 */}
                        <div
                          className={cn(
                            'flex items-center gap-2 rounded-lg border p-1.5 text-xs transition-all',
                            taskStage === 'video'
                              ? 'border-rose-400 bg-rose-500/15 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                              : taskProgress >= 95
                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                                : 'border-white/10 bg-white/[0.02] text-white/50'
                          )}
                        >
                          <Mic2
                            className={cn(
                              'size-3 shrink-0',
                              taskStage === 'video' &&
                                'animate-pulse text-rose-400'
                            )}
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-[11px]">Step 3: Lip-Sync & Motion Directing</p>
                            <p className="truncate text-[9px] opacity-75">
                              Audio features drive facial micro-delivery
                            </p>
                          </div>
                        </div>

                        {/* Step 4 */}
                        <div
                          className={cn(
                            'flex items-center gap-2 rounded-lg border p-1.5 text-xs transition-all',
                            taskStage === 'completed'
                              ? 'border-purple-400 bg-purple-500/15 text-purple-200'
                              : 'border-white/10 bg-white/[0.02] text-white/50'
                          )}
                        >
                          <Sparkles className="size-3 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-bold text-[11px]">Step 4: Stream Mastering & Final MV</p>
                            <p className="truncate text-[9px] opacity-75">
                              High-bitrate render & audio multiplexing
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Module 1: Cyber Motion & Audio Waveform HUD */}
                      <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-2.5 backdrop-blur-md">
                        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                            <Activity className="size-3.5 animate-pulse text-emerald-400" />
                            <span>CYBER MOTION & WAVEFORM HUD</span>
                            <span className="flex items-center gap-1 rounded bg-emerald-500/20 px-1 py-0.5 text-[8px] font-mono font-medium text-emerald-300">
                              <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                              LIVE
                            </span>
                          </div>

                          {/* Equalizer Waveform Bars */}
                          <div className="flex items-end gap-0.5 h-3">
                            {[40, 75, 100, 60, 90, 45, 80, 65, 95, 50].map((h, i) => (
                              <span
                                key={i}
                                className="w-0.5 rounded-full bg-gradient-to-t from-emerald-500 to-amber-300 animate-pulse"
                                style={{
                                  height: `${h}%`,
                                  animationDelay: `${i * 100}ms`,
                                  animationDuration: '650ms',
                                }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Real-time Tracking Matrix */}
                        <div className="mt-2 grid grid-cols-2 gap-1.5 font-mono text-[9px]">
                          <div className="flex items-center justify-between rounded bg-white/[0.03] px-2 py-1 text-slate-300 border border-white/5">
                            <span className="text-white/50">FACE MESH:</span>
                            <span className="font-bold text-emerald-400">468 PTS [LOCKED]</span>
                          </div>
                          <div className="flex items-center justify-between rounded bg-white/[0.03] px-2 py-1 text-slate-300 border border-white/5">
                            <span className="text-white/50">AUDIO BEAT:</span>
                            <span className="font-bold text-amber-400">132 BPM [SYNC]</span>
                          </div>
                          <div className="flex items-center justify-between rounded bg-white/[0.03] px-2 py-1 text-slate-300 border border-white/5">
                            <span className="text-white/50">LIP ALIGN:</span>
                            <span className="font-bold text-rose-400">PHONEME-ACCURATE</span>
                          </div>
                          <div className="flex items-center justify-between rounded bg-white/[0.03] px-2 py-1 text-slate-300 border border-white/5">
                            <span className="text-white/50">MOTION VIBE:</span>
                            <span className="font-bold text-purple-400">99.4% SWAGGER</span>
                          </div>
                        </div>

                        {/* Dynamic Live Ticker */}
                        <div className="mt-2 flex items-center gap-1.5 rounded-md bg-black/40 px-2 py-1.5 text-[9px] text-emerald-300/90 font-mono border border-emerald-500/10">
                          <Radio className="size-3 shrink-0 text-emerald-400 animate-pulse" />
                          <span className="truncate">{HUD_TICKER_MESSAGES[hudTickerIndex]}</span>
                        </div>
                      </div>

                      {/* Module 2: Community Viral Inspiration Reel */}
                      <div className="mt-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
                            <Flame className="size-3.5 text-amber-400" />
                            <span>Community Viral Hits</span>
                          </div>
                          <span className="text-[9px] text-white/40">🔥 10M+ Community Views</span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          {VIRAL_SHOWCASE_CARDS.map((item, idx) => (
                            <div
                              key={idx}
                              className="group relative flex flex-col overflow-hidden rounded-lg border border-white/10 bg-slate-900/80 p-1 transition-all hover:border-amber-400/40"
                            >
                              <div className="relative aspect-[9/12] w-full overflow-hidden rounded bg-slate-950">
                                <img
                                  src={item.image}
                                  alt={item.title}
                                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 py-0.2 text-[7px] font-bold text-amber-300 backdrop-blur-sm">
                                  {item.plays}
                                </span>
                              </div>
                              <p className="mt-1 truncate text-[9px] font-bold text-white group-hover:text-amber-300">
                                {item.title}
                              </p>
                              <p className="truncate text-[7px] text-white/50">{item.tag}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Module 3: Viral Hashtags Copy Tool */}
                      <div className="mt-2.5 flex items-center justify-between rounded-lg border border-white/10 bg-gradient-to-r from-purple-500/10 via-rose-500/10 to-amber-500/10 px-2.5 py-1.5">
                        <div className="min-w-0 pr-2">
                          <p className="text-[9px] font-bold text-white/80 flex items-center gap-1">
                            <Share2 className="size-2.5 text-purple-400" />
                            <span>Trending Social Hashtags</span>
                          </p>
                          <p className="truncate font-mono text-[8px] text-white/50">
                            #airapvideo #hotellobby #aihiphop #motionmimic #rapmv
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyViralTags}
                          className="shrink-0 flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-[8px] font-bold text-white hover:bg-white/20 transition active:scale-95"
                        >
                          {copiedTags ? (
                            <>
                              <Check className="size-2.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-2.5" />
                              <span>Copy Tags</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[10px] text-amber-300/80">
                      <RefreshCw className="size-2.5 animate-spin" />
                      <span>Cloud rendering in progress... You may keep page open</span>
                    </div>
                  </div>
                ) : (
                  /* State 3: Default Idle (Live Authentic 9:16 Scene Visualizer) */
                  <div className="relative size-full overflow-hidden bg-slate-950">
                    {(() => {
                      const activeMonitorVideo =
                        monitorMode === 'reference' && customVideoUrl
                          ? customVideoUrl
                          : (currentChip.video || customVideoUrl || '/videos/showcase/duo-generated-demo.mp4');

                      return activeMonitorVideo ? (
                        <video
                          ref={stageVideoRef}
                          key={activeMonitorVideo}
                          src={activeMonitorVideo}
                          poster={currentChip.image}
                          autoPlay
                          loop
                          muted={previewMuted}
                          playsInline
                          preload="auto"
                          className="size-full object-cover transition-all duration-700 ease-out"
                        />
                      ) : (
                        <img
                          key={currentChip.id}
                          src={currentChip.image}
                          alt={currentChip.title}
                          width={420}
                          height={746}
                          loading="lazy"
                          className="size-full object-cover transition-all duration-700 ease-out group-hover/stage:scale-105"
                        />
                      );
                    })()}

                    {/* Stage Lighting & Vignette Overlay */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />

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
                      <span>{monitorMode === 'reference' ? 'Master Reference (15s)' : 'Demo Showcase (Generated)'}</span>
                    </div>

                    {/* Bottom HUD Information */}
                    <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-xl border border-white/15 bg-black/85 p-2.5 backdrop-blur-md shadow-lg">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-xs font-bold text-white">
                          {monitorMode === 'reference' && customVideoUrl
                            ? (customVideoName ? `Master: ${customVideoName}` : 'Hotel Lobby 15s Master')
                            : `${currentChip.title} · Generated Showcase`}
                        </p>
                        <span className="rounded border border-amber-500/30 bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300">
                          {monitorMode === 'reference' ? 'REFERENCE MASTER' : 'DEMO SHOWCASE'}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-white/70">
                        {monitorMode === 'reference'
                          ? 'Active master video loaded. Your uploaded portrait photos will mimic all movements, flow and expressions from this clip.'
                          : 'Demonstrating AI Rap video generation output with high-fidelity sync, expressions, and 808 trap flow.'}
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
