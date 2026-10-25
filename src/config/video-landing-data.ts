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
  {
    id: 'neon-freestyle',
    key: 'neon_freestyle',
    video: '/videos/showcase/generated/night-conservatory.mp4',
    model: 'Kling 3.0 Turbo',
    params: '1080p · 9:16 · Cyberpunk Lo-Fi',
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
    id: 'neon-freestyle',
    key: 'neon_freestyle',
    video: '/videos/showcase/generated/night-conservatory.mp4',
    aspectRatio: '9 / 16',
    model: 'Kling 3.0 Turbo',
    badge: 'Neon Freestyle',
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
