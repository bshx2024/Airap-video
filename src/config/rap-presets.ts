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

export const RAP_COST_CREDITS = 120; // 涵盖 Suno 音乐生成 + 音频驱动视频合成
