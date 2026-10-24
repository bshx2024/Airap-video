/**
 * Image styles catalog (structural data only).
 * Display copy lives in messages under landing.styles.*.
 *
 * `ratio` must be a generator-supported aspect ratio
 * (see GENERATOR_ASPECT_RATIOS, excluding `auto`).
 */

import { GENERATOR_ASPECT_RATIOS } from '@/config/landing-data';

export type StyleAspectRatio = Exclude<
  (typeof GENERATOR_ASPECT_RATIOS)[number],
  'auto'
>;

export type StyleTypeKey =
  | 'watercolor'
  | 'cinematic'
  | 'gouache'
  | 'stop_motion'
  | 'isometric'
  | 'macro'
  | 'collectible'
  | 'minimal_product'
  | 'geometric'
  | 'surreal'
  | 'packaging'
  | 'poster';

export type StyleItem = {
  slug: string;
  image: string;
  width: number;
  height: number;
  ratio: StyleAspectRatio;
  typeKey: StyleTypeKey;
  category: string;
  model: string;
  isNew?: boolean;
  prompt: string;
};

export type StyleFilterId = string;

export const STYLE_CATEGORY_IDS: StyleFilterId[] = [
  'all',
  'illustration',
  'photography',
  'portrait',
  'three_d',
  'graphic',
  'branding',
];

export const STYLES_DATA: StyleItem[] = [
  {
    slug: 'soft-storybook-watercolor',
    image: '/imgs/examples/hero/storybook-scene.webp',
    width: 600,
    height: 600,
    ratio: '1:1',
    typeKey: 'watercolor',
    category: 'illustration',
    model: 'flux-2',
    isNew: true,
    prompt:
      'A quiet countryside cottage scene in a soft hand-painted watercolour storybook style, translucent washes, visible paper grain, loose botanical edges, pale sage and warm cream palette, gentle diffused morning light.',
  },
  {
    slug: 'cinematic-blue-hour',
    image: '/imgs/models/samples/flux-schnell-city-courier.webp',
    width: 1200,
    height: 800,
    ratio: '3:2',
    typeKey: 'cinematic',
    category: 'photography',
    model: 'flux-2',
    isNew: true,
    prompt:
      'A bicycle courier crossing a rain-slick city intersection at blue hour, cinematic editorial photography, controlled motion blur, warm storefront reflections, cool cobalt shadows, realistic fabric and street texture, widescreen composition.',
  },
  {
    slug: 'editorial-gouache-portrait',
    image: '/imgs/examples/edit/portrait-illustration-after.webp',
    width: 1254,
    height: 1254,
    ratio: '1:1',
    typeKey: 'gouache',
    category: 'portrait',
    model: 'nano-banana-pro',
    isNew: true,
    prompt:
      'A sophisticated hand-painted gouache editorial portrait, simplified confident shapes, matte pigment texture, warm terracotta and parchment palette, clean facial detail, subtle paper grain and a composed magazine-illustration finish.',
  },
  {
    slug: 'tactile-stop-motion',
    image: '/imgs/models/samples/flux-schnell-robot-workshop.webp',
    width: 800,
    height: 1200,
    ratio: '2:3',
    typeKey: 'stop_motion',
    category: 'three_d',
    model: 'flux-2',
    prompt:
      'A whimsical tabletop workshop in tactile stop-motion craft style, palm-sized glazed ceramic characters, oversized hand-cut paper flowers, visible paper fibres, tiny practical props and soft warm studio light.',
  },
  {
    slug: 'pastel-isometric',
    image: '/imgs/examples/showcase/flat-illustration.webp',
    width: 600,
    height: 600,
    ratio: '1:1',
    typeKey: 'isometric',
    category: 'illustration',
    model: 'gpt-image-2',
    prompt:
      'A clean isometric illustration with simplified geometric forms, soft pastel colours, precise edges, subtle ambient shadows, friendly editorial proportions, generous white space and no visual clutter.',
  },
  {
    slug: 'dramatic-macro-product',
    image: '/imgs/examples/showcase/macro-detail.webp',
    width: 600,
    height: 600,
    ratio: '1:1',
    typeKey: 'macro',
    category: 'photography',
    model: 'nano-banana-pro',
    prompt:
      'Dramatic macro product photography, extreme close-up, brushed metal and fine engraving rendered with crisp micro-texture, controlled specular highlights, deep charcoal background and narrow sculpted studio light.',
  },
  {
    slug: 'collectible-vinyl-character',
    image: '/imgs/examples/hero/collectible-figurine.webp',
    width: 600,
    height: 600,
    ratio: '1:1',
    typeKey: 'collectible',
    category: 'three_d',
    model: 'flux-2',
    prompt:
      'A charming collectible vinyl character with slightly oversized proportions, clean sculpted forms, soft-touch painted surfaces, subtle seam detail, neutral studio backdrop and polished designer-toy product lighting.',
  },
  {
    slug: 'minimal-product-still-life',
    image: '/imgs/examples/hero/product-still-life.webp',
    width: 600,
    height: 600,
    ratio: '1:1',
    typeKey: 'minimal_product',
    category: 'photography',
    model: 'flux-2',
    prompt:
      'Minimal product still-life photography on pale natural stone, one carefully placed object, soft morning side light, restrained warm neutrals, delicate contact shadow and generous negative space.',
  },
  {
    slug: 'geometric-fashion-editorial',
    image: '/imgs/features/text-to-image/geometric-fashion.webp',
    width: 900,
    height: 900,
    ratio: '1:1',
    typeKey: 'geometric',
    category: 'graphic',
    model: 'nano-banana-pro',
    prompt:
      'A high-fashion editorial portrait built from bold geometric colour fields, sharp architectural styling, saturated cobalt and coral accents, crisp studio light and a precise contemporary magazine composition.',
  },
  {
    slug: 'surreal-floating-library',
    image: '/imgs/features/text-to-image/floating-library.webp',
    width: 900,
    height: 900,
    ratio: '1:1',
    typeKey: 'surreal',
    category: 'graphic',
    model: 'nano-banana-pro',
    prompt:
      'A dreamlike floating library suspended above soft clouds, impossible staircases, warm reading lamps, weightless books and quiet atmospheric depth, refined surreal editorial art with believable light.',
  },
  {
    slug: 'botanical-luxury-packaging',
    image: '/imgs/models/samples/nano-banana-pro-tea-packaging.webp',
    width: 1200,
    height: 800,
    ratio: '3:2',
    typeKey: 'packaging',
    category: 'branding',
    model: 'nano-banana-pro',
    prompt:
      'Luxury botanical packaging photography, cream uncoated paper, precise forest-green line engraving, small brass details, dark walnut surface, graceful natural shadow and premium restrained brand direction.',
  },
  {
    slug: 'illustrated-event-poster',
    image: '/imgs/models/samples/nano-banana-pro-night-market.webp',
    width: 800,
    height: 1200,
    ratio: '2:3',
    typeKey: 'poster',
    category: 'graphic',
    model: 'nano-banana-pro',
    prompt:
      'A richly illustrated event-poster style with deep indigo shadows, warm vermilion accents, dense but coherent scene detail, dramatic headline space and vintage travel-poster atmosphere.',
  },
];

export function getStyleBySlug(slug: string): StyleItem | undefined {
  return STYLES_DATA.find((item) => item.slug === slug);
}

export function getRelatedStyles(currentSlug: string, limit = 4): StyleItem[] {
  const current = getStyleBySlug(currentSlug);
  if (!current) return [];

  const others = STYLES_DATA.filter((item) => item.slug !== currentSlug);
  return [
    ...others.filter((item) => item.category === current.category),
    ...others.filter((item) => item.category !== current.category),
  ].slice(0, limit);
}
