import type { FaqItem } from '@/config/landing-data';

export const PROMPT_MODEL_TAGS: Record<string, string> = {
  'aperture-comparison': 'Nano Banana Pro',
  'sale-poster': 'Nano Banana Pro',
  'product-still-life': 'FLUX.2',
  'collectible-figurine': 'FLUX.2',
  'macro-detail': 'Nano Banana Pro',
  'group-photo': 'Nano Banana Pro',
  'cover-layout': 'GPT Image 2',
  'city-courier': 'FLUX.2',
  'robot-workshop': 'FLUX.2',
  'tea-packaging': 'Nano Banana Pro',
  'workflow-infographic': 'GPT Image 2',
  'material-atlas': 'Seedream 5.0 Pro',
  'spectrum-futures': 'Seedream 5.0 Pro',
  'three-cities': 'Seedream 5.0 Pro',
  'dense-infographic': 'Nano Banana Pro',
  'study-cards': 'GPT Image 2',
  'studio-portrait': 'FLUX.2',
  'storybook-scene': 'FLUX.2',
  'crowded-scene': 'Nano Banana Pro',
  'packaging-shot': 'Nano Banana Pro',
  'flow-diagram': 'GPT Image 2',
  'flat-illustration': 'GPT Image 2',
  'night-market': 'Nano Banana Pro',
  'design-magazine': 'GPT Image 2',
  'shanghai-night-market': 'Seedream 5.0 Pro',
  'lumen-serum': 'Seedream 5.0 Pro',
  'tidal-house': 'Seedream 5.0 Pro',
};

export type FeatureStep = {
  step: number;
};

export type FeatureCardCopy = {
  id: string;
};

export type FeatureQuickStartItem = {
  id: string;
  prompt: string;
  /** 展示缩略图 */
  image: string;
  /** 图生图参考图；缺省时用 image */
  sourceImage?: string;
};

export type SpotlightItem = {
  id: string;
  reverse?: boolean;
  image?: string;
  images?: string[];
  collage?: 'grid' | 'split' | 'triple';
};

export type FeatureFaqItem = FaqItem;

export const TEXT_TO_IMAGE_STEPS: FeatureStep[] = [
  { step: 1 },
  { step: 2 },
  { step: 3 },
];

/** /text-to-image 页 Hero 快捷开始（区别于首页 QUICK_PROMPTS） */
export const TEXT_TO_IMAGE_QUICKSTART: FeatureQuickStartItem[] = [
  {
    id: 'alpine-observatory',
    prompt:
      'A futuristic glass observatory perched on a snowy mountain ridge at dawn, a lone astronomer in a red parka, warm interior glow, cinematic architectural photography.',
    image: '/imgs/features/text-to-image/alpine-observatory.webp',
  },
  {
    id: 'cobalt-perfume',
    prompt:
      'A sculptural cobalt-blue perfume bottle on a dark volcanic stone pedestal, a thin arc of water frozen behind it, premium editorial product photography.',
    image: '/imgs/features/text-to-image/cobalt-perfume.webp',
  },
  {
    id: 'floating-library',
    prompt:
      'A vast floating island library above sunlit clouds, stone stairways, arched book halls, hanging gardens, and a tiny explorer crossing a bridge, cinematic fantasy illustration.',
    image: '/imgs/features/text-to-image/floating-library.webp',
  },
  {
    id: 'geometric-fashion',
    prompt:
      'Editorial fashion portrait of a poised woman in a sculptural ivory coat, cobalt-blue arches and a burnt-orange circle, soft studio light, high-end photography.',
    image: '/imgs/features/text-to-image/geometric-fashion.webp',
  },
];

export const TEXT_TO_IMAGE_FEATURES: FeatureCardCopy[] = [
  { id: 'from-text' },
  { id: 'explore' },
  { id: 'marketing' },
  { id: 'direction' },
  { id: 'variations' },
  { id: 'format' },
];

export const TEXT_TO_IMAGE_SPOTLIGHTS: SpotlightItem[] = [
  {
    id: 'models',
    image: '/imgs/home/models-v2.webp',
  },
  {
    id: 'text',
    image: '/imgs/examples/showcase/dense-infographic.webp',
    reverse: true,
  },
  {
    id: 'frame',
    images: [
      '/imgs/examples/showcase/aperture-comparison.webp',
      '/imgs/examples/hero/product-still-life.webp',
      '/imgs/examples/showcase/sale-poster.webp',
    ],
    collage: 'grid',
  },
];

export const TEXT_TO_IMAGE_FAQS: FeatureFaqItem[] = [
  { id: 1 },
  { id: 2 },
  { id: 3 },
  { id: 4 },
  { id: 5 },
  { id: 6 },
];

export const IMAGE_TO_IMAGE_STEPS: FeatureStep[] = [
  { step: 1 },
  { step: 2 },
  { step: 3 },
];

/** /image-to-image 页 Hero 快捷开始（区别于首页 EDIT_EXAMPLES） */
export const IMAGE_TO_IMAGE_QUICKSTART: FeatureQuickStartItem[] = [
  {
    id: 'interior-redesign',
    prompt:
      'Furnish this empty room with a low rust-colored sofa, a sculptural walnut coffee table, two cream lounge chairs, an indoor olive tree, and one abstract artwork. Preserve the architecture, window, fireplace, rug, floor, camera angle, and morning light.',
    image: '/imgs/features/image-to-image/interior-redesign-after.webp',
    sourceImage: '/imgs/features/image-to-image/interior-redesign-before.webp',
  },
  {
    id: 'summer-to-winter',
    prompt:
      'Transform this lakeside cabin from late summer to a snowy winter evening. Add fresh snow, a partly frozen lake, blue-hour light, and a warm glow inside while preserving the cabin, trees, shoreline, and camera angle.',
    image: '/imgs/features/image-to-image/summer-to-winter-after.webp',
    sourceImage: '/imgs/features/image-to-image/summer-to-winter-before.webp',
  },
  {
    id: 'sketch-to-product',
    prompt:
      'Turn this desk lamp sketch into a photorealistic product made from matte cobalt-blue anodized aluminum with a warm LED ring. Preserve the exact silhouette, proportions, base, head shape, and viewing angle.',
    image: '/imgs/features/image-to-image/sketch-to-render-after.webp',
    sourceImage: '/imgs/features/image-to-image/sketch-to-render-before.webp',
  },
  {
    id: 'outfit-change',
    prompt:
      "Replace only the beige linen blouse with a deep emerald-green tailored blazer over an ivory silk top. Preserve the person's identity, face, hair, expression, pose, framing, background, and lighting.",
    image: '/imgs/features/image-to-image/outfit-change-after.webp',
    sourceImage: '/imgs/features/image-to-image/outfit-change-before.webp',
  },
];

export const IMAGE_TO_IMAGE_FEATURES: FeatureCardCopy[] = [
  { id: 'restyle' },
  { id: 'setting' },
  { id: 'mood' },
  { id: 'objects' },
  { id: 'subject' },
  { id: 'combine' },
];

export const IMAGE_TO_IMAGE_SPOTLIGHTS: SpotlightItem[] = [
  {
    id: 'direction',
    image: '/imgs/examples/edit/portrait-illustration-after.webp',
  },
  {
    id: 'detail',
    images: [
      '/imgs/examples/edit/product-color-before.webp',
      '/imgs/examples/edit/product-color-after.webp',
    ],
    collage: 'split',
    reverse: true,
  },
  {
    id: 'refs',
    images: [
      '/imgs/examples/edit/day-to-night-before.webp',
      '/imgs/examples/edit/object-removal-before.webp',
      '/imgs/examples/edit/portrait-illustration-before.webp',
    ],
    collage: 'triple',
  },
];

export const IMAGE_TO_IMAGE_FAQS: FeatureFaqItem[] = [
  { id: 1 },
  { id: 2 },
  { id: 3 },
  { id: 4 },
  { id: 5 },
  { id: 6 },
];
