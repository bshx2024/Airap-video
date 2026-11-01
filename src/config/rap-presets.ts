export interface RapStylePreset {
  id: string;
  name: string;
  enName: string;
  bpm: number;
  tags: string;
  description: string;
  accentColor: string;
  sunoStyle: string;
}

export interface RapAvatarPreset {
  id: string;
  name: string;
  gender: 'male' | 'female';
  imageUrl: string;
  styleTag: string;
}

export interface RapThemePreset {
  id: string;
  title: string;
  desc: string;
  prompt: string;
  styleId: string;
  lyricsPreview: string;
}

export const RAP_STYLE_PRESETS: RapStylePreset[] = [
  {
    id: 'boom-bap',
    name: '90s Boom Bap',
    enName: '90s East Coast Boom Bap',
    bpm: 92,
    tags: '90s hip-hop, boom bap, dusty vinyl, MPC drums, aggressive flow',
    description: 'Raw dusty vinyl drums, classic East Coast street delivery, tight multi-syllable rhymes.',
    accentColor: '#f59e0b',
    sunoStyle: '90s East Coast boom bap, dusty drum break, jazz sample, aggressive male rap flow, raw street vibe, 92 bpm',
  },
  {
    id: 'trap-808',
    name: 'Heavy 808 Trap',
    enName: 'Heavy 808 Trap',
    bpm: 138,
    tags: 'trap, rolling hi-hats, heavy sub-bass, 808 glide, modern club',
    description: 'Sliding sub-bass 808s, rolling hi-hat triplets, hypnotic catchy party bounce.',
    accentColor: '#ef4444',
    sunoStyle: 'modern trap rap, heavy distorted 808 bass, fast triplet hi-hats, autotune adlibs, bouncy energetic flow, 138 bpm',
  },
  {
    id: 'cyber-drill',
    name: 'Cyber UK Drill',
    enName: 'Cyberpunk UK Drill',
    bpm: 142,
    tags: 'drill, sliding 808, syncopated rhythm, dark synth, futuristic',
    description: 'Syncopated counter-snare, sliding 808 basslines, dark aggressive energy.',
    accentColor: '#06b6d4',
    sunoStyle: 'dark cyberpunk drill rap, aggressive sliding 808, fast syncopated snares, menacing synth pads, intense relentless flow, 142 bpm',
  },
  {
    id: 'melodic-rap',
    name: 'Melodic Emo Rap',
    enName: 'Melodic Emo Rap',
    bpm: 98,
    tags: 'melodic rap, emotional guitar, gentle 808, autotune vocals, poetic',
    description: 'Acoustic nylon guitar chords, emotional vocal delivery with soulful sung chorus.',
    accentColor: '#a855f7',
    sunoStyle: 'emotional melodic rap, acoustic guitar loops, warm sub bass, soulful sung hook, melodic cadence, catchy emotional flow, 98 bpm',
  },
  {
    id: 'chinese-style',
    name: 'Chinoiserie Rap',
    enName: 'Chinese Traditional Rap',
    bpm: 105,
    tags: 'chinese instruments, guzheng, pipa, flute, trap drums, epic',
    description: 'Guzheng & pipa oriental strings fused with hard-hitting modern trap 808s.',
    accentColor: '#e11d48',
    sunoStyle: 'chinese traditional rap, guzheng and pipa melody, hard 808 beat, epic martial arts vibe, poetic rhyming flow, 105 bpm',
  },
];

export const RAP_AVATAR_PRESETS: RapAvatarPreset[] = [
  {
    id: 'street-king',
    name: 'Street King',
    gender: 'male',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80',
    styleTag: '90s Boom Bap / Street Classic',
  },
  {
    id: 'cyber-girl',
    name: 'Cyber Vixen',
    gender: 'female',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
    styleTag: 'Cyber Drill / Neon Sci-Fi',
  },
  {
    id: 'trap-boy',
    name: 'Trap Boy',
    gender: 'male',
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=80',
    styleTag: 'Heavy 808 / Hype Trend',
  },
  {
    id: 'retro-queen',
    name: 'Retro Diva',
    gender: 'female',
    imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop&q=80',
    styleTag: 'Melodic Rap / Soulful Hook',
  },
];

export const RAP_THEME_PRESETS: RapThemePreset[] = [
  {
    id: 'tech-dev',
    title: '💻 程序员午夜狂想曲 (Bug 绝不投降)',
    desc: '键盘如机枪，终端刷爆，深夜上线拒绝崩溃的硬核程序员说唱。',
    prompt: '写一首关于程序员深夜敲代码、单挑线上 Bug、拒绝内卷热血逆袭的硬核说唱',
    styleId: 'cyber-drill',
    lyricsPreview:
      '[Verse 1]\n键盘敲击作鼓点 终端光芒照亮黑夜\n八百行代码在重构 每一个函数在飞跃\nGit push 不需要犹豫 解决 Bug 是本能直觉\n[Chorus]\n我不休眠 编译成功再点根香烟\n我的逻辑 在这数字世界主宰终点！',
  },
  {
    id: 'hustle-life',
    title: '🔥 白手起家逆袭战歌 (从无到有)',
    desc: '从地下到顶峰，用汗水换来属于自己的王座，霸气励志。',
    prompt: '写一首关于从低谷逆袭、白手起家、踩碎质疑登上顶峰的励志热血说唱',
    styleId: 'boom-bap',
    lyricsPreview:
      '[Verse 1]\n曾经嘲笑的声音 如今化作我的回音\n踏着泥泞前行 眼神从未失去坚定\n每一处伤疤 都是镶嵌黄金的勋章\n[Chorus]\n从地下破土而出 如今站在聚光灯下\n看清楚谁是主宰 所有的规则我来定下！',
  },
  {
    id: 'weekend-party',
    title: '🎉 周五打工人狂欢 (丢掉压力)',
    desc: '下班打卡瞬间开启派对，洗脑低音把烦恼全轰飞。',
    prompt: '写一首关于下班解放、周五逃离职场、跟朋友狂欢通宵的轻松洗脑 Trap 说唱',
    styleId: 'trap-808',
    lyricsPreview:
      '[Verse 1]\n五点五十九分 倒计时准备起飞\n关掉钉钉群消息 今晚谁也别想插队\n重低音在车里轰鸣 烦恼全部化作灰\n[Chorus]\nDrop the bass, let it bump!\n今晚不做打工人 我们都是聚光灯下的王！',
  },
  {
    id: 'cyber-city',
    title: '⚡ 赛博纪元掠食者 (未来霓虹)',
    desc: '穿梭在霓虹高楼间的数字幽灵，冷冽科技感拉满。',
    prompt: '写一首关于2077未来赛博城市、义体改装、穿梭霓虹雨夜的科幻说唱',
    styleId: 'cyber-drill',
    lyricsPreview:
      '[Verse 1]\n霓虹暴雨打在金属外壳 滋滋作响\n神经接口接入矩阵 意识在光缆中游荡\n虚拟与现实交错 追踪最后的悬赏\n[Chorus]\n在代码流淌的深渊 我是无影的幻象\n赛博都市的黑夜 听我的律动回响！',
  },
];

export type RapModelId = 'kling-4-0' | 'wan-2-6' | 'seedance-2-5';

export interface RapModelOption {
  id: RapModelId;
  name: string;
  badge: string;
  tag: string;
  description: string;
  baseWaitTime: number;
  multiplier: number;
}

export const RAP_MODEL_OPTIONS: RapModelOption[] = [
  {
    id: 'kling-4-0',
    name: 'Kling 4.0 Studio',
    badge: 'Recommended',
    tag: 'Cinema Lip-Sync & Flow',
    description: 'Specialized for multi-character rapid vocal phonemes, hanging mic body groove, and crisp facial tracking.',
    baseWaitTime: 40,
    multiplier: 1.0,
  },
  {
    id: 'wan-2-6',
    name: 'Wan 2.6 Flash',
    badge: 'Fast Rap',
    tag: 'High-Speed Flow',
    description: 'Fastest pipeline (~30–45s) for instant TikTok viral sharing and lightweight roast clips.',
    baseWaitTime: 25,
    multiplier: 0.8333,
  },
  {
    id: 'seedance-2-5',
    name: 'Seedance 2.5 Pro',
    badge: 'Ultra Motion',
    tag: 'Extreme Choreography',
    description: 'Advanced dance choreography, Pop Smoke Woo Walk glides, and heavy 808 motion-sync dynamics.',
    baseWaitTime: 55,
    multiplier: 1.5,
  },
];

export const RAP_COST_CREDITS = 120; // 5秒基准点数

export const RAP_DURATION_OPTIONS = [
  { duration: 5, label: '5s Quick MV', credits: 120 },
  { duration: 10, label: '10s Extended Flow', credits: 240 },
  { duration: 15, label: '15s Master Cypher', credits: 360 },
] as const;

export function getRapCostCredits(
  duration: number = 15,
  mode: string = 'duo',
  modelId: string = 'kling-4-0'
): number {
  let base = 360;
  if (duration <= 5) base = 120;
  else if (duration <= 10) base = 240;

  // Mode adjustment
  let modeFactor = 1.0;
  if (mode === 'solo') modeFactor = 0.67; // Solo 1-photo: 80 / 160 / 240
  else if (mode === 'group') modeFactor = 1.5; // Group 3+ photos: 180 / 360 / 540

  // Model multiplier
  const model = RAP_MODEL_OPTIONS.find((m) => m.id === modelId) || RAP_MODEL_OPTIONS[0];
  const total = Math.round((base * modeFactor * model.multiplier) / 10) * 10;
  return total;
}

export function getRapEstimatedWaitTime(
  duration: number = 15,
  mode: string = 'duo',
  modelId: string = 'kling-4-0'
): string {
  const model = RAP_MODEL_OPTIONS.find((m) => m.id === modelId) || RAP_MODEL_OPTIONS[0];
  let baseSeconds = model.baseWaitTime;
  if (duration === 10) baseSeconds += 15;
  if (duration === 15) baseSeconds += 30;
  if (mode === 'solo') baseSeconds = Math.max(20, baseSeconds - 10);
  if (mode === 'group') baseSeconds += 20;
  const min = Math.max(20, baseSeconds - 10);
  const max = baseSeconds + 15;
  return `~${min}–${max}s`;
}

export function getRapResolution(aspectRatio: string = '9:16'): string {
  return aspectRatio === '16:9' ? '1080P Widescreen (16:9)' : '1080P Full HD (9:16)';
}

export interface RapHomepageTheme {
  id: string;
  name: string;
  tag: string;
  topic: string;
  styleId: string;
  bpm: number;
  studioMode: 'solo' | 'duo';
  lyrics: string;
  videoPrompt: string;
  videoModel?: string;
  motionSyncEnabled?: boolean;
  lipSyncEnabled?: boolean;
  referenceLabel?: string;
}

export const HOMEPAGE_THEMES: RapHomepageTheme[] = [
  {
    id: 'hotel-lobby',
    name: '🔥 橙色录音棚 (Hotel Lobby)',
    tag: '双人热榜 · 808 Trap',
    topic: 'Quavo & Takeoff 经典 Hotel Lobby 亮橙色录音棚双人互呛，单支悬吊麦克风，高燃808陷阱鼓点',
    styleId: 'trap-808',
    bpm: 138,
    studioMode: 'duo',
    videoModel: 'happyhorse-1.1-r2v',
    motionSyncEnabled: true,
    lipSyncEnabled: true,
    referenceLabel: 'Hotel Lobby 原版5秒双人动作模版',
    lyrics: `[Intro: Beat drops heavy 808]\nYeah, check the mic in the orange room!\nTakeoff and Quavo vibe, let us get it!\n\n[Verse 1: Left Rapper]\nYou always talking big but you showed up late\nI drop the heavy 808 to seal your fate\nLook at your drip, man, it expired in 08\nWe run the lobby while you hesitate\n\n[Outro: Right Rapper]\nHotel Lobby with the hanging mic swing\nHeavy 808s make the whole booth ring!`,
    videoPrompt: 'Two rappers [Image 1] on the left and [Image 2] on the right are standing in an iconic bright orange studio around a single hanging microphone, inspired by Quavo and Takeoff Hotel Lobby, trading punchy roast bars, heavy 808 trap beat, rhythmic head nods, hip-hop hand gestures, viral rap music video style',
  },
  {
    id: 'on-the-radar',
    name: '🟩 绿光电台 (On The Radar)',
    tag: '暗黑电台 · UK Drill',
    topic: 'On The Radar 纽约地下暗黑电台录音间，荧光绿灯管，单手持麦，滑音808钻乐说唱',
    styleId: 'cyber-drill',
    bpm: 142,
    studioMode: 'solo',
    videoModel: 'happyhorse-1.1-i2v',
    motionSyncEnabled: false,
    lipSyncEnabled: true,
    referenceLabel: 'On The Radar 纽约暗黑电台单人持麦',
    lyrics: `[Intro]\n(Whisper) On The Radar, green lights on.\nCheck the mic, sliding bass drop.\n\n[Verse 1]\nStanding by the mic under neon green tube\nEvery sliding 808 breaking every old rule\nGot the rapid drill flow cutting through the dark night\nDouble rhyme scheme locked beneath the spotlight\n\n[Chorus]\nOn The Radar, watch the green glow flare\nSliding drill bass taking over everywhere!`,
    videoPrompt: 'A high-energy hip-hop rapper shown in [Image 1] inside the legendary On The Radar dark studio with neon green fluorescent tube lights and a standing microphone, intense aggressive UK drill freestyle, sharp sliding 808 bass, rapid rhythmic hand gestures and head nods, cinematic dark studio style',
  },
  {
    id: 'friends-roast',
    name: '🥊 好友互呛 (Roast Battle)',
    tag: '街头地下 · Boom Bap',
    topic: '街头地下 Cypher 两位好友互相爆笑双押吐槽，Boom Bap 经典节奏，人群呐喊',
    styleId: 'boom-bap',
    bpm: 92,
    studioMode: 'duo',
    videoModel: 'happyhorse-1.1-r2v',
    motionSyncEnabled: true,
    lipSyncEnabled: true,
    referenceLabel: '街头地下 Cypher 互呛模版',
    lyrics: `[Intro]\nRound one, let us see who got the real bars!\n\n[Verse 1: Left Rapper]\nYou order takeout five times a day\nSaying you on a diet, what a cliché\nI drop the boom bap while you still text delay\n\n[Verse 2: Right Rapper]\nCall me a clown, but I got the crown\nBest friends roasting under underground lights\nTaking the mic and reaching new heights!`,
    videoPrompt: 'Two best friends, [Image 1] on the left and [Image 2] on the right, roasting each other about always being late and ordering takeout, fast witty punchlines, underground cypher street lighting, hyping crowd in background, viral TikTok rap battle style',
  },
  {
    id: 'pet-rap',
    name: '🐶 萌宠快嘴 (Pet Rap)',
    tag: '魔性快嘴 · Upbeat Trap',
    topic: '萌宠戴墨镜挂大金链，超音速快嘴 Chopper Flow，欢快洗脑 Trap 鼓点',
    styleId: 'trap-808',
    bpm: 138,
    studioMode: 'solo',
    videoModel: 'happyhorse-1.1-i2v',
    motionSyncEnabled: false,
    lipSyncEnabled: true,
    referenceLabel: '萌宠墨镜金链自由 Flow',
    lyrics: `[Intro]\nMeow meow, drop that hypersonic beat!\n\n[Verse 1]\nI run the living room, king of the floor\nScratching the couch while I wait by the door\nChopper flow rapid, supersonic claws\n\n[Chorus]\nGold chain kitten with a million views\nSpitting fast bars on the evening news!`,
    videoPrompt: 'A cool character wearing a heavy gold chain and sunglasses, spitting fast chopper flow to upbeat trap drums, energetic head-bobbing, hilarious contrast with viral social media aesthetics, viral music video',
  },
  {
    id: 'birthday-hype',
    name: '🎂 生日轰趴 (Birthday Hype)',
    tag: '派对狂欢 · Golden Trap',
    topic: '生日派对轰趴互损与祝福，金色说唱舞台，彩带金链全场狂欢',
    styleId: 'trap-808',
    bpm: 138,
    studioMode: 'duo',
    videoModel: 'happyhorse-1.1-r2v',
    motionSyncEnabled: true,
    lipSyncEnabled: true,
    referenceLabel: '金色说唱舞台派对模版',
    lyrics: `[Intro]\nBlow out the candles, crank up the bass!\n\n[Verse 1]\nAnother year older, wrinkles on your face\nStill acting twenty-one all over the place\nGolden chains swinging, confetti in the air\n\n[Chorus]\nHappy birthday to the legendary clown\nTonight we taking over the whole town!`,
    videoPrompt: 'Two friends celebrating a milestone birthday in a golden hip-hop studio, hilarious witty birthday roast verses, concert-level hype, confetti and gold chains, high-energy delivery, viral party rap style',
  },
  {
    id: 'choreo-drill',
    name: '⚡ Woo Walk 丝滑滑步 (Choreo Drill)',
    tag: 'Brooklyn Drill · 丝滑滑步',
    topic: 'Pop Smoke 标志性 Woo Walk 丝滑滑步与重低音律动，808 重低音炸场',
    styleId: 'cyber-drill',
    bpm: 142,
    studioMode: 'solo',
    videoModel: 'happyhorse-1.1-r2v',
    motionSyncEnabled: true,
    lipSyncEnabled: true,
    referenceLabel: 'Pop Smoke Woo Walk 丝滑滑步模版',
    lyrics: `[Intro]\nWoo! Watch the slide, lock the frame!\n\n[Verse 1]\nGliding on the 808, ice on my wrist\nStepping to the left with a Brooklyn twist\nBass hits heavy, cameras locked in tight\n\n[Chorus]\nWoo Walk smooth under flashing lights\nKing of the drill taking over the night!`,
    videoPrompt: 'Brooklyn drill dance performance, Pop Smoke iconic Woo Walk glide, deep sliding 808 sub-bass sync, cinematic dark street aesthetic with subtle neon rim light, confident raw swagger, viral Brooklyn drill dance style',
  },
  {
    id: 'neon-freestyle',
    name: '🌃 霓虹街头 (Neon Street)',
    tag: '赛博雨夜 · Melodic Lo-Fi',
    topic: '赛博霓虹雨夜街头单人流动，手持麦克风与大金链，复古温暖 Lo-Fi 旋律说唱',
    styleId: 'melodic-rap',
    bpm: 98,
    studioMode: 'solo',
    videoModel: 'happyhorse-1.1-r2v',
    motionSyncEnabled: true,
    lipSyncEnabled: true,
    referenceLabel: 'Neon Street 15秒赛博街头手势律动模版',
    lyrics: `[Intro]\nRain dropping on the neon pavement...\n\n[Verse 1]\nReflections of cyan, echoes in the mist\nA handheld mic and a story in the fist\nMelodic rhythm floating through the street\n\n[Chorus]\nCity never sleeps, but the flow so deep\nMidnight verses that the memories keep.`,
    videoPrompt: 'Solo rapper shown in [Image 1] flowing effortlessly in a rain-slicked cyberpunk alley with neon reflections, gold chain, street gestures and rhythmic head nods, vintage warm tube lighting, punchy lo-fi trap beat, cinematic music video style',
  },
];
