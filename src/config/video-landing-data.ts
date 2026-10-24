export interface HeroPreset {
  id: string;
  key: string;
  video: string;
  sourceImage?: string;
  sourceImageName?: string;
  model: string;
  params: string;
}

export const HERO_PRESETS: HeroPreset[] = [
  {
    id: 'orange-studio',
    key: 'orange_studio',
    video: '/videos/showcase/generated/web-acrobat.mp4',
    model: 'Kling 3.0 Turbo',
    params: '1080p · 9:16 · Trap 808',
  },
  {
    id: 'choreo-dance',
    key: 'choreo_dance',
    video: '/videos/showcase/generated/airglide-remake.mp4',
    model: 'Wan 3.0',
    params: '1080p · 9:16 · Drill',
  },
  {
    id: 'deep-narrative',
    key: 'deep_narrative',
    video: '/videos/showcase/generated/glacier-titan.mp4',
    model: 'Kling 3.0 Turbo',
    params: '4K · 9:16 · Boombap',
  },
  {
    id: 'freestyle-battle',
    key: 'freestyle_battle',
    video: '/videos/showcase/generated/monster-commuter.mp4',
    model: 'MiniMax H3',
    params: '1080p · 9:16 · Hardcore',
  },
  {
    id: 'meme-pet-rap',
    key: 'meme_pet_rap',
    video: '/videos/showcase/generated/monster-bakery.mp4',
    model: 'Wan 2.7',
    params: '1080p · 9:16 · Fast Flow',
  },
];

export interface ShowcaseItem {
  id: string;
  key: string;
  video: string;
  aspectRatio: string;
  model: string;
  sourceImage?: string;
  badge?: string;
}

export const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    id: 'orange-studio',
    key: 'orange_studio',
    video: '/videos/showcase/generated/web-acrobat.mp4',
    aspectRatio: '9 / 16',
    model: 'Kling 3.0 Turbo',
    badge: 'Migos Studio',
  },
  {
    id: 'choreo-dance',
    key: 'choreo_dance',
    video: '/videos/showcase/generated/airglide-remake.mp4',
    aspectRatio: '9 / 16',
    model: 'Wan 3.0',
    badge: 'Choreo & Drill',
  },
  {
    id: 'deep-narrative',
    key: 'deep_narrative',
    video: '/videos/showcase/generated/glacier-titan.mp4',
    aspectRatio: '9 / 16',
    model: 'Kling 3.0 Turbo',
    badge: 'Narrative MV',
  },
  {
    id: 'freestyle-battle',
    key: 'freestyle_battle',
    video: '/videos/showcase/generated/monster-commuter.mp4',
    aspectRatio: '9 / 16',
    model: 'MiniMax H3',
    badge: 'Freestyle Battle',
  },
  {
    id: 'meme-pet-rap',
    key: 'meme_pet_rap',
    video: '/videos/showcase/generated/monster-bakery.mp4',
    aspectRatio: '9 / 16',
    model: 'Wan 2.7',
    badge: 'Meme Rap',
  },
  {
    id: 'monster-bakery',
    key: 'monster_bakery',
    video: '/videos/showcase/generated/monster-bakery.mp4',
    sourceImage: '/imgs/examples/video/monster-bakery.png',
    aspectRatio: '16 / 10',
    model: 'MiniMax H3',
  },
  {
    id: 'web-acrobat',
    key: 'web_acrobat',
    video: '/videos/showcase/generated/web-acrobat.mp4',
    aspectRatio: '4 / 5',
    model: 'MiniMax H3',
  },
  {
    id: 'paper-dragon',
    key: 'paper_dragon',
    video: '/videos/showcase/generated/paper-dragon.mp4',
    aspectRatio: '3 / 4',
    model: 'MiniMax H3',
  },
  {
    id: 'glacier-titan',
    key: 'glacier_titan',
    video: '/videos/showcase/generated/glacier-titan.mp4',
    aspectRatio: '16 / 9',
    model: 'Seedance 2.5',
  },
  {
    id: 'airglide',
    key: 'airglide',
    video: '/videos/showcase/generated/airglide-remake.mp4',
    aspectRatio: '1 / 1',
    model: 'MiniMax H3',
  },
  {
    id: 'desert-poppies',
    key: 'poppies',
    video: '/videos/showcase/generated/desert-poppies-remake.mp4',
    aspectRatio: '2 / 3',
    model: 'Seedance 2.5',
  },
  {
    id: 'monster-commuter',
    key: 'monster_commuter',
    video: '/videos/showcase/generated/monster-commuter.mp4',
    sourceImage: '/imgs/examples/video/monster-commuter.png',
    aspectRatio: '3 / 2',
    model: 'MiniMax H3',
  },
  {
    id: 'new-york-dragon',
    key: 'dragon',
    video: '/videos/showcase/generated/new-york-dragon-remake.mp4',
    aspectRatio: '9 / 16',
    model: 'MiniMax H3',
  },
  {
    id: 'koi-train',
    key: 'koi_train',
    video: '/videos/showcase/generated/porcelain-koi-train.mp4',
    sourceImage: '/imgs/examples/video/porcelain-koi-train.png',
    aspectRatio: '5 / 4',
    model: 'Seedance 2.5',
  },
  {
    id: 'conservatory',
    key: 'conservatory',
    video: '/videos/showcase/generated/night-conservatory.mp4',
    sourceImage: '/imgs/examples/video/night-conservatory.png',
    aspectRatio: '4 / 3',
    model: 'MiniMax H3',
  },
  {
    id: 'rain-market',
    key: 'rain_market',
    video: '/videos/showcase/generated/rain-puddle-market.mp4',
    aspectRatio: '3 / 5',
    model: 'MiniMax H3',
  },
  {
    id: 'london-orb',
    key: 'orb',
    video: '/videos/showcase/generated/london-orb-remake.mp4',
    aspectRatio: '16 / 10',
    model: 'MiniMax H3',
  },
  {
    id: 'tidal-library',
    key: 'tidal',
    video: '/videos/showcase/generated/tidal-library.mp4',
    aspectRatio: '4 / 5',
    model: 'MiniMax H3',
  },
  {
    id: 'sailcloth-laundromat',
    key: 'laundromat',
    video: '/videos/showcase/generated/sailcloth-laundromat.mp4',
    aspectRatio: '3 / 4',
    model: 'Seedance 2.5',
  },
  {
    id: 'storm-ship',
    key: 'ship',
    video: '/videos/showcase/generated/storm-ship-remake.mp4',
    aspectRatio: '16 / 9',
    model: 'MiniMax H3',
  },
  {
    id: 'asteroids',
    key: 'asteroids',
    video: '/videos/showcase/generated/asteroids-remake.mp4',
    aspectRatio: '1 / 1',
    model: 'Seedance 2.5',
  },
  {
    id: 'woman',
    key: 'woman',
    video: '/videos/showcase/woman.mp4',
    aspectRatio: '2 / 3',
    model: 'MiniMax H3',
  },
];

export interface HowStep {
  step: string;
  titleKey: string;
  descKey: string;
}

export const HOW_STEPS: HowStep[] = [
  {
    step: '01',
    titleKey: 'landing.how_to.step_1_title',
    descKey: 'landing.how_to.step_1_desc',
  },
  {
    step: '02',
    titleKey: 'landing.how_to.step_2_title',
    descKey: 'landing.how_to.step_2_desc',
  },
  {
    step: '03',
    titleKey: 'landing.how_to.step_3_title',
    descKey: 'landing.how_to.step_3_desc',
  },
  {
    step: '04',
    titleKey: 'landing.how_to.step_4_title',
    descKey: 'landing.how_to.step_4_desc',
  },
];

export interface VideoFeatureItem {
  id: string;
  titleKey: string;
  descKey: string;
}

export const VIDEO_FEATURES: VideoFeatureItem[] = [
  {
    id: 't2v',
    titleKey: 'landing.features.items.t2v.title',
    descKey: 'landing.features.items.t2v.desc',
  },
  {
    id: 'i2v',
    titleKey: 'landing.features.items.i2v.title',
    descKey: 'landing.features.items.i2v.desc',
  },
  {
    id: 'reference',
    titleKey: 'landing.features.items.reference.title',
    descKey: 'landing.features.items.reference.desc',
  },
  {
    id: 'models',
    titleKey: 'landing.features.items.models.title',
    descKey: 'landing.features.items.models.desc',
  },
  {
    id: 'controls',
    titleKey: 'landing.features.items.controls.title',
    descKey: 'landing.features.items.controls.desc',
  },
  {
    id: 'library',
    titleKey: 'landing.features.items.library.title',
    descKey: 'landing.features.items.library.desc',
  },
];
